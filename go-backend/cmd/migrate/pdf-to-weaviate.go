package main

import (
    "context"
    "fmt"
    "io/ioutil"
    "log"
    "os"
    "path/filepath"
    "regexp"
    "strings"

    "github.com/google/uuid"
    "github.com/ledongthuc/pdf"
    "github.com/mathprereq/internal/core/config"
    "github.com/mathprereq/internal/data/weaviate"
)

type PDFProcessor struct {
    client *weaviate.Client
}

func NewPDFProcessor(client *weaviate.Client) *PDFProcessor {
    return &PDFProcessor{
        client: client,
    }
}

func runPDFToWeaviateMigration() error {
    cfg, err := config.LoadConfig()
    if err != nil {
        return fmt.Errorf("failed to load config: %w", err)
    }

    client, err := weaviate.NewClient(cfg.Weaviate)
    if err != nil {
        return fmt.Errorf("failed to create Weaviate client: %w", err)
    }

    processor := NewPDFProcessor(client)
    ctx := context.Background()

    // Directory containing the PDFs
    pdfDir := "data/raw/university-curriculus"
    
    fmt.Println("🚀 Starting PDF to Weaviate migration...")

    // Get list of PDF files
    pdfFiles, err := getPDFFiles(pdfDir)
    if err != nil {
        return fmt.Errorf("failed to get PDF files: %w", err)
    }

    fmt.Printf("📁 Found %d PDF files to process\n", len(pdfFiles))

    totalChunks := 0
    for i, pdfFile := range pdfFiles {
        fmt.Printf("\n📖 Processing [%d/%d]: %s\n", i+1, len(pdfFiles), filepath.Base(pdfFile))
        
        chunks, err := processor.processPDF(pdfFile)
        if err != nil {
            log.Printf("❌ Failed to process %s: %v", pdfFile, err)
            continue
        }

        if len(chunks) == 0 {
            log.Printf("⚠️  No content extracted from %s", pdfFile)
            continue
        }

        // Add chunks to Weaviate
        fmt.Printf("💾 Adding %d chunks to Weaviate...\n", len(chunks))
        err = processor.client.AddContent(ctx, chunks)
        if err != nil {
            log.Printf("❌ Failed to add chunks from %s: %v", pdfFile, err)
            continue
        }

        totalChunks += len(chunks)
        fmt.Printf("✅ Successfully added %d chunks from %s\n", len(chunks), filepath.Base(pdfFile))
    }

    fmt.Printf("\n🎉 Migration completed! Total chunks added: %d\n", totalChunks)
    return nil
}

func (p *PDFProcessor) processPDF(filePath string) ([]weaviate.ContentChunk, error) {
    // Extract text from PDF
    text, err := extractTextFromPDF(filePath)
    if err != nil {
        return nil, fmt.Errorf("failed to extract text: %w", err)
    }

    if strings.TrimSpace(text) == "" {
        return nil, fmt.Errorf("no text content found in PDF")
    }

    // Parse unit information from filename
    unitInfo := parseUnitFromFilename(filePath)
    
    // Create source information
    source := weaviate.Source{
        Document: filepath.Base(filePath),
        Title:    unitInfo.Title,
        Author:   "University Mathematics Department",
        URL:      "",
        Page:     0, // Will be updated per chunk
    }

    // Split text into meaningful chunks
    chunks := p.createChunksFromText(text, unitInfo, source)
    
    return chunks, nil
}

