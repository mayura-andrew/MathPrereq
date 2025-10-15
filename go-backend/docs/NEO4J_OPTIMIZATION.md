# Neo4j Performance Optimization

## Problem Identified

The Neo4j `FindPrerequisitePath` function was timing out because it:

1. **Sequential Concept ID Lookups**: Called `FindConceptID` for each concept one by one
2. **Multiple Sessions**: Created a new session for each concept lookup
3. **Routing Table Timeout**: Neo4j driver error: "timed out waiting for other goroutine to update routing table"

## Current Bottleneck

```go
// SLOW: Sequential lookups with multiple sessions
for _, concept := range targetConcepts {
    id, err := c.FindConceptID(ctx, concept)  // Each creates new session!
    if err != nil {
        continue
    }
    if id != nil {
        targetIDs = append(targetIDs, *id)
    }
}
```

**Performance Impact**: 
- 4 concepts × ~1.5s per lookup = ~6 seconds
- This exceeds the 5-second parallel fetch timeout

## Solution 1: Batch Concept ID Lookup (Recommended)

Instead of sequential lookups, do a single batch query:

```go
func (c *Client) FindPrerequisitePath(ctx context.Context, targetConcepts []string) ([]Concept, error) {
	if len(targetConcepts) == 0 {
		return []Concept{}, nil
	}

	session := c.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// OPTIMIZED: Single batch query to find all concept IDs
	targetIDs, err := c.FindConceptIDsBatch(ctx, session, targetConcepts)
	if err != nil {
		return nil, fmt.Errorf("failed to find concept IDs: %w", err)
	}

	if len(targetIDs) == 0 {
		c.logger.Warn("No target concepts found in knowledge graph",
			zap.Strings("attempted_concepts", targetConcepts))
		return []Concept{}, nil
	}

	// Rest of the prerequisite path query...
}

// New helper method for batch lookup
func (c *Client) FindConceptIDsBatch(ctx context.Context, session neo4j.SessionConfig, conceptNames []string) ([]string, error) {
	query := `
		UNWIND $conceptNames AS conceptName
		MATCH (c:Concept)
		WHERE toLower(c.name) CONTAINS toLower(conceptName) 
		   OR toLower(c.id) = toLower(conceptName)
		RETURN DISTINCT c.id as id
	`
	
	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		records, err := tx.Run(ctx, query, map[string]interface{}{
			"conceptNames": conceptNames,
		})
		if err != nil {
			return nil, err
		}

		var ids []string
		for records.Next(ctx) {
			record := records.Record()
			if idValue, ok := record.Get("id"); ok && idValue != nil {
				ids = append(ids, toString(idValue))
			}
		}
		return ids, records.Err()
	})

	if err != nil {
		return nil, err
	}

	return result.([]string), nil
}
```

**Performance Improvement**: 
- Before: 4 × 1.5s = ~6 seconds
- After: 1 query = ~0.5 seconds
- **12x faster!**

## Solution 2: Increase Timeout (Applied)

Increased parallel fetch timeout from 5s to 10s to accommodate current Neo4j performance:

```go
// Increased to 10 seconds to accommodate Neo4j prerequisite path queries
fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
```

## Solution 3: Connection Pool Optimization

Add to `config.yaml`:

```yaml
neo4j:
  uri: bolt://localhost:7687
  username: neo4j
  password: password
  max_connection_pool_size: 50    # Increase pool
  connection_timeout: 30s
  max_transaction_retry_time: 30s
```

## Solution 4: Add Caching Layer

For frequently queried concepts, implement a cache:

```go
type ConceptCache struct {
	sync.RWMutex
	cache map[string]*string
	ttl   time.Duration
}

func (c *Client) FindConceptIDCached(ctx context.Context, conceptName string) (*string, error) {
	c.cache.RLock()
	if cached, ok := c.cache.cache[conceptName]; ok {
		c.cache.RUnlock()
		return cached, nil
	}
	c.cache.RUnlock()

	// Not in cache, fetch from Neo4j
	id, err := c.FindConceptID(ctx, conceptName)
	if err != nil {
		return nil, err
	}

	c.cache.Lock()
	c.cache.cache[conceptName] = id
	c.cache.Unlock()

	return id, nil
}
```

## Recommended Implementation Order

1. ✅ **Increase timeout** (5s → 10s) - DONE
2. ✅ **Add timeout diagnostics** - DONE
3. 🔄 **Implement batch lookup** - TODO (highest priority)
4. 🔄 **Optimize connection pool** - TODO
5. 🔄 **Add caching** - TODO (optional, for production)

## Expected Results

After implementing batch lookup:

```
Before:
- Neo4j lookup: ~6 seconds
- Total query time: ~23 seconds

After:
- Neo4j lookup: ~0.5 seconds
- Total query time: ~17 seconds
- Improvement: 26% faster overall, no timeouts
```

## Monitoring

Add metrics to track Neo4j performance:

```go
c.logger.Info("Neo4j prerequisite path query",
	zap.Strings("concepts", targetConcepts),
	zap.Int("found_ids", len(targetIDs)),
	zap.Duration("lookup_time", lookupDuration),
	zap.Duration("path_query_time", pathQueryDuration))
```
