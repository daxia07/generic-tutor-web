# Design a Web Crawler

## Definition
A web crawler (also known as a spider or bot) is a system that systematically browses the World Wide Web, starting from a set of seed URLs, downloading web pages, extracting links, and queuing those links for further crawling. At Google scale, a crawler must be distributed across many machines, respect per-domain politeness rules, avoid re-crawling duplicate content, and continuously refresh pages to keep the index up to date—all while processing billions of pages.

## Key Terms
- **URL Frontier**: A priority queue (or set of queues) that holds URLs waiting to be crawled, typically organized by domain to enforce politeness.
- **Politeness Policy**: Rules that govern how frequently a crawler may hit a given domain, including respect for robots.txt and crawl-delay directives.
- **Bloom Filter**: A space-efficient probabilistic data structure used to test whether a URL has already been seen, with a controllable false-positive rate.
- **URL Seen Set**: A distributed set (often backed by a Bloom filter or key-value store) that tracks which URLs have already been discovered to avoid redundant crawls.
- **Crawl Scheduling**: The strategy that determines when to re-crawl a page based on its estimated change frequency and importance.
- **DNS Cache**: A local cache of DNS resolutions to avoid repeated lookups, which can become a bottleneck at scale.
- **Robots.txt**: A standard file at the root of a website that specifies which paths crawlers are allowed or disallowed from accessing.
- **Content Checksum**: A hash (e.g., MD5, SHA-1) of a page's content used to detect duplicates or unchanged pages without storing the full content.
- **Mercator Crawling Model**: A well-known architecture that separates crawling into distinct modules: frontier, DNS resolver, fetcher, parser, and URL seen test.

## Why It Matters
Web crawlers are the backbone of search engines, enabling the discovery and indexing of the internet's content. Designing a crawler that scales to billions of pages requires careful trade-offs between crawl speed, politeness, storage efficiency, and freshness. In interviews, this problem tests a candidate's ability to reason about distributed coordination, rate limiting, probabilistic data structures, and scheduling—all of which are transferable to many other large-scale systems.

The design also surfaces classic distributed systems challenges: how to partition work across nodes, how to avoid duplicate effort without a single point of failure, and how to handle unreliable or adversarial web servers. A well-designed crawler must be robust against spider traps, infinite redirect chains, and恶意 sites that serve different content to bots.

## Interview Questions
1. "How would you design the URL frontier to ensure both politeness and priority-based crawling?"
2. "How do you avoid crawling the same URL twice in a distributed system?"
3. "What strategies would you use to keep crawled content fresh?"
4. "How would you handle pages that require JavaScript execution to render their content?"

## Gotchas
- Ignoring robots.txt or crawl-delay, which can get your crawler IP-banned or considered hostile.
- Using a single global queue without per-domain partitioning, leading to impolite burst requests to one host.
- Relying solely on Bloom filters for deduplication without handling false positives, which can cause legitimate URLs to be skipped permanently.
- Failing to detect and escape spider traps (e.g., calendars that generate infinite date pages).
- Treating all pages as equal in re-crawl frequency; high-traffic news sites change far more often than archived pages.
- Overlooking DNS resolution as a bottleneck; without caching, each URL fetch requires a DNS lookup.

## Questions

### Q1
type: multiple-choice
stem: "Which data structure is most commonly used to efficiently check whether a URL has already been discovered in a large-scale crawler?"
options:
  - A: Hash map stored entirely in memory
  - B: Bloom filter
  - C: Binary search tree on disk
  - D: Consistent hash ring
correct: B
explanation: "A Bloom filter provides constant-time membership testing with minimal memory overhead, making it ideal for the URL seen set at scale. A full hash map would require far more memory, and the probabilistic nature of Bloom filters is acceptable because a false positive only causes a URL to be skipped, not crawled incorrectly."
difficulty: 1

### Q2
type: multiple-choice
stem: "In the Mercator-style crawler architecture, what is the primary reason for organizing the URL frontier into per-host queues?"
options:
  - A: To prioritize high-PageRank URLs over low-PageRank ones
  - B: To enforce politeness by ensuring a single worker does not hit the same host too rapidly
  - C: To reduce DNS resolution overhead by batching URLs from the same domain
  - D: To simplify content deduplication by grouping identical pages together
correct: B
explanation: "Per-host queues are the core mechanism for politeness: they allow the crawler to dequeue URLs at a rate the host can tolerate. While batching DNS lookups (C) is a secondary benefit, the primary purpose is avoiding overload on any single web server."
difficulty: 2

### Q3
type: fill-in-blank
stem: "A ________ is a space-efficient probabilistic data structure used to test set membership; in a web crawler it is commonly used for the URL seen set to avoid re-crawling already-discovered URLs."
answers:
  - "Bloom filter"
  - "Bloom filters"
  - "bloom filter"
  - "bloom filters"
explanation: "A Bloom filter provides space-efficient probabilistic membership testing, making it ideal for the URL seen set—it can quickly determine that a URL has likely already been discovered, avoiding redundant crawls while using minimal memory."
difficulty: 1

### Q4
type: fill-in-blank
stem: "The file ________ placed at the root of a website specifies which URL paths a crawler is allowed or disallowed from accessing."
answers:
  - "robots.txt"
  - "ROBOTS.TXT"
  - "Robots.txt"
explanation: "robots.txt is the standard file placed at a website's root that specifies which URL paths crawlers may or may not access, and it must be respected to avoid being IP-banned or considered a hostile crawler."
difficulty: 1

