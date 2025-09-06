package main

import (
    "fmt"
    "log"
)

func main() {
    migrations := []struct {
        name string
        fn   func() error
    }{
        {"Neo4j (CSV)", runCsvToNeo4jMigration},
        {"Weaviate (Textbook)", runTextbookToWeaviateMigration},
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