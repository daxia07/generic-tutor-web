# Design a News Feed System

## Definition
A news feed system generates and delivers a personalized, reverse-chronological or ranked stream of content (posts, photos, activities) from people and topics a user follows. It is the core experience of platforms like Twitter, Instagram, and Facebook, requiring efficient fan-out of new posts to followers, ranking or ordering those posts, and serving them with low latency at massive scale.

## Key Terms
- **Fan-out on write (push model)**: When a user posts, the post is immediately pushed/copied into the feed caches of all their followers
- **Fan-out on read (pull model)**: When a user requests their feed, the system pulls the latest posts from all followees on-the-fly and merges them
- **Feed cache**: A per-user cache storing the pre-computed list of post IDs in their timeline, enabling O(1) feed retrieval
- **Content cache**: A global cache storing the actual post objects (text, media references, metadata) keyed by post ID
- **Ranking algorithm**: Logic that determines the order of posts in a feed, which can be chronological or engagement-weighted (likes, comments, recency signals)
- **Celebrity problem**: The challenge that users with millions of followers make fan-out-on-write extremely expensive, since a single post must be replicated millions of times
- **Cursor-based pagination**: Using an opaque cursor (e.g., a timestamp or post ID) rather than offset to paginate through feeds, avoiding performance degradation on large datasets
- **Pre-computation**: Computing and storing feed results ahead of time (typically via fan-out-on-write) so reads are fast
- **Real-time computation**: Computing feed results on-the-fly at read time (typically via fan-out-on-read) to avoid write amplification

## Why It Matters
The news feed is one of the most common system design interview questions because it elegantly demonstrates the trade-off between write amplification and read latency. Fan-out-on-write gives sub-millisecond reads but explodes write costs for popular users; fan-out-on-read keeps writes cheap but makes reads expensive when a user follows many accounts. Navigating this trade-off—and combining both approaches with a hybrid model—is a hallmark of strong system design thinking.

Beyond the interview, feed systems appear everywhere: social networks, content platforms, activity streams, and even enterprise dashboards. Understanding how to cache, rank, paginate, and distribute feed data at scale is foundational infrastructure knowledge.

## Interview Questions
1. "How would you design a news feed system for a social media platform like Twitter?"
2. "What is the celebrity problem in fan-out-on-write, and how would you handle it?"
3. "Compare fan-out-on-write vs fan-out-on-read. When would you choose one over the other?"

## Gotchas
- Assuming fan-out-on-write works uniformly for all users—celebrity accounts make pure push models impractical
- Using offset-based pagination for feeds, which degrades to O(n) for large offsets and is inconsistent under inserts
- Forgetting that ranking adds computational overhead at either write time or read time, changing the fan-out trade-off calculus
- Caching full post objects per-user instead of post IDs, leading to massive storage duplication and consistency headaches
- Ignoring the consistency window when a hybrid model serves a celebrity's posts via pull but other posts from push—the feed may appear out of order

## Questions

### Q1
type: multiple-choice
stem: "In a fan-out-on-write model, what happens immediately when a user publishes a new post?"
options:
  - A: The post is stored only in the author's database record and fetched on demand by followers
  - B: The post is inserted into the feed cache of every follower
  - C: A notification is sent to followers, who must explicitly request the post
  - D: The post is written to a global queue and followers pull from it periodically
correct: B
explanation: "Fan-out-on-write proactively copies the new post (or a reference to it) into each follower's pre-computed feed cache at write time, so that subsequent feed reads are fast."
difficulty: 1

### Q2
type: multiple-choice
stem: "Why is cursor-based pagination preferred over offset-based pagination for a news feed?"
options:
  - A: Cursors allow random access to any page, while offsets do not
  - B: Cursors are easier to implement and require no server-side state
  - C: Cursors remain consistent even when new posts are inserted between page loads, and avoid the O(n) skip cost of large offsets
  - D: Cursors reduce the total number of database rows that must be stored
correct: C
explanation: "Offset-based pagination skips N rows each page load, which is O(n) for large offsets and returns inconsistent results if new posts arrive. Cursor-based pagination uses an indexed column (e.g., post ID or timestamp) as a bookmark, giving consistent results and O(log n) lookups."
difficulty: 2

