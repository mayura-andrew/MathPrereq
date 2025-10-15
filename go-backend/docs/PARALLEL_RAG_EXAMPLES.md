# Parallel RAG Pipeline - Visual Examples

## Example 1: Timeline Comparison

### Sequential Processing (Before)
```
Time (ms) →
0ms      500ms    1300ms   2500ms   4500ms
|--------|--------|--------|--------|
   Neo4j → Weaviate → Scraper → LLM → Done
   500ms   800ms     1200ms   2000ms
   
TOTAL: 4500ms
```

### Parallel Processing (After)
```
Time (ms) →
0ms      1200ms   3200ms
|--------|--------|
   Neo4j ──→ (finishes at 500ms)  ↓
   Weaviate ──→ (finishes at 800ms)  ↓ → LLM → Done
   Scraper ────────→ (finishes at 1200ms) ↑   2000ms
   
TOTAL: 3200ms (29% faster!)
```

## Example 2: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     processQueryPipeline                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Identify Concepts │
                    │    (LLM Call)     │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ parallelDataFetch │
                    │  (Orchestrator)   │
                    └───────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Goroutine 1 │   │   Goroutine 2 │   │   Goroutine 3 │
├───────────────┤   ├───────────────┤   ├───────────────┤
│fetchPrereqs() │   │fetchVectorCtx()│   │fetchResources()│
│   (Neo4j)     │   │  (Weaviate)   │   │   (Scraper)   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        ▼                   ▼                   ▼
   prereqChan          vectorChan          resourceChan
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │  select statement │
                    │ (Result Collector)│
                    └───────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │ ParallelFetchResult │
                  │ ├─ Prerequisites    │
                  │ ├─ VectorChunks     │
                  │ ├─ Resources        │
                  │ ├─ Errors           │
                  │ └─ Timings          │
                  └─────────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │ Generate Response │
                    │    (LLM Call)     │
                    └───────────────────┘
                            │
                            ▼
                        QueryResult
```

## Example 3: Channel Communication Flow

```
Main Goroutine                  Worker Goroutines
     │                                  │
     │  Launch 3 goroutines             │
     ├──────────────────────────────────┤
     │                                  │
     │                          ┌───────┴───────┐
     │                          │               │
     │                     Goroutine 1     Goroutine 2
     │                          │               │
     │                      [Neo4j]         [Weaviate]
     │                          │               │
     │                     (500ms)          (800ms)
     │                          │               │
     │                          ▼               ▼
     │                    prereqChan ←──── vectorChan
     │                          │               
     ◄────────────────────────┘               
     │ Receive from prereqChan                  
     │ (at 500ms)                               
     │                                          
     ◄────────────────────────────────────────┘
     │ Receive from vectorChan                  
     │ (at 800ms)                               
     │                                          
     ▼                                          
Continue processing...                          
```

## Example 4: Error Handling Flow

```
                    parallelDataFetch
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
     Neo4j OK         Weaviate FAIL      Scraper OK
         │                 │                 │
         ▼                 ▼                 ▼
    prereqChan        vectorChan          resourceChan
    (5 concepts)      (empty array)       (10 resources)
         │                 │                 │
         │            errorChan              │
         │            (error message)        │
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ ParallelFetchResult│
                  ├────────────────────┤
                  │ Prerequisites: 5   │ ✅
                  │ VectorChunks: 0    │ ⚠️ Empty but OK
                  │ Resources: 10      │ ✅
                  │ Errors: [1 error]  │ ⚠️ Logged, not fatal
                  └────────────────────┘
                           │
                           ▼
                  Generate explanation
                  (with partial data) ✅
```

## Example 5: Timeout Scenario

```
Time: 0ms                                          5000ms (timeout)
      │                                                 │
      ├─ Neo4j ─────────────→ Done (500ms) ✅           │
      │                                                 │
      ├─ Weaviate ────────────────→ Done (800ms) ✅     │
      │                                                 │
      ├─ Scraper ───────────────────────────────────────┼→ Timeout! ⏰
      │                                                 │
      │                                            (Context cancelled)
      │                                                 │
      ▼                                                 ▼
Return partial results:                    
├─ Prerequisites: 5 ✅                     
├─ VectorChunks: 3 ✅                      
├─ Resources: 0 ⚠️ (timed out)            
└─ Errors: ["scraper timeout"]           
```

## Example 6: Real Request Flow

### User Request
```json
{
  "question": "What is the derivative of x^2?",
  "user_id": "user-123"
}
```

### Internal Processing
```
1. Identify Concepts (300ms)
   ├─ Input: "What is the derivative of x^2?"
   └─ Output: ["derivatives", "power rule"]