func extractTextFromPDF(filePath string) (string, error) {
    file, err := os.Open(filePath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    fileInfo, err := file.Stat()
    if err != nil {
        return "", err
    }

    reader, err := pdf.NewReader(file, fileInfo.Size())
    if err != nil {
        return "", err
    }

    var textBuilder strings.Builder
    totalPages := reader.NumPage()

    fonts := reader.Fonts()
    for pageNum := 1; pageNum <= totalPages; pageNum++ {
        page := reader.Page(pageNum)
        if page.V.IsNull() {
            continue
        }

        pageText, err := page.GetPlainText(fonts)
        if err != nil {
            log.Printf("Warning: Failed to extract text from page %d: %v", pageNum, err)
            continue
        }

        // Clean and normalize the text
        cleanText := cleanPDFText(pageText)
        if strings.TrimSpace(cleanText) != "" {
            textBuilder.WriteString(fmt.Sprintf("\n--- Page %d ---\n", pageNum))
            textBuilder.WriteString(cleanText)
            textBuilder.WriteString("\n")
        }
    }

    return textBuilder.String(), nil
}

func cleanPDFText(text string) string {
    // Remove excessive whitespace
    text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
    
    // Remove common PDF artifacts
    text = regexp.MustCompile(`\f`).ReplaceAllString(text, "\n") // Form feed
    text = regexp.MustCompile(`\r`).ReplaceAllString(text, "")   // Carriage return
    
    // Remove page numbers and headers/footers (simple heuristic)
    lines := strings.Split(text, "\n")
    var cleanLines []string
    
    for _, line := range lines {
        line = strings.TrimSpace(line)
        
        // Skip very short lines that are likely page numbers or artifacts
        if len(line) < 10 {
            continue
        }
        
        // Skip lines that are just numbers (page numbers)
        if regexp.MustCompile(`^\d+$`).MatchString(line) {
            continue
        }
        
        cleanLines = append(cleanLines, line)
    }
    
    return strings.Join(cleanLines, "\n")
}

type UnitInfo struct {
    Number string
    Title  string
    Subject string
}

func parseUnitFromFilename(filePath string) UnitInfo {
    filename := filepath.Base(filePath)
    filename = strings.TrimSuffix(filename, ".pdf")
    
    // Parse patterns like "Unit-1-algebra.pdf", "Unit-4-Calculus.pdf"
    unitRegex := regexp.MustCompile(`Unit-(\d+)-(.+)`)
    matches := unitRegex.FindStringSubmatch(filename)
    
    if len(matches) >= 3 {
        return UnitInfo{
            Number:  matches[1],
            Title:   strings.Title(strings.ReplaceAll(matches[2], "-", " ")),
            Subject: strings.ToLower(matches[2]),
        }
    }
    
    // Fallback for other patterns
    return UnitInfo{
        Number:  "Unknown",
        Title:   strings.Title(strings.ReplaceAll(filename, "-", " ")),
        Subject: "mathematics",
    }
}

func (p *PDFProcessor) createChunksFromText(text string, unitInfo UnitInfo, source weaviate.Source) []weaviate.ContentChunk {
    var chunks []weaviate.ContentChunk
    
    // Split by pages first
    pagePattern := regexp.MustCompile(`--- Page (\d+) ---`)
    pages := pagePattern.Split(text, -1)
    pageNumbers := pagePattern.FindAllStringSubmatch(text, -1)
    
    chunkIndex := 0
    
    for i, pageContent := range pages {
        if strings.TrimSpace(pageContent) == "" {
            continue
        }
        
        // Get page number
        pageNum := 1
        if i > 0 && len(pageNumbers) >= i {
            if len(pageNumbers[i-1]) > 1 {
                fmt.Sscanf(pageNumbers[i-1][1], "%d", &pageNum)
            }
        }
        
        // Update source with page number
        pageSource := source
        pageSource.Page = pageNum
        
        // Split page content into smaller chunks (by sections or paragraphs)
        sections := p.splitIntoSections(pageContent)
        
        for _, section := range sections {
            if len(strings.TrimSpace(section)) < 100 { // Skip very short sections
                continue
            }
            
            // Detect concepts in this section
            concepts := p.extractConcepts(section, unitInfo)
            
            chunk := weaviate.ContentChunk{
                ID:         uuid.New().String(),
                Content:    strings.TrimSpace(section),
                Concept:    strings.Join(concepts, "; "),
                Chapter:    fmt.Sprintf("Unit %s: %s", unitInfo.Number, unitInfo.Title),
                Source:     pageSource,
                ChunkIndex: chunkIndex,
            }
            
            chunks = append(chunks, chunk)
            chunkIndex++
        }
    }
    
    return chunks
}

func (p *PDFProcessor) splitIntoSections(text string) []string {
    // Split by double newlines (paragraphs)
    paragraphs := strings.Split(text, "\n\n")
    
    var sections []string
    var currentSection strings.Builder
    maxChunkSize := 1000 // Maximum characters per chunk
    
    for _, paragraph := range paragraphs {
        paragraph = strings.TrimSpace(paragraph)
        if paragraph == "" {
            continue
        }
        
        // If adding this paragraph would exceed max size, finalize current section
        if currentSection.Len() > 0 && currentSection.Len()+len(paragraph) > maxChunkSize {
            sections = append(sections, currentSection.String())
            currentSection.Reset()
        }
        
        if currentSection.Len() > 0 {
            currentSection.WriteString("\n\n")
        }
        currentSection.WriteString(paragraph)
    }
    
    // Add the last section
    if currentSection.Len() > 0 {
        sections = append(sections, currentSection.String())
    }
    
    return sections
}

func (p *PDFProcessor) extractConcepts(text string, unitInfo UnitInfo) []string {
    var concepts []string
    
    // Subject-specific concept patterns
    conceptPatterns := map[string][]string{
        "algebra": {
            `(?i)\b(linear\s+equations?|quadratic\s+equations?|polynomials?|factoring|variables?|coefficients?)\b`,
            `(?i)\b(matrices|determinants?|systems?\s+of\s+equations?)\b`,
        },
        "calculus": {
            `(?i)\b(derivatives?|differentiation|limits?|integration|integrals?)\b`,
            `(?i)\b(continuity|functions?|graphs?|optimization)\b`,
        },
        "sets": {
            `(?i)\b(sets?|unions?|intersections?|subsets?|elements?)\b`,
            `(?i)\b(probability|combinations?|permutations?)\b`,
        },
        "trig": {
            `(?i)\b(trigonometry|sine|cosine|tangent|angles?)\b`,
            `(?i)\b(radians?|degrees?|identities)\b`,
        },
        "statistics": {
            `(?i)\b(mean|median|mode|variance|standard\s+deviation)\b`,
            `(?i)\b(probability|distributions?|sampling)\b`,
        },
        "matrices": {
            `(?i)\b(matrices|matrix|determinant|eigenvalues?|eigenvectors?)\b`,
            `(?i)\b(linear\s+transformations?|vectors?)\b`,
        },
        "geometry": {
            `(?i)\b(points?|lines?|planes?|volumes?|areas?)\b`,
            `(?i)\b(triangles?|circles?|spheres?|cylinders?)\b`,
        },
    }
    
    // Add unit-specific patterns
    if patterns, exists := conceptPatterns[unitInfo.Subject]; exists {
        for _, pattern := range patterns {
            regex := regexp.MustCompile(pattern)
            matches := regex.FindAllString(text, -1)
            for _, match := range matches {
                concepts = append(concepts, strings.ToLower(strings.TrimSpace(match)))
            }
        }
    }
    
    // Remove duplicates
    conceptSet := make(map[string]bool)
    var uniqueConcepts []string
    for _, concept := range concepts {
        if !conceptSet[concept] {
            conceptSet[concept] = true
            uniqueConcepts = append(uniqueConcepts, concept)
        }
    }
    
    // If no specific concepts found, use the unit subject
    if len(uniqueConcepts) == 0 {
        uniqueConcepts = append(uniqueConcepts, unitInfo.Subject)
    }
    
    return uniqueConcepts
}

func getPDFFiles(dir string) ([]string, error) {
    var pdfFiles []string
    
    files, err := ioutil.ReadDir(dir)
    if err != nil {
        return nil, err
    }
    
    for _, file := range files {
        if !file.IsDir() && strings.HasSuffix(strings.ToLower(file.Name()), ".pdf") {
            pdfFiles = append(pdfFiles, filepath.Join(dir, file.Name()))
        }
    }
    
    return pdfFiles, nil
}