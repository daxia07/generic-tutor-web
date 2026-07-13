# Design a Search System

## Definition
A search system is a distributed infrastructure that crawls, indexes, and ranks documents to enable users to retrieve relevant results via keyword queries, often with real-time autocomplete suggestions. It encompasses a crawling pipeline that ingests web pages, an indexing subsystem that builds inverted indices and prefix trees, a ranking engine that scores results by relevance and authority, and a query-serving layer that returns sorted results with low latency at massive scale.

## Key Terms
- **Inverted Index**: A mapping from terms to the list of documents containing them, the core data structure for keyword search.
- **Trie**: A prefix tree used for efficient autocomplete and prefix-matching queries.
- **TF-IDF**: Term Frequency–Inverse Document Frequency, a statistic reflecting how important a word is to a document relative to a corpus.
- **PageRank**: An algorithm that ranks documents based on the quantity and quality of links pointing to them.
- **Sharding by Document Hash**: Partitioning the index such that each shard contains a subset of documents with all their terms; requires scatter-gather on query.
- **Sharding by Term**: Partitioning the index such that each shard owns a subset of terms with all their posting lists; queries route to specific shards.
- **Crawling Pipeline**: A system of URL frontier, downloader, parser, and URL extractor that continuously discovers and fetches web pages.
- **Real-time Indexing**: Updating the search index immediately as documents change, trading consistency and complexity for freshness.
- **Batch Indexing**: Periodically rebuilding or updating the index in bulk, trading freshness for simplicity and throughput.

## Why It Matters
Search is one of the most foundational systems on the internet—every major technology company operates a search service at enormous scale. Designing one requires balancing latency, relevance, freshness, and cost across distributed components, making it a rich interview topic that exercises knowledge of data structures, distributed systems, and information retrieval.

Understanding search system design also provides transferable lessons for any system that must serve low-latency reads over large datasets with ranking logic, from e-commerce product search to log analytics dashboards.

## Interview Questions
1. "How would you design the indexing pipeline for a search engine that must handle billions of documents?"
2. "How do you implement autocomplete that returns suggestions in under 50 milliseconds?"
3. "What are the trade-offs between sharding a search index by document hash versus by term?"
4. "How would you handle real-time updates to the search index without degrading query latency?"

## Gotchas
- Forgetting that sharding by document hash requires querying every shard for each search request (scatter-gather).
- Assuming TF-IDF alone is sufficient for ranking without considering link-based authority signals like PageRank.
- Overlooking that autocomplete tries can grow very large in memory and need sharding or compression strategies.
- Neglecting to handle duplicate or near-duplicate documents in the crawling pipeline.
- Confusing real-time indexing (immediate visibility) with near-real-time indexing (delayed but frequent commits).

## Questions

### Q1
type: multiple-choice
stem: "Which data structure is most directly used to map a search term to the list of documents containing that term?"
options:
  - A: B-tree
  - B: Inverted index
  - C: Trie
  - D: Hash map from document ID to content
correct: B
explanation: "An inverted index maps terms to posting lists of document IDs, which is the core lookup structure for keyword search."
difficulty: 1

### Q2
type: multiple-choice
stem: "When a search index is sharded by term, which of the following is a key advantage over sharding by document hash?"
options:
  - A: Each shard can store complete documents for faster retrieval
  - B: A query for a specific term can be routed to a single shard instead of all shards
  - C: Index updates require touching only one shard per document
  - D: Load is more evenly distributed across shards for all query patterns
correct: B
explanation: "Sharding by term assigns each term to a specific shard, so a query containing those terms can target only the relevant shards rather than broadcasting to every shard as required with document-hash sharding."
difficulty: 2

### Q3
type: fill-in-blank
stem: "The ranking algorithm that scores a document higher when many high-quality pages link to it is called ______."
answers:
  - "PageRank"
  - "page rank"
  - "pagerank"
explanation: "PageRank ranks documents higher when they receive more links from other high-quality pages, treating links as votes of authority—pages linked by many authoritative sources receive higher scores."
difficulty: 1

### Q4
type: fill-in-blank
stem: "A data structure that enables efficient prefix matching for autocomplete suggestions is called a ______."
answers:
  - "trie"
  - "prefix tree"
  - "digital tree"
  - "radix tree"
