package neo4j

import (
	"context"
	"fmt"
	"time"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/pkg/logger"
	"github.com/neo4j/neo4j-go-driver/v6/neo4j"
	neo4jConfig "github.com/neo4j/neo4j-go-driver/v6/neo4j/config"
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

	// Configure driver with proper timeouts and connection pooling
	driver, err := neo4j.NewDriverWithContext(
		cfg.URI,
		neo4j.BasicAuth(cfg.Username, cfg.Password, ""),
		func(c *neo4jConfig.Config) {
			// Connection pool settings
			c.MaxConnectionPoolSize = 50
			c.MaxConnectionLifetime = 1 * time.Hour
			c.ConnectionAcquisitionTimeout = 5 * time.Second

			// Socket connect timeout
			c.SocketConnectTimeout = 5 * time.Second
			c.SocketKeepalive = true
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Neo4j driver: %w", err)
	}

	// Verify connectivity with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := driver.VerifyConnectivity(ctx); err != nil {
		driver.Close(ctx)
		return nil, fmt.Errorf("failed to verify Neo4j connectivity: %w", err)
	}

	logger.Info("Connected to Neo4j",
		zap.String("uri", cfg.URI),
		zap.Int("max_pool_size", 50),
		zap.Duration("connection_timeout", 5*time.Second))

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
			idStr := toString(id)
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
				ID:          toString(id),
				Name:        toString(name),
				Description: toString(description),
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

func (c *Client) FindPrerequisitePath(ctx context.Context, targetConcepts []string) ([]Concept, error) {
	if len(targetConcepts) == 0 {
		return []Concept{}, nil
	}

	// Add timeout protection for Neo4j operations
	queryStart := time.Now()
	defer func() {
		c.logger.Debug("FindPrerequisitePath completed",
			zap.Duration("total_duration", time.Since(queryStart)),
			zap.Int("concept_count", len(targetConcepts)))
	}()

	// Create session with context timeout protection
	sessionCtx, sessionCancel := context.WithTimeout(ctx, 8*time.Second)
	defer sessionCancel()

	session := c.driver.NewSession(sessionCtx, neo4j.SessionConfig{
		AccessMode: neo4j.AccessModeRead,
	})
	defer session.Close(sessionCtx)

	// OPTIMIZED: Batch lookup all concept IDs in a single query instead of sequential lookups
	lookupStart := time.Now()
	targetIDs, err := c.findConceptIDsBatch(sessionCtx, session, targetConcepts)
	lookupDuration := time.Since(lookupStart)

	if err != nil {
		c.logger.Error("Failed to find concept IDs in batch",
			zap.Strings("concepts", targetConcepts),
			zap.Duration("duration", lookupDuration),
			zap.Error(err))
		return nil, fmt.Errorf("failed to find concept IDs: %w", err)
	}

	if len(targetIDs) == 0 {
		c.logger.Warn("No target concepts found in knowledge graph",
			zap.Strings("attempted_concepts", targetConcepts),
			zap.Duration("lookup_duration", lookupDuration))
		return []Concept{}, nil
	}

	c.logger.Debug("Found concept IDs",
		zap.Int("requested", len(targetConcepts)),
		zap.Int("found", len(targetIDs)),
		zap.Duration("lookup_duration", lookupDuration))

	// Optimized query with depth limit and better structure
	// Limits path length to 1-5 hops to prevent expensive full graph traversal
	query := `
		CALL {
			MATCH (target:Concept)
			WHERE target.id IN $targetIDs
			RETURN target
		}
		CALL {
			WITH target
			MATCH path = (prerequisite:Concept)-[:PREREQUISITE_FOR*1..5]->(target)
			RETURN DISTINCT prerequisite
			LIMIT 100
		}
		WITH COLLECT(DISTINCT prerequisite) as prerequisites, COLLECT(DISTINCT target) as targets
		UNWIND (prerequisites + targets) as concept
		RETURN DISTINCT concept.id as id, 
		       concept.name as name, 
		       concept.description as description,
		       CASE WHEN concept.id IN $targetIDs THEN 'target' ELSE 'prerequisite' END as type
		ORDER BY type, concept.name
	`

	pathStart := time.Now()
	result, err := session.ExecuteRead(sessionCtx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(sessionCtx, query, map[string]interface{}{
			"targetIDs": targetIDs,
		})
		if err != nil {
			return nil, err
		}

		var concepts []Concept
		for records.Next(sessionCtx) {
			record := records.Record()

			id, _ := record.Get("id")
			name, _ := record.Get("name")
			description, _ := record.Get("description")
			conceptType, _ := record.Get("type")

			concept := Concept{
				ID:          toString(id),
				Name:        toString(name),
				Description: toString(description),
				Type:        toString(conceptType),
			}
			concepts = append(concepts, concept)
		}
		return concepts, nil
	})

	if err != nil {
		c.logger.Error("Failed to find prerequisite path",
			zap.Duration("path_query_duration", time.Since(pathStart)),
			zap.Error(err))
		return nil, fmt.Errorf("failed to find prerequisite path: %w", err)
	}
	concepts := result.([]Concept)
	c.logger.Info("Found learning path",
		zap.Int("concepts", len(concepts)),
		zap.Duration("path_query_duration", time.Since(pathStart)))

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
			ID:          toString(id),
			Name:        toString(name),
			Description: toString(description),
			Type:        "target",
		}

		var prerequisites []Concept
		if prereqsList, ok := prereqsRaw.([]interface{}); ok {
			for _, prereqRaw := range prereqsList {
				if prereqMap, ok := prereqRaw.(map[string]interface{}); ok {
					if prereqMap["id"] != nil {
						prerequisites = append(prerequisites, Concept{
							ID:          toString(prereqMap["id"]),
							Name:        toString(prereqMap["name"]),
							Description: toString(prereqMap["description"]),
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
							ID:          toString(nextMap["id"]),
							Name:        toString(nextMap["name"]),
							Description: toString(nextMap["description"]),
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
				"total_concepts": conceptCount,
				"total_chunks":   int64(0), // Placeholder for consistency
				"total_edges":    relationshipCount,
				"status":         "healthy",
			}, nil
		}

		return map[string]interface{}{
			"total_concepts": int64(0),
			"total_chunks":   int64(0),
			"total_edges":    int64(0),
			"status":         "healthy",
		}, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	return result.(map[string]interface{}), nil
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

func (c *Client) Close() error {
	return c.driver.Close(context.Background())
}

func (c *Client) ExecuteQuery(ctx context.Context, query string, params map[string]interface{}) ([]map[string]interface{}, error) {
	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	result, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}

		var results []map[string]interface{}
		for records.Next(ctx) {
			record := records.Record()
			recordMap := make(map[string]interface{})

			for _, key := range record.Keys {
				value, ok := record.Get(key)
				if ok {
					recordMap[key] = value
				}
			}

			results = append(results, recordMap)
		}

		if err := records.Err(); err != nil {
			return nil, err
		}

		return results, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	return result.([]map[string]interface{}), nil
}

// findConceptIDsBatch performs a batch lookup of concept IDs for multiple concept names
// This is much more efficient than sequential FindConceptID calls
func (c *Client) findConceptIDsBatch(ctx context.Context, session neo4j.SessionWithContext, conceptNames []string) ([]string, error) {
	query := `
		UNWIND $conceptNames AS conceptName
		MATCH (c:Concept)
		WHERE toLower(c.name) CONTAINS toLower(conceptName) 
		   OR toLower(c.id) = toLower(conceptName)
		RETURN DISTINCT c.id as id, c.name as name
	`

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(ctx, query, map[string]interface{}{
			"conceptNames": conceptNames,
		})
		if err != nil {
			return nil, err
		}

		var ids []string
		matchedConcepts := make(map[string]string) // id -> name mapping for logging

		for records.Next(ctx) {
			record := records.Record()
			if idValue, ok := record.Get("id"); ok && idValue != nil {
				id := toString(idValue)
				ids = append(ids, id)

				if nameValue, ok := record.Get("name"); ok && nameValue != nil {
					matchedConcepts[id] = toString(nameValue)
				}
			}
		}

		if err := records.Err(); err != nil {
			return nil, err
		}

		// Log matched concepts for debugging
		c.logger.Debug("Batch concept lookup results",
			zap.Int("requested", len(conceptNames)),
			zap.Int("matched", len(ids)),
			zap.Any("matches", matchedConcepts))

		return ids, nil
	})

	if err != nil {
		return nil, err
	}

	return result.([]string), nil
}

func toString(value interface{}) string {
	if value == nil {
		return ""
	}
	if str, ok := value.(string); ok {
		return str
	}
	return fmt.Sprintf("%v", value)
}