2. Parallel Fetch (1200ms) ← Slowest of the three
   │
   ├─ Neo4j (500ms)
   │  ├─ Input: ["derivatives", "power rule"]
   │  └─ Output: [
   │       {name: "limits", type: "prerequisite"},
   │       {name: "derivatives", type: "target"}
   │     ]
   │
   ├─ Weaviate (800ms)
   │  ├─ Input: "What is the derivative of x^2?"
   │  └─ Output: [
   │       "The derivative of x^n is nx^(n-1)...",
   │       "The power rule states that...",
   │       "Example: d/dx(x^2) = 2x..."
   │     ]
   │
   └─ Scraper (1200ms)
      ├─ Input: ["derivatives", "power rule"]
      └─ Output: [
            {url: "khanacademy.org/...", title: "Power Rule"},
            {url: "youtube.com/...", title: "Derivatives Explained"}
          ]

3. Generate Explanation (2000ms)
   ├─ Prerequisites: [...from Neo4j...]
   ├─ Context: [...from Weaviate...]
   └─ Output: "The derivative of x^2 is 2x..."

TOTAL: 300ms + 1200ms + 2000ms = 3500ms
```

## Example 7: Performance Metrics

### Before (Sequential)
```
Request Timeline:
├─ 0-300ms:    Identify concepts
├─ 300-800ms:  Neo4j query        (500ms wait)
├─ 800-1600ms: Weaviate query     (800ms wait)
├─ 1600-2800ms: Scraper query     (1200ms wait)
└─ 2800-4800ms: Generate response (2000ms wait)

Total: 4800ms
CPU Utilization: ~20% (lots of idle waiting)
```

### After (Parallel)
```
Request Timeline:
├─ 0-300ms:    Identify concepts
├─ 300-1500ms: Parallel fetch     (max of 500/800/1200ms)
│  ├─ Neo4j:    300-800ms
│  ├─ Weaviate: 300-1100ms
│  └─ Scraper:  300-1500ms
└─ 1500-3500ms: Generate response (2000ms)

Total: 3500ms (27% faster!)
CPU Utilization: ~65% (better resource usage)
```

## Example 8: Graceful Degradation

### Scenario: Neo4j is down

```
                parallelDataFetch
                       │
         ┌─────────────┼─────────────────┐
         │             │                 │
         ▼             ▼                 ▼
     Neo4j ❌      Weaviate ✅       Scraper ✅
   (error)         (success)         (success)
         │             │                 │
         ▼             ▼                 ▼
    prereqChan     vectorChan        resourceChan
    (empty [])     (3 chunks)        (10 resources)
         │             │                 │
    errorChan          │                 │
    (connection        │                 │
     refused)          │                 │
         │             │                 │
         └─────────────┼─────────────────┘
                       │
                       ▼
                Result (partial):
                ├─ Prerequisites: [] ⚠️ Empty but OK
                ├─ VectorChunks: 3 ✅
                ├─ Resources: 10 ✅
                └─ Errors: ["neo4j connection refused"] ⚠️
                       │
                       ▼
                Generate response with:
                ├─ No prerequisite path (skip that section)
                ├─ Vector context ✅ (use this!)
                └─ Resources ✅ (use this!)
                       │
                       ▼
                User gets a good answer! 🎉
                (just missing prerequisite info)
```

## Example 9: Channel Buffer Visualization

### Without Buffer (blocks)
```
Sender (Goroutine)          Channel          Receiver (Main)
      │                       │                     │
      ├─ Send data ──────────→│                     │
      │                       │                     │
      │ 🔒 BLOCKED!           │  [data waiting]     │
      │ (waiting for          │                     │
      │  receiver)            │                     │
      │                       │                     │
      │                       │←────── Receive ─────┤
      │ ✅ Unblocked!         │                     │
      ▼                       ▼                     ▼
```

### With Buffer = 1 (non-blocking)
```
Sender (Goroutine)          Channel          Receiver (Main)
      │                       │                     │
      ├─ Send data ──────────→│                     │
      │                       │ [buffer: data]      │
      ✅ Continue!            │                     │
      │ (doesn't wait)        │                     │
      ▼                       │                     │
    Exit                      │                     │
    goroutine                 │←────── Receive ─────┤
                              │                     │
                              ▼                     ▼
```

## Example 10: Select Statement Execution

```go
select {
case prereqs := <-prereqChan:
    // ✅ Executes when Neo4j finishes (500ms)
    result.Prerequisites = prereqs

case vectors := <-vectorChan:
    // ✅ Executes when Weaviate finishes (800ms)
    result.VectorChunks = vectors

case resources := <-resourceChan:
    // ✅ Executes when Scraper finishes (1200ms)
    result.Resources = resources

case <-ctx.Done():
    // ⏰ Executes if timeout occurs (5000ms)
    return result // with partial data
}
```

**Execution Order:**
1. At 500ms: Neo4j case executes
2. At 800ms: Weaviate case executes
3. At 1200ms: Scraper case executes
4. OR at 5000ms: Timeout case executes (if any still pending)

---

These visual examples demonstrate how the parallel RAG pipeline efficiently coordinates multiple data sources using Go channels, resulting in faster, more resilient query processing.
