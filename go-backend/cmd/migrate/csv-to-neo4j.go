package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"strings"

	"github.com/mathprereq/internal/core/config"
	"github.com/neo4j/neo4j-go-driver/v6/neo4j"
)

func runCsvToNeo4jMigration() error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	driver, err := neo4j.NewDriver(
		cfg.Neo4j.URI,
		neo4j.BasicAuth(cfg.Neo4j.Username, cfg.Neo4j.Password, ""),
	)
	if err != nil {
		return fmt.Errorf("failed to create Neo4j driver: %w", err)
	}
	defer driver.Close(context.Background())

	ctx := context.Background()

	// Check if data already exists
	if exists, err := checkDataExists(ctx, driver); err != nil {
		return fmt.Errorf("failed to check existing data: %w", err)
	} else if exists {
		fmt.Println("⚠️  Data already exists. Cleaning and reloading...")
		if err := clearAllData(ctx, driver); err != nil {
			return fmt.Errorf("failed to clear existing data: %w", err)
		}
	}

	// Load nodes
	if err := loadNodes(ctx, driver, "data/raw/nodes.csv"); err != nil {
		return fmt.Errorf("failed to load nodes: %w", err)
	}

	// Load edges
	if err := loadEdges(ctx, driver, "data/raw/edges.csv"); err != nil {
		return fmt.Errorf("failed to load edges: %w", err)
	}

	fmt.Println("✅ Successfully migrated CSV data to Neo4j")
	return nil
}

func checkDataExists(ctx context.Context, driver neo4j.Driver) (bool, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		result, err := tx.Run(ctx, "MATCH (n:Concept) RETURN COUNT(n) as count", nil)
		if err != nil {
			return nil, err
		}

		if result.Next(ctx) {
			count, _ := result.Record().Get("count")
			return count.(int64) > 0, nil
		}
		return false, nil
	})

	if err != nil {
		return false, err
	}

	return result.(bool), nil
}

func clearAllData(ctx context.Context, driver neo4j.Driver) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	// Delete all relationships first, then all nodes
	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// Delete all relationships first
		_, err := tx.Run(ctx, "MATCH ()-[r]-() DELETE r", nil)
		if err != nil {
			return nil, err
		}

		// Then delete all nodes
		_, err = tx.Run(ctx, "MATCH (n) DELETE n", nil)
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to clear data: %w", err)
	}

	fmt.Println("🧹 Cleared existing data")
	return nil
}

func loadNodes(ctx context.Context, driver neo4j.Driver, filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	// Skip header row and process nodes
	for i, record := range records[1:] {
		if len(record) < 3 {
			return fmt.Errorf("invalid record at line %d: expected 3 columns, got %d", i+2, len(record))
		}

		nodeID := strings.TrimSpace(record[0])
		conceptName := strings.TrimSpace(record[1])
		description := strings.TrimSpace(record[2])

		_, err = session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
			query := `
				CREATE (c:Concept {
					id: $id,
					name: $name,
					description: $description,
					created_at: datetime()
				})
			`
			_, err := tx.Run(ctx, query, map[string]interface{}{
				"id":          nodeID,
				"name":        conceptName,
				"description": description,
			})
			return nil, err
		})

		if err != nil {
			return fmt.Errorf("failed to create node %s: %w", nodeID, err)
		}

		fmt.Printf("  📝 Created concept: %s\n", conceptName)
	}

	fmt.Printf("✅ Loaded %d nodes\n", len(records)-1)
	return nil
}

func loadEdges(ctx context.Context, driver neo4j.Driver, filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	// Skip header row and process edges
	for i, record := range records[1:] {
		if len(record) < 3 {
			return fmt.Errorf("invalid record at line %d: expected 3 columns, got %d", i+2, len(record))
		}

		sourceID := strings.TrimSpace(record[0])
		targetID := strings.TrimSpace(record[1])
		relationshipType := strings.TrimSpace(record[2])

		_, err = session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
			query := `
                MATCH (source:Concept {id: $sourceId})
                MATCH (target:Concept {id: $targetId})
                CREATE (source)-[:PREREQUISITE_FOR {
                    type: $relType,
                    created_at: datetime()
                }]->(target)
            `
			result, err := tx.Run(ctx, query, map[string]interface{}{
				"sourceId": sourceID,
				"targetId": targetID,
				"relType":  relationshipType,
			})

			if err != nil {
				return nil, err
			}

			// Check if both nodes were found - handle both return values
			summary, err := result.Consume(ctx) // ✅ Handle both return values
			if err != nil {
				return nil, err
			}

			if summary.Counters().RelationshipsCreated() == 0 {
				return nil, fmt.Errorf("could not find source '%s' or target '%s' concepts", sourceID, targetID)
			}

			return nil, nil
		})

		if err != nil {
			return fmt.Errorf("failed to create relationship %s -> %s: %w", sourceID, targetID, err)
		}

		fmt.Printf("  🔗 Created relationship: %s -> %s\n", sourceID, targetID)
	}

	fmt.Printf("✅ Loaded %d edges\n", len(records)-1)
	return nil
}
