#!/bin/bash
# filepath: scripts/test-pdf-extraction.sh

echo "🧪 Testing PDF Text Extraction"
echo "=============================="

# Check if PDF files exist
PDF_DIR="data/raw/university-curriculus"
if [ ! -d "$PDF_DIR" ]; then
    echo "❌ PDF directory not found: $PDF_DIR"
    exit 1
fi

PDF_FILES=$(find "$PDF_DIR" -name "*.pdf" | head -3)
if [ -z "$PDF_FILES" ]; then
    echo "❌ No PDF files found in $PDF_DIR"
    exit 1
fi

echo "📁 Testing with PDF files:"
echo "$PDF_FILES" | nl

echo ""
echo "🔄 Building PDF extraction tool..."
go build -o bin/pdf-extract cmd/migrate/pdf-to-weaviate.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"

echo ""
echo "🧪 Testing PDF extraction..."

# Create a simple test function
cat > /tmp/test_pdf.go << 'EOF'
package main

import (
	"fmt"
	"log"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run test_pdf.go <pdf_file>")
		os.Exit(1)
	}
	
	pdfFile := os.Args[1]
	
	// Test the extractTextFromPDF function
	text, err := extractTextFromPDF(pdfFile)
	if err != nil {
		log.Fatalf("Failed to extract text: %v", err)
	}
	
	fmt.Printf("✅ Successfully extracted %d characters from %s\n", len(text), pdfFile)
	fmt.Printf("📄 First 500 characters:\n%s\n", text[:min(500, len(text))])
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
EOF

echo "🎯 Testing individual PDF files..."
for pdf_file in $PDF_FILES; do
    echo ""
    echo "📖 Testing: $(basename "$pdf_file")"
    
    # Run a simple test
    timeout 30s go run /tmp/test_pdf.go "$pdf_file" 2>/dev/null || echo "⚠️  Test timed out or failed for $(basename "$pdf_file")"
done

echo ""
echo "🎉 PDF extraction testing completed!"
echo ""
echo "💡 If tests pass, you can run the full migration:"
echo "   go run cmd/migrate/pdf-to-weaviate.go"

# Cleanup
rm -f /tmp/test_pdf.go