package neo4j

import (
	"context"
	"fmt"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/pkg/logger"
	"github.com/neo4j/neo4j-go-driver/v6/neo4j"
	"go.uber.org/zap"
)

type Client struct {
	driver neo4j.Driver
	logger *zap.Logger
}

type Concept struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

type PrerequisitePathResult struct {
	Concepts []Concept `json:"concepts"`
}

type ConceptDetailResult struct {
	Concept             Concept   `json:"concept"`
	Prerequisites       []Concept `json:"prerequisites"`
	LeadsTo             []Concept `json:"leads_to"`
	DetailedExplanation string    `json:"detailed_explanation"`
}

func NewClient(cfg config.Neo4jConfig) (*Client, error) {
	logger := logger.MustGetLogger()

	driver, err := neo4j.NewDriver(
		cfg.URI,
		neo4j.BasicAuth(cfg.Username, cfg.Password, ""),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Neo4j driver: %w", err)
	}

	// verify connectivity
	ctx := context.Background()
	if err := driver.VerifyConnectivity(ctx); err != nil {
		return nil, fmt.Errorf("failed to verify Neo4j connectivity: %w", err)
	}

	logger.Info("Connected to Neo4j", zap.String("uri", cfg.URI))

	return &Client{
		driver: driver,
		logger: logger,
	}, nil
}

func (c *Client) FindConceptID(ctx context.Context, conceptName string) (*string, error) {
	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (c:Concept)
		WHERE toLower(c.name) CONTAINS toLower($conceptName) 
		   OR toLower(c.id) = toLower($conceptName)
		RETURN c.id as id
		LIMIT 1
	`
	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		record, err := tx.Run(ctx, query, map[string]interface{}{
			"conceptName": conceptName,
		})
		if err != nil {
			return nil, err
		}

		if record.Next(ctx) {
			id, _ := record.Record().Get("id")
			idStr := id.(string)
			return &idStr, nil
		}

		return nil, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to find concept ID: %w", err)
	}

	if result == nil {
		return nil, nil
	}

	return result.(*string), nil
}

// func (c *Client) FindConceptID(ctx context.Context, conceptName string) (*string, error) {
// 	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
// 	defer session.Close(ctx)

// 	query := `
// 		MATCH (c:Concept)
// 		WHERE toLower(c.name) CONTAINS toLower($conceptName)
// 		   OR toLower(c.id) = toLower($conceptName)
// 		RETURN c.id as id
// 		LIMIT 1
// 	`
// 	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
// 		record, err := tx.Run(ctx, query, map[string]interface{}{
// 			"conceptName": conceptName,
// 		})
// 		if err != nil {
// 			return nil, err
// 		}

// 		if record.Next(ctx) {
// 			id, _ := record.Record().Get("id")
// 			idStr := id.(string)
// 			return &idStr, nil
// 		}

// 		return nil, nil
// 	})

// 	if err != nil {
// 		return nil, fmt.Errorf("failed to find concept ID: %w", err)
// 	}

// 	if result == nil {
// 		return nil, nil
// 	}

// 	return result.(*string), nil
// }

func (c *Client) FindPrerequisitePath(ctx context.Context, targetConcepts []string) ([]Concept, error) {
	if len(targetConcepts) == 0 {
		return []Concept{}, nil
	}

	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	var targetIDs []string
	for _, concept := range targetConcepts {
		id, err := c.FindConceptID(ctx, concept)
		if err != nil {
			c.logger.Warn("Failed to find concept", zap.String("concept", concept), zap.Error(err))
			continue
		}
		if id != nil {
			targetIDs = append(targetIDs, *id)
		}
	}

	if len(targetIDs) == 0 {
		c.logger.Warn("No target concepts found in knowledge graph")
		return []Concept{}, nil
	}

	query := `
		MATCH path = (prerequisite:Concept)-[:PREREQUISITE_FOR*]->(target:Concept)
		WHERE target.id IN $targetIDs
		WITH prerequisite, target, length(path) as pathLength
		ORDER BY pathLength
		WITH COLLECT(DISTINCT prerequisite) as prerequisites, COLLECT(DISTINCT target) as targets
		UNWIND (prerequisites + targets) as concept
		RETURN DISTINCT concept.id as id, concept.name as name, 
		       concept.description as description,
		       CASE WHEN concept.id IN $targetIDs THEN 'target' ELSE 'prerequisite' END as type
		ORDER BY 
		  CASE WHEN concept.id IN $targetIDs THEN 1 ELSE 0 END,
		  concept.name
	`
	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(ctx, query, map[string]interface{}{
			"targetIDs": targetIDs,
		})
		if err != nil {
			return nil, err
		}

		var concepts []Concept
		for records.Next(ctx) {
			record := records.Record()

			id, _ := record.Get("id")
			name, _ := record.Get("name")
			description, _ := record.Get("description")
			conceptType, _ := record.Get("type")

			concept := Concept{
				ID:          id.(string),
				Name:        name.(string),
				Description: description.(string),
				Type:        conceptType.(string),
			}
			concepts = append(concepts, concept)
		}
		return concepts, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to find prerequisite path: %w", err)
	}
	concepts := result.([]Concept)
	c.logger.Info("Found learning path", zap.Int("concepts", len(concepts)))

	return concepts, nil
}

