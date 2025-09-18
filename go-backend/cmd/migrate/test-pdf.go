package main

// import (
// 	"fmt"
// 	"log"
// 	"os"
// 	"regexp"
// 	"strings"

// 	"github.com/ledongthuc/pdf"
// )

// func main() {
// 	if len(os.Args) < 2 {
// 		fmt.Println("Usage: go run test_pdf.go <pdf_file>")
// 		os.Exit(1)
// 	}

// 	pdfFile := os.Args[1]

// 	// Test the extractTextFromPDF function
// 	text, err := extractTextFromPDF(pdfFile)
// 	if err != nil {
// 		log.Fatalf("Failed to extract text: %v", err)
// 	}

// 	fmt.Printf("✅ Successfully extracted %d characters from %s\n", len(text), pdfFile)
// 	fmt.Printf("📄 First 500 characters:\n%s\n", text[:min(500, len(text))])
// }

// func min(a, b int) int {
// 	if a < b {
// 		return a
// 	}
// 	return b
// }

// func extractTextFromPDF(filePath string) (string, error) {
// 	// Use pdf.Open() with file path - it returns reader, file, error
// 	reader, file, err := pdf.Open(filePath)
// 	if err != nil {
// 		return "", fmt.Errorf("failed to create PDF reader: %w", err)
// 	}
// 	defer file.Close()
// 	defer reader.Close()

// 	var textBuilder strings.Builder
// 	totalPages := reader.NumPage()

// 	log.Printf("Processing PDF with %d pages", totalPages)

// 	for pageNum := 1; pageNum <= totalPages; pageNum++ {
// 		page := reader.Page(pageNum)
// 		if page.V.IsNull() {
// 			log.Printf("Skipping empty page %d", pageNum)
// 			continue
// 		}

// 		// Extract plain text
// 		pageText, err := page.GetPlainText()
// 		if err != nil {
// 			log.Printf("Warning: Failed to extract text from page %d: %v", pageNum, err)
// 			continue
// 		}

// 		// Clean and normalize the text
// 		cleanText := cleanPDFText(pageText)
// 		if strings.TrimSpace(cleanText) != "" {
// 			textBuilder.WriteString(fmt.Sprintf("\n--- Page %d ---\n", pageNum))
// 			textBuilder.WriteString(cleanText)
// 			textBuilder.WriteString("\n")
// 		}
// 	}

// 	extractedText := textBuilder.String()
// 	log.Printf("Successfully extracted %d characters from %d pages", len(extractedText), totalPages)

// 	return extractedText, nil
// }

// func cleanPDFText(text string) string {
// 	// Remove excessive whitespace
// 	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")

// 	// Remove common PDF artifacts
// 	text = regexp.MustCompile(`\f`).ReplaceAllString(text, "\n") // Form feed
// 	text = regexp.MustCompile(`\r`).ReplaceAllString(text, "")   // Carriage return

// 	// Remove page numbers and headers/footers (simple heuristic)
// 	lines := strings.Split(text, "\n")
// 	var cleanLines []string

// 	for _, line := range lines {
// 		line = strings.TrimSpace(line)

// 		// Skip very short lines that are likely page numbers or artifacts
// 		if len(line) < 10 {
// 			continue
// 		}

// 		// Skip lines that are just numbers (page numbers)
// 		if regexp.MustCompile(`^\d+$`).MatchString(line) {
// 			continue
// 		}

// 		cleanLines = append(cleanLines, line)
// 	}

// 	return strings.Join(cleanLines, "\n")
// }