explanation: "A trie (prefix tree) stores characters along its edges so that all strings sharing a prefix also share a path, enabling efficient O(k) prefix lookups where k is the query length—ideal for autocomplete."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid strategies to reduce autocomplete latency? Select all that apply."
options:
  - A: Pre-compute top suggestions at each trie node and cache them
  - B: Shard the trie across multiple servers by prefix range
  - C: Store the full inverted index on each autocomplete server
  - D: Use a bloom filter to check document existence before returning suggestions
  - E: Keep the trie in memory rather than on disk
correct:
  - A
  - B
  - E
explanation: "Pre-computing top suggestions avoids traversing sub-trees at query time, sharding by prefix distributes load, and in-memory storage eliminates disk I/O latency. Storing the full inverted index is unnecessary for autocomplete (which only needs the trie), and bloom filters do not help with autocomplete latency."
difficulty: 3

### Q6
type: scenario
stem: "You are designing a search system for a web-scale search engine. The index must support 100 billion documents and queries should return in under 200 ms. Step 1: Decide how to shard the inverted index. Step 2: Explain how a query is routed and executed across shards. Step 3: Describe how results are merged and ranked."
explanation: "Shard by document hash for even storage distribution, route queries to all shards via scatter-gather, then merge and rank results at the query layer by combining partial result sets from each shard and re-sorting by global relevance score."
  trade_offs: "Sharding by term enables targeted routing but creates hot spots for popular terms; sharding by document hash distributes storage evenly but requires scatter-gather across all shards increasing tail latency."
difficulty: 3

### Q7
type: scenario
stem: "Your company wants to add autocomplete to its search bar with a latency budget of 30 ms. Step 1: Choose the data structure for prefix matching. Step 2: Describe how to keep latency low even for popular short prefixes like 'a' or 'th'. Step 3: Explain how the autocomplete index is updated when new trending queries emerge."
explanation: "Use a trie for prefix matching with pre-computed top-K suggestions cached at each node to avoid sub-tree traversal at query time; for popular short prefixes, shard the trie by prefix range across servers and keep everything in memory to stay within the 30 ms budget."
  trade_offs: "Pre-computing top-K results at each node reduces per-query work but increases memory and update cost; sharding by prefix distributes load but adds network hops; real-time updates to the trie improve freshness but risk inconsistency."
difficulty: 3

### Q8
type: scenario
stem: "You must design the crawling pipeline for a search engine that indexes the web continuously. Step 1: Describe the major components of the pipeline from URL discovery to indexable content. Step 2: Explain how you avoid crawling duplicate or near-duplicate pages. Step 3: Describe how crawl priority and politeness (rate limiting) are enforced."
explanation: "The pipeline consists of a URL frontier (priority queue), a downloader (fetcher), a parser that extracts content and links, and a URL extractor that feeds new links back into the frontier. Deduplicate using content checksums and URL normalization; enforce politeness via per-domain rate limiting and respect for robots.txt crawl-delay directives."
  trade_offs: "A large URL frontier ensures coverage but consumes memory; aggressive deduplication saves bandwidth but may miss nuance in near-duplicates; respecting crawl delays is polite but slows freshness for fast-updating sites."
difficulty: 4

### Q9
type: scenario
stem: "Your search system currently uses batch indexing that rebuilds the index every 6 hours. A product requirement now demands that newly published documents appear in search results within 1 minute. Step 1: Propose an architecture that supports near-real-time indexing without degrading query throughput. Step 2: Explain how the new indexing path coexists with the existing batch path. Step 3: Describe how you handle the trade-off between index freshness and query performance."
explanation: "Implement a dual-path architecture: a near-real-time indexing path that writes small delta segments within seconds of publication, alongside the existing batch path that periodically merges deltas into the main index. Queries search both the main index and the recent delta segments, then merge results."
  trade_offs: "Real-time indexing provides freshness but introduces write amplification and potential consistency issues where partially indexed documents appear in results; maintaining separate real-time and batch segments avoids disrupting the main index but requires merging and increases query-time complexity."
difficulty: 4