### Q3
type: fill-in-blank
stem: "The ________ problem refers to the scenario where a user with millions of followers makes fan-out-on-write prohibitively expensive because a single post must be replicated into millions of feed caches."
answers:
  - "celebrity"
  - "celebrity problem"
  - "influencer"
explanation: "The celebrity problem describes the scenario where a user with millions of followers makes fan-out-on-write prohibitively expensive, since a single post must be replicated into every follower's feed cache."
difficulty: 1

### Q4
type: fill-in-blank
stem: "In a typical news feed architecture, the ________ cache stores a per-user list of post IDs for fast feed retrieval, while the ________ cache stores the actual post objects globally keyed by post ID."
answers:
  - "feed"
  - "content"
  - "timeline"
  - "post"
  - "feed timeline content post"
explanation: "The feed cache stores per-user lists of post IDs for O(1) feed retrieval, while the content cache stores the actual post objects globally keyed by post ID, separating lightweight references from full content to avoid duplication."
difficulty: 3

### Q5
type: select-all
stem: "Which of the following are valid strategies to handle the celebrity problem in a news feed system?"
options:
  - A: Switch celebrity accounts to fan-out-on-read so their posts are pulled at read time instead of pushed to all followers
  - B: Rate-limit how many followers can receive a celebrity's post per second during fan-out-on-write
  - C: Use a hybrid model where regular users use fan-out-on-write and celebrities use fan-out-on-read
  - D: Denormalize the celebrity's full post content into every follower's feed cache to avoid a join
  - E: Pre-compute feeds for followers of celebrities asynchronously in a background task queue
correct:
  - A
  - C
  - E
explanation: "The celebrity problem is best addressed by avoiding synchronous fan-out-on-write for high-follower accounts. A hybrid model (C) and switching celebrities to pull (A) directly solve the write amplification. Async background pre-computation (E) can also spread the work over time. Rate-limiting (B) would cause followers to see stale feeds. Denormalizing full content (D) worsens storage and consistency issues rather than solving the core problem."
difficulty: 3

### Q6
type: scenario
stem: "You are designing a news feed for a new social platform. Most users have 100-500 followers, but a few celebrities have over 10 million followers. Step 1: Consider what happens if you use pure fan-out-on-write—how does the write path behave for a regular user vs a celebrity? Step 2: Now consider pure fan-out-on-read—how does the read path behave when a user follows 500 accounts? Step 3: Propose a hybrid approach that gets the best of both models."
options:
  - A: Use fan-out-on-write for all users; the celebrity write cost is acceptable because writes are infrequent
  - B: Use fan-out-on-read for all users; cache the merged results to speed up subsequent reads
  - C: Use fan-out-on-write for regular users (low follower count = cheap push) and fan-out-on-read for celebrities (avoid writing to millions of feeds); at read time, merge the pre-computed feed with the celebrity posts pulled on-the-fly
  - D: Use fan-out-on-read for celebrities and fan-out-on-write for regular users, but store full post objects in each feed cache to avoid a second lookup
correct: C
explanation: "The hybrid model is the industry-standard solution. Fan-out-on-write is cheap for regular users (100-500 writes per post) and gives fast reads. For celebrities, fan-out-on-read avoids the millions-of-writes problem. At read time, the system merges the push-based feed with on-the-fly celebrity posts, then ranks and returns the combined result."
trade_offs: "The hybrid model adds read-time complexity for the merge step, especially if the user follows many celebrities. Ranking must happen after the merge, adding latency. There is also a consistency window where push-based posts and pull-based posts may appear out of order."
difficulty: 2

### Q7
type: scenario
stem: "Your platform originally used a purely chronological feed, but engagement is declining. Product wants to introduce a ranking algorithm that surfaces the most relevant posts first. Step 1: Identify what signals you might use for ranking (e.g., likes, comments, recency, follow strength). Step 2: Decide whether ranking should happen at write time (pre-computed) or read time (real-time). Step 3: Consider the impact on your fan-out strategy—does pre-computed ranking change the cost of fan-out-on-write?"
options:
  - A: Rank at write time using engagement signals; this does not change fan-out costs because the rank score is just a number stored alongside the post ID
  - B: Rank at read time using real-time signals; this is always better because engagement data is freshest at read time
  - C: Pre-compute an initial rank score at write time using available signals, but also adjust at read time with real-time signals; pre-computed ranking increases fan-out-on-write cost if the score is per-follower (personalized), but is cheap if the score is global
  - D: Ranking is independent of the fan-out strategy and can be added later without any architectural changes
