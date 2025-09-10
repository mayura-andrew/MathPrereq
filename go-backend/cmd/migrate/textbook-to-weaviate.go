package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/data/weaviate"
)

func runTextbookToWeaviateMigration() error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	client, err := weaviate.NewClient(cfg.Weaviate)
	if err != nil {
		return fmt.Errorf("failed to create Weaviate client: %w", err)
	}

	ctx := context.Background()

	// Check if data already exists
	stats, err := client.GetStats(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing data: %w", err)
	}

	if totalChunks, ok := stats["total_chunks"].(int64); ok && totalChunks > 0 {
		fmt.Printf("⚠️  Found %d existing chunks. Cleaning and reloading...\n", totalChunks)
		if err := client.DeleteAll(ctx); err != nil {
			return fmt.Errorf("failed to clear existing data: %w", err)
		}
	}

	// Load textbook content
	content, err := loadTextbookContent("data/raw/calculus_textbook.txt")
	if err != nil {
		return fmt.Errorf("failed to load textbook content: %w", err)
	}

	// Add content to Weaviate
	if err := client.AddContent(ctx, content); err != nil {
		return fmt.Errorf("failed to add content to Weaviate: %w", err)
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

	// Create proper Source struct
	textbookSource := weaviate.Source{
		Document: "calculus_textbook",
		Title:    "Calculus Textbook",
		Author:   "Mathematics Department",
		URL:      "",
		Page:     1,
	}

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
				Source:     textbookSource, // Use Source struct
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
