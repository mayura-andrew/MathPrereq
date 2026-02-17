# LLM and Knowledge Graph Framework for Prerequisite Knowledge Concepts Identification in Foundational Mathematics

[![SLAAI-2025](https://img.shields.io/badge/SLAAI--2025-Accepted-success)](https://ieeexplore.ieee.org)
[![Year](https://img.shields.io/badge/Year-2025-blue)](https://github.com)

## Overview

This repository contains the implementation of a research project that leverages Large Language Models (LLMs) and Knowledge Graphs to automatically identify prerequisite knowledge concepts in foundational mathematics. The system was accepted for presentation at the SLAAI-2025 IEEE Conference.

Publised Paper - https://ieeexplore.ieee.org/document/11318529

## Architecture

The project consists of two main components:

- **Backend (Go)**: RESTful API server for processing mathematical concepts and managing knowledge graph operations
- **Client**: User interface for interacting with the prerequisite identification system

## Features

- 🧠 LLM-powered prerequisite concept extraction
- 🔗 Knowledge graph construction and visualization
- 📊 Prerequisite relationship mapping
- 🎓 Foundational mathematics focus
- ⚡ High-performance Go backend

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js 18+ (if client is web-based)
- API keys for LLM services (OpenAI/Anthropic/etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/MathPrereq.git
cd MathPrereq

# Install backend dependencies
cd backend
go mod download

# Install client dependencies
cd ../client
pnpm install
```

### Running the Application

```bash
# Start the backend server
cd backend
go run main.go

# Start the client (in a new terminal)
cd client
pnpm start
```

## Research Paper

This work was accepted at the **SLAAI-2025 IEEE Conference**.

**Citation:**
```
K. M. G. M. B. Alahakoon and D. D. M. Ranasinghe, "LLM and Knowledge Graph Based Framework for Dynamic Prerequisite Knowledge Identification in Foundational Mathematics," 2025 9th SLAAI International Conference on Artificial Intelligence (SLAAI-ICAI), Colombo, Sri Lanka, 2025, pp. 1-6, doi: 10.1109/SLAAI-ICAI68534.2025.11318529. keywords: {Visualization;Accuracy;Large language models;Retrieval augmented generation;Prototypes;Knowledge graphs;Software systems;Vectors;Software reliability;Systematic literature review;Large Language Models;Generative AI;Retrieval Augmented Generation;Software Engineering;Educational Technology},
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- SLAAI-2025 IEEE Conference organizers

## Contact

For questions regarding this research, please contact [mayuraalahakoon@gmail.com].

---

*© 2025 MathPrereq Research Project*
