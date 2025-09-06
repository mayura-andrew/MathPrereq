package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"os"

	"github.com/mathprereq/internal/core/config"
	"github.com/neo4j/neo4j-go-driver/v6/neo4j"
)

func runCsvToNeo4jMigration() error {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	driver, err := neo4j.NewDriver(
		cfg.Neo4j.URI,
		neo4j.BasicAuth(cfg.Neo4j.Username, cfg.Neo4j.Password, ""),
	)
	if err != nil {
		log.Fatal("Failed to create Neo4j driver:", err)
	}
	defer driver.Close(context.Background())

	ctx := context.Background()

	// Load nodes
	if err := loadNodes(ctx, driver, "data/raw/nodes.csv"); err != nil {
		log.Fatal("Failed to load nodes:", err)
	}

	// Load edges
	if err := loadEdges(ctx, driver, "data/raw/edges.csv"); err != nil {
		log.Fatal("Failed to load edges:", err)
	}

	fmt.Println("✅ Successfully migrated CSV data to Neo4j")
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

	// Clear existing nodes
	_, err = session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		_, err := tx.Run(ctx, "MATCH (n:Concept) DELETE n", nil)
		return nil, err
	})
	if err != nil {
		return err
	}

	// Skip header row
	for i, record := range records[1:] {
		nodeID := record[0]
		conceptName := record[1]
		description := record[2]

		_, err = session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
			query := `
				CREATE (c:Concept {
					id: $id,
					name: $name,
					description: $description
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
			return fmt.Errorf("failed to create node %d: %w", i, err)
		}
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

	// Skip header row
	for i, record := range records[1:] {
		sourceID := record[0]
		targetID := record[1]
		relationshipType := record[2]

		_, err = session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
			query := `
				MATCH (source:Concept {id: $sourceId})
				MATCH (target:Concept {id: $targetId})
				CREATE (source)-[:PREREQUISITE_FOR {type: $relType}]->(target)
			`
			_, err := tx.Run(ctx, query, map[string]interface{}{
				"sourceId": sourceID,
				"targetId": targetID,
				"relType":  relationshipType,
			})
			return nil, err
		})

		if err != nil {
			return fmt.Errorf("failed to create edge %d: %w", i, err)
		}
	}

	fmt.Printf("✅ Loaded %d edges\n", len(records)-1)
	return nil
}
