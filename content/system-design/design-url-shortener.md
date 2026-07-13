# Design a URL Shortener

## Definition
A URL shortener is a service that takes a long URL and generates a short, unique alias (e.g., bit.ly/3aXk9F) that redirects to the original URL when visited. It involves encoding schemes to compress identifiers, distributed ID generation to ensure uniqueness at scale, redirect semantics for browser behavior, and supporting infrastructure like caching and analytics to handle high read throughput and provide tracking insights.

## Key Terms
- **Base62 Encoding**: An encoding scheme using characters a-z, A-Z, and 0-9 (62 characters) to represent numbers in a compact string form, commonly used for short keys.
- **Hash Collision**: When two different long URLs produce the same short key, requiring a resolution strategy such as appending a short string and rehashing.
- **301 Redirect**: A permanent redirect that browsers cache, reducing server load but preventing analytics tracking on subsequent visits.
- **302 Redirect**: A temporary redirect that browsers do not cache, ensuring every click hits the server and enabling accurate analytics.
- **Key Generation Service (KGS)**: A standalone service that pre-generates unique keys and distributes them to application servers to avoid collisions and coordination overhead.
- **Snowflake ID**: A distributed ID generation algorithm that produces roughly time-ordered, unique 64-bit IDs using a combination of timestamp, datacenter ID, and worker ID.
- **Custom Alias**: A user-specified short key (e.g., bit.ly/my-event) instead of an auto-generated one, which requires validation and collision checking.
- **Geolocation-based Redirect**: Redirecting users to different destination URLs based on their geographic location, useful for region-specific content or compliance.

## Why It Matters
URL shorteners are a classic system design interview question because they elegantly combine read-heavy workloads, distributed ID generation, encoding strategies, and caching into a single, well-scoped problem. The read-to-write ratio is typically 100:1 or higher, making cache design critical, while the need for unique short keys at scale forces candidates to reason about trade-offs between deterministic hashing and pre-generated key pools.

Beyond interviews, URL shorteners are foundational infrastructure on the internet — powering link tracking in marketing campaigns, fitting links into character-limited platforms, enabling A/B testing through redirect logic, and supporting QR codes. Understanding how to design one teaches reusable patterns for any system requiring high-throughput reads, unique identifier generation, and analytics collection.

## Interview Questions
1. "How would you generate a unique short key for a given long URL?"
2. "What is the trade-off between 301 and 302 redirects in a URL shortener?"
3. "How would you handle hash collisions when generating short keys?"
4. "Design the analytics tracking system for a URL shortener at scale."
5. "How would you support custom aliases while ensuring uniqueness and preventing abuse?"

## Gotchas
- Using 301 redirects caches the redirect in the browser, which means subsequent clicks bypass your server and you lose analytics data.
- Using pure MD5/SHA-1 hashing without a collision resolution strategy will eventually produce duplicate keys.
- Auto-incrementing IDs in a single database create a single point of failure and bottleneck for writes in a distributed system.
- UUIDs guarantee uniqueness but produce long keys that defeat the purpose of URL shortening.
- Not rate-limiting custom alias creation allows users to squat on desirable short keys.
- Forgetting to handle the case where a short URL expires but is still cached in a CDN or browser redirect cache.

## Questions

### Q1
type: multiple-choice
stem: "Which HTTP redirect status code should a URL shortener use if the primary goal is to track every click for analytics?"
options:
  - A: 301 Moved Permanently
  - B: 302 Found
  - C: 304 Not Modified
  - D: 307 Temporary Redirect
correct: B
explanation: "A 302 redirect is temporary, so browsers do not cache it and every click hits the server, enabling accurate analytics. A 301 redirect is cached by browsers, causing subsequent visits to bypass the server and miss tracking."
difficulty: 1

### Q2
type: multiple-choice
stem: "A URL shortener uses Base62 encoding with a 7-character key. Approximately how many unique URLs can it support?"
options:
  - A: ~3.5 trillion
  - B: ~62 billion
  - C: ~4 billion
  - D: ~62 million
correct: A
explanation: "62^7 = 3,521,614,606,208, which is approximately 3.5 trillion unique keys. This is a common design choice because it provides an enormous keyspace while keeping the short URL compact."
difficulty: 2

### Q3
type: fill-in-blank
stem: "In Base62 encoding, the character set consists of lowercase letters, uppercase letters, and digits. The total number of characters in this set is ___."
answers:
  - "62"
  - "sixty-two"
  - "sixty two"
explanation: "Base62 uses 26 lowercase letters + 26 uppercase letters + 10 digits = 62 total characters, providing a compact encoding that produces shorter keys than decimal or hexadecimal."
difficulty: 1

### Q4
type: fill-in-blank
stem: "The Snowflake ID algorithm generates unique IDs by combining a timestamp, a ___ ID, and a worker ID to ensure uniqueness across distributed nodes."
answers:
  - "datacenter"
  - "data center"
  - "data-center"
  - "machine"
  - "cluster"
  - "shard"
explanation: "The Snowflake ID algorithm combines a timestamp, a datacenter ID, and a worker ID to generate globally unique, roughly time-ordered 64-bit IDs without coordination between nodes."
difficulty: 3

### Q5
type: select-all
stem: "Which of the following are valid strategies for generating unique short keys in a distributed URL shortener? Select all that apply."
options:
  - A: Pre-generate keys in a Key Generation Service and hand them out to app servers
  - B: Use a global auto-increment counter in a single database
  - C: Hash the long URL with MD5 and take the first 7 characters
  - D: Use Snowflake-style distributed ID generation and Base62-encode the result
  - E: Generate random 7-character Base62 strings and retry on collision
