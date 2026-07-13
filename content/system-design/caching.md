# Caching

## Definition
Caching stores frequently accessed data in a fast-access storage layer (typically in-memory) to reduce latency and database load. The trade-off is staleness — cached data may not reflect the latest state.

## Key Terms
- **Cache-aside (lazy loading)**: App checks cache first, on miss reads DB and populates cache.
- **Write-through**: Writes go to cache and DB simultaneously — consistent but slower writes.
- **Write-behind (write-back)**: Writes go to cache, async flush to DB — fast but risk of data loss.
- **TTL (Time To Live)**: Expiration time for cached entries.
- **Cache invalidation**: Removing or updating stale entries. Famously one of the two hard problems.
- **Cache hit/miss**: Hit = data found in cache. Miss = must fetch from source.
- **Eviction policy**: LRU (Least Recently Used), LFU (Least Frequently Used), FIFO.
- **Hot key**: A single cache key receiving disproportionate traffic.
- **Cache stampede**: Many threads simultaneously miss and all hit the DB.
- **Redis vs Memcached**: Redis = rich data structures, persistence, pub/sub. Memcached = simpler, multi-threaded.

## Why It Matters
Caching is the single highest-ROI optimization for read-heavy systems. A well-placed cache can reduce DB load by 90%+ and cut latency from 100ms to 1ms. Interviewers expect you to propose caching early.

## Interview Questions
1. "Where would you place a cache in this architecture?"
2. "How do you handle cache invalidation?"
3. "What happens when your cache goes down?"

## Gotchas
- "There are only two hard things: cache invalidation and naming things." — Invalidation is genuinely hard.
- Not having a cache-aside strategy leads to thundering herd on cold start.
- Caching stale data without TTL or invalidation leads to bugs that are hard to debug.
- Forgetting that caches are ephemeral — never use cache as primary data store.
- Hot keys can overwhelm a single cache node — need key distribution strategy.

## Questions

### Q1
type: multiple-choice
stem: "Which caching strategy writes data to both cache and database simultaneously?"
options:
  - A: Cache-aside
  - B: Write-through
  - C: Write-behind
  - D: Read-through
correct: B
explanation: "Write-through writes to cache and DB at the same time, ensuring consistency at the cost of write latency."
difficulty: 2

### Q2
type: scenario
stem: "A popular cache key expires during a traffic spike. 1000 concurrent requests all miss the cache, hit the database simultaneously, and CPU spikes to 100%. What happened and how do you prevent it?"
options:
  - A: Cache invalidation — use a write-through cache instead
  - B: Cache stampede / thundering herd — use request coalescence or early expiration with jitter
  - C: Memory overflow — increase cache size
  - D: Cache pollution — use LRU eviction
correct: B
explanation: "Cache stampede occurs when many requests simultaneously find an expired key and all query the database. Fixes: (1) request coalescence (only one thread fetches, others wait), (2) probabilistic early expiration (refresh before TTL with random jitter), (3) mutex/lock per key."
trade_offs: "Request coalescence adds complexity and can create head-of-line blocking. Simple approach: set TTL with random jitter (TTL + random(0, 60s)) so keys don't expire simultaneously."
difficulty: 3

### Q3
type: select-all
stem: "Which are valid cache eviction policies?"
options:
  - A: LRU
  - B: Round-robin
  - C: LFU
  - D: FIFO
correct:
  - A
  - C
  - D
explanation: "LRU (Least Recently Used), LFU (Least Frequently Used), and FIFO are all valid eviction policies. Round-robin is a load balancing strategy."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The caching strategy where the application first checks the cache, and on a miss reads from the database and then populates the cache is called ______."
answers:
  - "cache-aside"
  - "cache aside"
  - "lazy loading"
  - "lazy-loading"
explanation: "Cache-aside (lazy loading) is the most common caching strategy. The application is responsible for checking the cache and populating it on misses."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are risks of the write-behind (write-back) caching strategy?"
options:
  - A: Data loss if the cache crashes before flushing to the database
  - B: Increased write latency compared to write-through
  - C: Inconsistency between cache and database
  - D: Complex conflict resolution if multiple writes update the same key
correct:
  - A
  - C
  - D
explanation: "Write-behind risks include data loss on cache failure (A), cache-database inconsistency (C), and conflict resolution for concurrent writes to the same key (D). Write-behind actually has LOWER write latency than write-through, so B is incorrect."
difficulty: 2

### Q6
type: scenario
stem: "You run an e-commerce site with a Redis cache in front of your product database. A single product goes viral and its cache key receives 10,000 requests per second, overwhelming one Redis shard. Step 1: Identify the problem pattern. Step 2: Propose a solution that distributes the load. What do you do?"
options:
  - A: Increase the TTL on the hot key so it stays cached longer
  - B: Add read replicas and use client-side random key suffixes (e.g., product:123:v1..v10) to distribute reads across multiple cache keys
  - C: Switch from Redis to Memcached
  - D: Move the product data to the application's local cache only
correct: B
explanation: "This is the hot key problem. Solution: replicate the hot key with random suffixes (product:123:v3), then pick a random replica on read. This spreads load across multiple Redis shards. Option A doesn't solve the single-shard bottleneck. Option C doesn't address the fundamental distribution issue. Option D loses the shared cache benefit."
trade_offs: "Key replication uses more memory and requires invalidating all replica keys on write. You must balance the number of replicas against memory overhead and invalidation complexity."
difficulty: 3

### Q7
type: scenario
stem: "Your social media app uses write-through caching for user profiles. After a user updates their bio, the write-through cache is updated immediately, but users in other regions still see the old bio for up to 5 minutes. Step 1: Identify why stale data persists despite write-through. Step 2: Decide how to fix this. What is happening?"
options:
  - A: Write-through only updates the local cache — regional edge caches have their own TTL
  - B: The database is eventually consistent
  - C: The application is using write-behind instead
  - D: LRU eviction is removing the new value
correct: A
explanation: "Write-through updates the primary cache and database synchronously, but if you have regional caches (e.g., CDN edge caches or read replicas), each has its own TTL. The regional caches serve stale data until their TTL expires or they are explicitly invalidated."
trade_offs: "You can invalidate regional caches on write (strong consistency but higher latency and complexity), reduce TTL (more origin fetches), or accept eventual consistency (simplest but users see stale data). Each option has operational cost."
difficulty: 3

### Q8
type: scenario
stem: "You are designing a news feed system. Posts are written frequently and need to appear in followers' feeds quickly, but the read volume is 100x the write volume. Step 1: Decide between cache-aside and write-through for the feed cache. Step 2: Consider what happens on a cache miss for a popular user's feed. Step 3: Evaluate whether caching the feed is even the right approach. What strategy do you choose?"
options:
  - A: Write-through cache for all feeds — guarantees consistency
  - B: Cache-aside with request coalescence for popular feeds, and pre-compute/push feed updates to avoid expensive on-demand assembly
  - C: No cache — read directly from the database every time
  - D: Write-behind cache — fastest writes with eventual consistency
correct: B
explanation: "Cache-aside avoids unnecessary cache population for inactive feeds. Request coalescence prevents stampede on popular feeds. But the deeper insight is that assembling a feed on cache miss is expensive (fan-out reads), so pre-computing feeds (push model) and caching the pre-computed result is more efficient than assembling on every miss."
trade_offs: "Pre-computed feeds (push model) use more storage and make writing slower (must update N followers' feeds). On-demand assembly (pull model) saves storage but is slow on cache miss. Hybrid approaches (pre-compute for active users, pull for inactive) balance both."
difficulty: 4
