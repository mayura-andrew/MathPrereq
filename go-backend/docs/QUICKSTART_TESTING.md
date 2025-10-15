# 🚀 Quick Start Testing Guide

Complete testing guide for the MathPrereq backend with optimized Neo4j and streaming API.

## Prerequisites

- Docker and Docker Compose installed
- Go 1.21+ installed
- `jq` installed (for pretty JSON output)
- `curl` installed

## 1️⃣ Start Services

```bash
# Start all services (Neo4j, MongoDB, Weaviate)
docker-compose -f docker-compose.dev.yml up -d

# Wait 30 seconds for services to be ready
sleep 30
```

## 2️⃣ Create Neo4j Indexes (CRITICAL FOR PERFORMANCE!)

**⚠️ This step is REQUIRED for optimal performance!**

```bash
# Create database indexes
./scripts/create-neo4j-indexes.sh

# Expected output:
# ✅ Creating Neo4j indexes...
# ✅ Index concept_id_index created successfully
# ✅ Index concept_name_index created successfully
# ✅ Constraint concept_id_unique created successfully
```

**Performance Impact:**
- Without indexes: 20-38 seconds per query ❌
- With indexes: 1.66 seconds per query ✅ (13-23x faster)

## 3️⃣ Start Backend Server

```bash
# Start the Go backend
go run cmd/server/main.go

# Expected output:
# [INFO] Server starting on port 8080
# [INFO] Connected to Neo4j
# [INFO] Connected to MongoDB
# [INFO] Connected to Weaviate
```

## 4️⃣ Test Standard Query Endpoint

Test the traditional request/response API:

```bash
# Test simple query
curl -X POST http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is calculus?"}' | jq

# Expected response time: ~17 seconds total
# Expected structure:
# {
#   "question": "What is calculus?",
#   "concepts": ["Calculus"],
#   "prerequisites": [...],
#   "explanation": "...",
#   "resources": [...],
#   "query_id": "...",
#   "created_at": "..."
# }
```

## 5️⃣ Test Streaming API (RECOMMENDED for UX!)

Test the new Server-Sent Events streaming endpoint:

```bash
# Test streaming endpoint
./scripts/test-streaming-api.sh

# Or manually:
curl -N -X POST http://localhost:8080/api/v1/query/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"question": "What is calculus?"}'
```

**Expected Event Timeline:**

| Time | Event | Description |
|------|-------|-------------|
| 0s | `start` | Query processing started |
| 0-1s | `progress` | Identifying concepts... |
| ~1.2s | `concepts` | **First visible result!** `["Calculus"]` |
| ~1.2s | `progress` | Fetching prerequisites... |
| ~1.7s | `prerequisites` | Full prerequisite path with 14 concepts |
| ~1.7s | `context` | Vector search context (5 chunks) |
| ~1.7s | `resources` | Educational resources from web scraping |
| 5-17s | `explanation_chunk` | Progressive explanation chunks (multiple events) |
| ~17s | `explanation_complete` | Full explanation assembled |
| ~17s | `complete` | Query complete with full response |

**UX Improvement:**
- Standard API: 17s wait, no feedback ❌
- Streaming API: 1.2s first response, progressive updates ✅
- **Perceived performance: 5-10x better!**

## 6️⃣ Test Neo4j Performance

Verify Neo4j optimization is working:

```bash
# Diagnose Neo4j performance
./scripts/diagnose-neo4j-performance.sh

# Expected output:
# ✅ Neo4j Response Time: 1.66s (should be < 3s)
# ✅ Connection Pool: Active
# ✅ Indexes: All present
```

## 7️⃣ Test Complex Multi-Concept Query

```bash
# Test with multiple concepts
curl -N -X POST http://localhost:8080/api/v1/query/stream \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the prerequisites for differential equations and linear algebra?"}' | \
  while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      echo "$line" | sed 's/^data: //' | jq -C '.'
    fi
  done
```

## 📊 Performance Benchmarks

### Standard Query (/api/v1/query)
- **Total Time**: ~17 seconds
- **First Response**: 17 seconds (nothing until complete)
- **User Experience**: ⭐⭐ (feels slow, no feedback)

### Streaming Query (/api/v1/query/stream)
- **Total Time**: ~17 seconds (same as standard)
- **First Response**: ~1.2 seconds (concepts visible)
- **Progressive Updates**: Every 1-2 seconds
- **User Experience**: ⭐⭐⭐⭐⭐ (feels 5-10x faster!)

### Performance Breakdown
```
Streaming Event Timeline:
├── 0.0s:  start event sent
├── 1.2s:  concepts identified (FIRST VISIBLE RESULT)
├── 1.7s:  prerequisites fetched (Neo4j optimized!)
├── 1.7s:  context retrieved (Weaviate)
├── 1.7s:  resources found (scraper)
├── 5-17s: explanation streaming in chunks
└── 17s:   complete event (done!)

Neo4j Performance (with indexes):
├── Session creation: 0.05s
├── Concept lookup: 0.1s (batch query)
├── Path traversal: 1.5s (depth limit 1-5, LIMIT 100)
└── Total: 1.66s ✅ (was 20-38s without optimization)
```

## 🔍 Troubleshooting

### "Neo4j timeout" errors

```bash
# Check if indexes exist
docker exec mathprereq-neo4j cypher-shell -u neo4j -p password \
  "SHOW INDEXES" | grep concept

# Recreate indexes if missing
./scripts/create-neo4j-indexes.sh
```

### Streaming events not appearing

```bash
# Test if SSE headers are set correctly
curl -v -N -X POST http://localhost:8080/api/v1/query/stream \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}' 2>&1 | grep -i "content-type"

# Expected: Content-Type: text/event-stream
```

### Slow first query after restart

**Normal behavior**: First query after restart is slower (~25-30s) because:
- Connection pools are being initialized
- Caches are empty
- LLM cold start

**Subsequent queries**: ~17s (or 0.1s if cached)

### No explanation chunks streaming

Check LLM integration:
```bash
# Verify LLM client is configured
grep -A 5 "llmClient" cmd/server/main.go

# Check if streaming is enabled in query service
grep "explanation_chunk" internal/application/services/query_service.go
```

## 📚 Next Steps

1. **Frontend Integration**: See [STREAMING_API_GUIDE.md](./STREAMING_API_GUIDE.md) for React/TypeScript examples
2. **Production Deployment**: Configure nginx for SSE support (disable proxy_buffering)
3. **Monitoring**: Set up metrics for streaming endpoint performance
4. **LLM Streaming**: Integrate actual LLM streaming API when available

## 🎯 Success Criteria

✅ **Standard query completes in ~17s** (was 35-120s before optimization)  
✅ **Neo4j queries complete in <3s** (was 20-38s)  
✅ **Streaming first response <2s** (concepts visible immediately)  
✅ **No timeout errors** (connection pooling working)  
✅ **100% success rate** (was 40% before fixes)  

## 📖 Documentation

- [STREAMING_API_GUIDE.md](./STREAMING_API_GUIDE.md) - Complete streaming API documentation
- [NEO4J_FIX_SUMMARY.md](./NEO4J_FIX_SUMMARY.md) - Neo4j optimization details
- [PARALLEL_RAG_PIPELINE.md](./PARALLEL_RAG_PIPELINE.md) - Parallel architecture
- [api-endpoints.md](./api-endpoints.md) - API reference

---

**Happy Testing! 🚀**

For issues or questions, check the logs with `docker-compose logs -f` or review the documentation above.