func (c *Client) GetConceptInfo(ctx context.Context, conceptID string) (*ConceptDetailResult, error) {
	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// Modified query to handle both ID and name lookups
	query := `
		MATCH (c:Concept)
		WHERE c.id = $conceptId OR c.name = $conceptId
		OPTIONAL MATCH (prereq:Concept)-[:PREREQUISITE_FOR]->(c)
		OPTIONAL MATCH (c)-[:PREREQUISITE_FOR]->(next:Concept)
		RETURN c.id as id, c.name as name, c.description as description,
		       COLLECT(DISTINCT {id: prereq.id, name: prereq.name, description: prereq.description}) as prerequisites,
		       COLLECT(DISTINCT {id: next.id, name: next.name, description: next.description}) as leads_to
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		record, err := tx.Run(ctx, query, map[string]interface{}{
			"conceptId": conceptID,
		})
		if err != nil {
			return nil, err
		}

		if !record.Next(ctx) {
			// Log what we were looking for and suggest alternatives
			c.logger.Warn("Concept not found",
				zap.String("search_term", conceptID),
				zap.String("suggestion", "Try searching by concept ID (e.g., 'func_basics') or exact name"))
			return nil, fmt.Errorf("concept not found: %s", conceptID)
		}

		rec := record.Record()

		id, _ := rec.Get("id")
		name, _ := rec.Get("name")
		description, _ := rec.Get("description")
		prereqsRaw, _ := rec.Get("prerequisites")
		leadsToRaw, _ := rec.Get("leads_to")

		concept := Concept{
			ID:          id.(string),
			Name:        name.(string),
			Description: description.(string),
			Type:        "target",
		}

		var prerequisites []Concept
		if prereqsList, ok := prereqsRaw.([]interface{}); ok {
			for _, prereqRaw := range prereqsList {
				if prereqMap, ok := prereqRaw.(map[string]interface{}); ok {
					if prereqMap["id"] != nil {
						prerequisites = append(prerequisites, Concept{
							ID:          prereqMap["id"].(string),
							Name:        prereqMap["name"].(string),
							Description: prereqMap["description"].(string),
							Type:        "prerequisite",
						})
					}
				}
			}
		}

		var leadsTo []Concept
		if leadsToList, ok := leadsToRaw.([]interface{}); ok {
			for _, nextRaw := range leadsToList {
				if nextMap, ok := nextRaw.(map[string]interface{}); ok {
					if nextMap["id"] != nil {
						leadsTo = append(leadsTo, Concept{
							ID:          nextMap["id"].(string),
							Name:        nextMap["name"].(string),
							Description: nextMap["description"].(string),
							Type:        "next_concept",
						})
					}
				}
			}
		}

		return &ConceptDetailResult{
			Concept:       concept,
			Prerequisites: prerequisites,
			LeadsTo:       leadsTo,
		}, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get concept info: %w", err)
	}

	return result.(*ConceptDetailResult), nil
}

func (c *Client) GetAllConcepts(ctx context.Context) ([]Concept, error) {
	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (c:Concept)
		RETURN c.id as id, c.name as name, c.description as description
		ORDER BY c.name
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}

		var concepts []Concept
		for records.Next(ctx) {
			record := records.Record()

			id, _ := record.Get("id")
			name, _ := record.Get("name")
			description, _ := record.Get("description")

			concept := Concept{
				ID:          id.(string),
				Name:        name.(string),
				Description: description.(string),
				Type:        "concept",
			}
			concepts = append(concepts, concept)
		}

		return concepts, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get all concepts: %w", err)
	}

	return result.([]Concept), nil
}

func (c *Client) IsHealthy(ctx context.Context) bool {
	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	_, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, "RETURN 1", nil)
		if err != nil {
			return nil, err
		}
		return result.Next(ctx), nil
	})

	return err == nil
}

func (c *Client) GetStats(ctx context.Context) (map[string]interface{}, error) {
	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	query := `
		MATCH (c:Concept)
		WITH count(c) as conceptCount
		MATCH ()-[r:PREREQUISITE_FOR]->()
		RETURN conceptCount, count(r) as relationshipCount
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		record, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}

		if record.Next(ctx) {
			rec := record.Record()
			conceptCount, _ := rec.Get("conceptCount")
			relationshipCount, _ := rec.Get("relationshipCount")

			return map[string]interface{}{
				"total_concepts":      conceptCount,
				"total_relationships": relationshipCount,
			}, nil
		}

		return map[string]interface{}{
			"total_concepts":      0,
			"total_relationships": 0,
		}, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	return result.(map[string]interface{}), nil
}

func (c *Client) Close() error {
	return c.driver.Close(context.Background())
}