correct:
  - A
  - C
  - D
  - E
explanation: "A KGS pre-generates keys to avoid runtime collisions. MD5 hashing with truncation works but needs collision resolution. Snowflake IDs Base62-encoded are unique and time-ordered. Random generation with retry is simple but becomes inefficient as the keyspace fills. A global auto-increment counter (B) is a single point of failure and bottleneck in distributed systems."
difficulty: 3

### Q6
type: scenario
stem: "You are designing a URL shortener that needs to handle 100 million new URLs per month with a 100:1 read-to-write ratio. Step 1: Determine the key length and encoding scheme needed to ensure enough unique keys for 10 years. Step 2: Decide between a hashing approach and a key generation service. Which approach do you choose and why?"
options:
  - A: Use 7-character Base62 keys with a Key Generation Service for guaranteed uniqueness without coordination
  - B: Use 6-character Base62 keys with MD5 hashing for deterministic key generation
  - C: Use 8-character Base62 keys with random generation for simplicity
  - D: Use UUID keys for guaranteed global uniqueness without any coordination
correct: A
explanation: "100M URLs/month × 120 months = 12 billion URLs over 10 years. 62^7 ≈ 3.5 trillion, which is more than sufficient. A KGS pre-generates unique keys, eliminating hash collisions and coordination overhead between app servers. Each app server grabs a batch of keys from KGS, ensuring no two servers generate the same key."
trade_offs: "KGS adds an extra service dependency and requires persistence for unused keys, but eliminates hash collision handling and inter-server coordination. Hashing is deterministic but requires collision resolution loops that are hard to predict in latency. Random generation has unpredictable retry rates as keyspace fills."
difficulty: 2

### Q7
type: scenario
stem: "Your URL shortener is experiencing high latency on redirect requests for the top 1% of URLs (viral links). Step 1: Identify where the bottleneck likely is in the request path. Step 2: Design a caching strategy to reduce latency for these hot URLs while keeping cache size manageable."
options:
  - A: Add a Redis cache layer in front of the database with LRU eviction, caching short-to-long URL mappings
  - B: Replicate the database across more regions to reduce network latency
  - C: Precompute all redirects and store them in CDN edge nodes
  - D: Increase the database instance size to handle more queries per second
correct: A
explanation: "The bottleneck is the database lookup for hot URLs. A Redis cache with LRU eviction is ideal because the top 1% of URLs receive disproportionate traffic (Zipf distribution), so a small cache captures most of the benefit. LRU eviction naturally handles the hot key pattern and keeps cache size bounded."
trade_offs: "Cache introduces potential staleness if a URL mapping is updated (rare for shorteners). Cache invalidation must be handled on updates. CDN edge caching (C) would work but is harder to invalidate and more expensive for a dynamic redirect service. Database scaling (B, D) addresses capacity but not latency for repeated lookups of the same keys."
difficulty: 3

### Q8
type: scenario
stem: "A marketing client wants the URL shortener to redirect users to different landing pages based on their country (e.g., bit.ly/promo → US page vs. UK page). Step 1: Determine where in the redirect flow to introduce geolocation logic. Step 2: Evaluate the impact on caching and analytics. How do you design this?"
options:
  - A: Resolve geolocation at the application layer on every request, store country-to-URL mappings in the database, and use country-aware cache keys (e.g., short_key:country)
  - B: Use a single redirect and let the landing page itself handle geolocation via client-side JavaScript
  - C: Create separate short URLs for each country (e.g., bit.ly/promo-us, bit.ly/promo-uk) and let the client choose
  - D: Resolve geolocation at the DNS layer using geo-DNS before the request reaches the application
correct: A
explanation: "Handling geolocation at the application layer gives full control over the mapping and analytics. Country-aware cache keys (short_key:US, short_key:UK) prevent serving the wrong redirect from cache. This approach keeps one short URL for all users while supporting region-specific destinations and tracking click counts per country."
trade_offs: "Country-aware cache keys multiply cache entries per short URL (one per country), increasing cache memory. Geolocation lookup (via IP-to-country database) adds latency per request. Option B loses server-side analytics per country. Option C defeats the purpose of a single short link. Option D is inflexible and redirects at the server level, not the URL level."
difficulty: 3

### Q9
type: scenario
stem: "Your URL shortener needs to support URL expiration (links that stop working after a set time). Step 1: Consider how expiration affects the redirect path, caching, and key reuse. Step 2: Design an expiration mechanism that does not require scanning the entire database to find expired entries. How do you implement this efficiently?"
options:
  - A: Store an expiration timestamp with each URL entry, check it on each redirect request, and use a lazy deletion approach with a background cleanup job that scans a time-indexed partition
  - B: Scan the entire database periodically and delete expired URLs in a single batch job
  - C: Immediately delete expired URLs using a timer that triggers at expiration time for each URL
  - D: Never delete expired URLs; just return a 410 Gone status when an expired URL is accessed and rely on cache eviction
correct: A
explanation: "Storing an expiration timestamp and checking it on read is O(1) per request. A background cleanup job using a time-indexed table or sorted set (e.g., Redis ZSET sorted by expiration time) allows efficient range scans for expired entries without a full table scan. Lazy deletion means expired URLs may briefly remain in storage but are functionally dead once the redirect check fails."
trade_offs: "Lazy deletion means storage is not immediately reclaimed, and expired entries linger until the cleanup job runs. Checking expiration on every read adds a small per-request overhead. Immediate per-URL timers (C) are impractical at scale. Full table scans (B) are too expensive for large datasets. Never deleting (D) wastes storage indefinitely and prevents key reuse."
difficulty: 4
