package main

import (
	"fmt"
	"log"
	"os"

	"github.com/mathprereq/pkg/logger"
)

func main() {
	// Initialize logger
	logger.Initialize()
	_ = logger.MustGetLogger()

	// Check if data directories exist
	if err := validateDataDirectories(); err != nil {
		log.Fatalf("❌ Data validation failed: %v", err)
	}

	migrations := []struct {
		name string
		fn   func() error
	}{
		{"Neo4j (CSV)", runCsvToNeo4jMigration},
		{"Weaviate (Textbook)", runPDFToWeaviateMigration},
	}

	fmt.Println("🚀 Starting data migration...")
	fmt.Println("========================================")

	for _, migration := range migrations {
		fmt.Printf("\n📊 Running %s migration...\n", migration.name)

		if err := migration.fn(); err != nil {
			log.Fatalf("❌ %s migration failed: %v", migration.name, err)
		}

		fmt.Printf("✅ %s migration completed\n", migration.name)
	}

	fmt.Println("\n========================================")
	fmt.Println("🎉 All migrations completed successfully!")
}

func validateDataDirectories() error {
	requiredFiles := []string{
		"data/raw/nodes.csv",
		"data/raw/edges.csv",
		"data/raw/calculus_textbook.txt",
	}

	fmt.Println("🔍 Validating data files...")

	for _, file := range requiredFiles {
		if _, err := os.Stat(file); os.IsNotExist(err) {
			return fmt.Errorf("required file not found: %s", file)
		}
		fmt.Printf("  ✓ Found: %s\n", file)
	}

	return nil
}
