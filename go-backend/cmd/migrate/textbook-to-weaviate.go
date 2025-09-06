package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/data/weaviate"
)

func runTextbookToWeaviateMigration() error {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	client, err := weaviate.NewClient(cfg.Weaviate)
	if err != nil {
		log.Fatal("Failed to create Weaviate client:", err)
	}

	ctx := context.Background()

	// Load textbook content
	content, err := loadTextbookContent("data/raw/calculus_textbook.txt")
	if err != nil {
		log.Fatal("Failed to load textbook content:", err)
	}

	// Add content to Weaviate
	if err := client.AddContent(ctx, content); err != nil {
		log.Fatal("Failed to add content to Weaviate:", err)
	}

	fmt.Printf("✅ Successfully migrated %d chunks to Weaviate\n", len(content))
	return nil
}

func loadTextbookContent(filename string) ([]weaviate.ContentChunk, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var chunks []weaviate.ContentChunk
	scanner := bufio.NewScanner(file)

	var currentChapter string
	var currentConcept string
	chunkIndex := 0

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" {
			continue
		}

		// Detect chapter headers
		if strings.HasPrefix(line, "Chapter:") {
			currentChapter = strings.TrimPrefix(line, "Chapter:")
			currentChapter = strings.TrimSpace(currentChapter)
			continue
		}

		// Detect concept headers (lines ending with colon)
		if strings.HasSuffix(line, ":") && !strings.Contains(line, ".") {
			currentConcept = strings.TrimSuffix(line, ":")
			currentConcept = strings.TrimSpace(currentConcept)
			continue
		}

		// Create chunk for content lines
		if len(line) > 50 { // Only meaningful content
			chunk := weaviate.ContentChunk{
				ID:         uuid.New().String(),
				Content:    line,
				Concept:    currentConcept,
				Chapter:    currentChapter,
				Source:     "calculus_textbook",
				ChunkIndex: chunkIndex,
			}
			chunks = append(chunks, chunk)
			chunkIndex++
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return chunks, nil
}