### Q5
type: select-all
stem: "Which of the following are valid strategies for optimizing or handling DNS resolution in a large-scale distributed crawler?"
options:
  - A: Maintaining a local DNS cache on each crawler node
  - B: Running a dedicated DNS resolver service with its own cache
  - C: Performing a fresh DNS lookup for every single URL fetch to ensure accuracy
  - D: Pre-fetching and batching DNS resolutions for URLs in the frontier
correct:
  - A
  - B
  - D
explanation: "Local caching (A) and a dedicated resolver (B) avoid repeated round-trips to DNS servers. Batching pre-fetches (D) amortizes latency. Performing a fresh lookup for every fetch (C) is far too expensive at scale and would make DNS a severe bottleneck."
difficulty: 2

### Q6
type: scenario
stem: "You are designing a distributed crawler that must process 10 billion pages. Step 1: Consider how to partition the URL frontier across crawler nodes so that no two nodes crawl the same host simultaneously. Step 2: Decide how each node will coordinate with others to maintain the URL seen set and avoid duplicate crawls. What partitioning and coordination strategy would you choose?"
answer: Partition the URL frontier by hashing the host/domain name to assign all URLs for a given host to a single crawler node; use a distributed key-value store (e.g., Redis cluster) or a shared Bloom filter with periodic merge to maintain the URL seen set across nodes.
explanation: "Partition the URL frontier by hashing the host/domain name so all URLs for a given host go to a single crawler node (ensuring politeness), and use a distributed key-value store or shared Bloom filter with periodic merges to maintain the URL seen set across nodes."
  trade_offs: "Hash-based host partitioning guarantees politeness per host but can cause load imbalance if some domains have many more URLs than others. A distributed KV store for the URL seen set provides strong consistency but adds latency and a potential bottleneck; a Bloom filter with periodic merging is faster and more memory-efficient but allows temporary duplicates due to staleness and false positives."
difficulty: 2

### Q7
type: scenario
stem: "Your crawler keeps falling into spider traps—pages that generate infinite links (e.g., a calendar with /calendar/2024/01, /calendar/2024/02, ...). Step 1: Identify the signals that would help you detect a spider trap. Step 2: Design a mechanism to escape or avoid the trap once detected. How would you implement this?"
answer: Detect traps by monitoring per-host crawl depth or the ratio of discovered URLs to unique content checksums; set a maximum crawl depth per host or a cap on the number of URLs crawled from a single domain, and blacklist detected trap patterns using URL regular expressions.
explanation: "Detect spider traps by monitoring per-host crawl depth or the ratio of discovered URLs to unique content checksums—an unusually high ratio signals a trap. Escape by setting a maximum crawl depth per host or a cap on URLs crawled per domain, and blacklist detected trap patterns."
  trade_offs: "A depth limit is simple and effective but may cut off legitimate deep sites (e.g., large forums). Content-checksum-based detection is more accurate but requires fetching and hashing pages, adding cost. Domain-level caps risk missing valid sub-sections of very large sites. Regex blacklists require manual maintenance and can be brittle."
difficulty: 3

### Q8
type: scenario
stem: "You need to decide when to re-crawl pages to keep your index fresh. Step 1: Determine what factors influence how frequently a page should be re-crawled. Step 2: Design a re-crawl scheduling policy that balances freshness with limited crawl bandwidth. What policy would you implement?"
answer: Track each page's historical change frequency and assign a re-crawl interval inversely proportional to it (e.g., pages that changed daily get re-crawled daily); weight by page importance (PageRank or traffic); use a priority queue in the frontier where re-crawl URLs compete with new URLs based on estimated value.
explanation: "Re-crawl frequency should be inversely proportional to historical change frequency and weighted by page importance (e.g., PageRank or traffic). Use a priority queue where re-crawl URLs compete with new URLs based on estimated value, ensuring important, frequently-changing pages are refreshed more often."
  trade_offs: "Frequent re-crawls of important pages improve freshness but consume bandwidth that could discover new content. Relying on historical change frequency assumes past behavior predicts future changes, which breaks for unpredictable sites. A single priority queue mixing new and re-crawl URLs requires a value function that is hard to tune; separate queues risk starvation of one category."
difficulty: 3

### Q9
type: scenario
stem: "An increasing fraction of the web relies on JavaScript to render meaningful content, but your fetcher only retrieves raw HTML. Step 1: Evaluate the options for handling JS-rendered pages (headless browser, pre-rendering service, selective rendering). Step 2: Decide which pages should receive the expensive JS-rendering treatment and which can rely on static HTML. Design the decision pipeline."
answer: Run a lightweight check on the raw HTML (e.g., presence of script tags with framework indicators like React/Next.js, or meta tags indicating client-side rendering); route JS-heavy pages to a headless browser pool (e.g., Puppeteer) for rendering; cache rendered content; use static fetch for all other pages to save resources.
explanation: "Use a lightweight heuristic on raw HTML (e.g., detecting framework-specific script tags or meta tags indicating client-side rendering) to route JS-heavy pages to a headless browser pool for rendering, while fetching all other pages statically to save resources."
  trade_offs: "Rendering every page in a headless browser is 10-100x more expensive than static fetch, so selective routing is essential. Heuristic detection may miss pages that require JS or over-render pages that are static but happen to include script tags. A dedicated render pool adds operational complexity and latency. Caching rendered output helps amortize cost but raises staleness concerns for dynamic content."
difficulty: 4