correct: C
explanation: "A global rank score computed once at write time is cheap to store alongside the post ID in each follower's feed. However, personalized ranking (e.g., weighted by how closely a user interacts with the author) means each follower gets a different score, which explodes fan-out-on-write cost. A practical approach is to compute a global score at write time and refine it at read time with personalization signals, balancing freshness and cost."
trade_offs: "Pre-computed global ranking is cheap but produces the same feed order for everyone. Personalized ranking is more engaging but dramatically increases storage and computation if done at write time. Real-time ranking at read time is freshest but adds latency, especially under fan-out-on-read where posts from many followees must be scored and merged."
difficulty: 3

### Q8
type: scenario
stem: "Your news feed service is experiencing high latency on feed reads. Profiling shows that 80% of read time is spent fetching post objects from the database after the list of post IDs is retrieved from the feed cache. Step 1: Diagnose why this is happening—the feed cache gives you post IDs quickly, but each ID requires a separate database lookup for the full post. Step 2: Propose a caching layer that reduces this latency. Step 3: Consider cache invalidation—what happens when a post is edited or deleted?"
options:
  - A: Store full post objects in the per-user feed cache alongside post IDs to eliminate the second lookup; invalidate by updating all feed caches containing the post
  - B: Add a global content cache (keyed by post ID) that stores full post objects; batch-fetch all post IDs from the feed cache in one call to the content cache; invalidate by deleting the cache entry for that post ID
  - C: Move the feed cache and database to the same region to reduce network latency
  - D: Increase the database connection pool size so that parallel lookups complete faster
correct: B
explanation: "A global content cache separates concerns: the feed cache stores per-user post ID lists (small, cheap to update), while the content cache stores post objects globally (deduplicated, one entry per post). Batch-fetching from the content cache is fast because it avoids N round-trips. Cache invalidation is simple—just delete or update the single entry keyed by post ID. Storing full objects in the per-user feed cache (A) causes massive duplication and makes updates expensive."
trade_offs: "The content cache adds another infrastructure component and must handle cache misses gracefully (fall through to database). There is also a brief inconsistency window between a post update and cache invalidation. However, the deduplication and simple invalidation model make this the standard approach."
difficulty: 3

### Q9
type: scenario
stem: "Your platform has grown to 500 million users. The fan-out-on-write pipeline for regular users is falling behind—some followers see new posts minutes late. Step 1: Identify the bottleneck: a single queue processing fan-out tasks sequentially is too slow for peak posting rates. Step 2: Propose a scaling strategy for the fan-out pipeline. Step 3: Now consider that during the fan-out delay, a celebrity the user follows may have posted—how does your hybrid model ensure the celebrity's recent posts still appear in the feed despite the lag?"
options:
  - A: Scale the fan-out queue vertically by using a larger server; the hybrid model's celebrity pull ensures their posts always appear
  - B: Shard the fan-out pipeline by follower user ID ranges across multiple queue consumers; the hybrid model guarantees freshness for celebrity posts because they are pulled at read time independent of the push pipeline's lag
  - C: Abandon fan-out-on-write entirely and switch all users to fan-out-on-read with caching
  - D: Pre-compute all feeds during off-peak hours and serve stale feeds during traffic spikes
correct: B
explanation: "Sharding the fan-out pipeline by follower ID ranges allows parallel processing, scaling horizontally with traffic. Each shard handles a subset of followers, reducing per-shard load. The hybrid model's key strength here is that celebrity posts are never pushed—they are pulled at read time. So even if the push pipeline is lagging, a user's feed request will merge the (possibly stale) pushed feed with fresh celebrity posts pulled on-the-fly, ensuring timely content from high-value accounts."
trade_offs: "Sharding adds operational complexity (monitoring multiple shards, handling skew if some user ID ranges have denser follow graphs). During extreme push lag, non-celebrity posts may appear out of order relative to pulled celebrity posts. The merge step at read time must handle deduplication (a post might arrive via both push and pull if the push catches up mid-request)."
difficulty: 4
