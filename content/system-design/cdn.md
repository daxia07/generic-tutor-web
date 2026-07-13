# CDN (Content Delivery Network)

## Definition
A CDN is a geographically distributed network of edge servers that cache and serve content from locations close to users. It reduces latency, offloads origin servers, and improves availability by distributing content across multiple points of presence.

## Key Terms
- **Edge server**: CDN node closest to the user, serves cached content.
- **Origin server**: The source of truth — CDN fetches from origin on cache miss.
- **Pull CDN**: Edge fetches content from origin on first request (lazy).
- **Push CDN**: Content is proactively uploaded to edge servers (eager).
- **Cache-Control headers**: HTTP headers that control CDN caching behavior (max-age, no-cache).
- **Cache invalidation**: Purging or expiring cached content on CDN edges.
- **TTL (Time To Live)**: How long content stays cached on edge servers.
- **Cache hit ratio**: Percentage of requests served from cache — higher is better.
- **Signed URLs/Cookies**: CDN access control for private content.
- **DDoS protection**: CDN absorbs attack traffic across its distributed network.

## Why It Matters
CDNs are essential for any system serving static content (images, CSS, JS, video) or geographically distributed users. Interviewers expect you to propose CDNs early in system design discussions.

## Interview Questions
1. "How would you serve this content to users worldwide with low latency?"
2. "How do you handle cache invalidation on a CDN?"
3. "When would you use a push vs pull CDN?"

## Gotchas
- Cache invalidation across a global CDN takes time — design for eventual consistency.
- Dynamic content can't be cached — need to separate static and dynamic paths.
- CDN costs can spike with high traffic — monitor and set budget alerts.
- Cold start: first request to a new edge location hits origin (slow) — pre-warming helps.
- HTTPS/TLS termination at the edge is standard now — don't skip it.

## Questions

### Q1
type: multiple-choice
stem: "What is the primary purpose of a Content Delivery Network (CDN)?"
options:
  - A: Database replication
  - B: Reduce latency by serving content from edge locations
  - C: Message queuing
  - D: API gateway
correct: B
explanation: "CDNs serve content from geographically distributed edge servers, reducing latency for end users."
difficulty: 1

### Q2
type: scenario
stem: "Your SaaS application serves users globally. Users in APAC experience 500ms+ latency because all requests route to your US-East data center. How do you reduce latency to under 100ms for static assets?"
options:
  - A: Upgrade your US-East server to have more bandwidth
  - B: Deploy a CDN with edge nodes in APAC — serve static assets from the nearest point of presence
  - C: Move your entire data center to APAC
  - D: Compress all assets with gzip
correct: B
explanation: "A CDN caches static content (images, JS, CSS, videos) at edge locations worldwide. APAC users download from the nearest edge node (typically <50ms away) instead of crossing the Pacific to US-East."
trade_offs: "CDNs only help with cacheable content. Dynamic API responses still hit your origin. For dynamic content latency, consider edge computing (Cloudflare Workers, Lambda@Edge) or multi-region deployments."
difficulty: 1

### Q3
type: multiple-choice
stem: "Which type of content benefits MOST from CDN caching?"
options:
  - A: Real-time chat messages
  - B: Static assets (images, CSS, JS)
  - C: Database writes
  - D: WebSocket connections
correct: B
explanation: "Static assets are cacheable and benefit most from CDN edge caching. Dynamic content like chat requires real-time delivery."
difficulty: 1

### Q4
type: fill-in-blank
stem: "A ______ CDN proactively uploads content to edge servers before users request it, while a ______ CDN fetches content from the origin on the first request."
answers:
  - "push"
  - "pull"
explanation: "Push CDNs pre-populate edge servers with content (good for large files, releases). Pull CDNs fetch on first request and cache subsequently (good for long-tail content)."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid methods to invalidate cached content on a CDN?"
options:
  - A: Purge API call to remove specific URLs from edge caches
  - B: Reduce the Cache-Control max-age TTL and wait for expiration
  - C: Restart the origin server
  - D: Use versioned URLs (e.g., app.v2.js) to serve new content without invalidation
correct:
  - A
  - B
  - D
explanation: "Purge APIs remove content immediately (A). Reducing TTL lets content expire naturally (B). Versioned URLs bypass cache entirely since the URL is different (D). Restarting the origin server (C) has no effect on CDN edge caches — they still serve their cached copy."
difficulty: 2

### Q6
type: scenario
stem: "Your company releases a critical CSS update that fixes a layout bug. After deployment, some users still see the broken layout for up to 2 hours. Step 1: Identify why stale CSS persists. Step 2: Evaluate the trade-offs between purging and versioning. Step 3: Choose a long-term strategy to prevent this. What happened and what do you do?"
options:
  - A: The origin server is down — fix the deployment
  - B: CDN edge caches still serve the old CSS — short-term: purge the CDN cache; long-term: use content-hashed filenames (e.g., main.a3f2b1.css) so new deploys get new URLs automatically
  - C: Users need to hard-refresh their browsers
  - D: The CSS file is too large for the CDN to cache
correct: B
explanation: "Edge caches serve the old CSS until TTL expires or the cache is purged. Short-term fix: purge the CDN cache. Long-term fix: content-hashed filenames ensure every deploy generates a unique URL, bypassing both CDN and browser cache without explicit invalidation."
trade_offs: "Purging is immediate but requires manual intervention and doesn't fix browser caches. Content hashing is automatic and reliable but requires build pipeline changes and may increase storage if old assets aren't cleaned up. It also means HTML must always reference the latest hashed filename."
difficulty: 3

### Q7
type: scenario
stem: "You operate a video streaming platform. Popular videos are cached at CDN edges globally, but new or niche videos always have a slow first request (cache miss from edge → origin). Step 1: Identify the cold start problem. Step 2: Propose a strategy to warm edge caches for new content. Step 3: Decide what to do for niche content with very low traffic. What approach do you take?"
options:
  - A: Accept slow first requests — caching will handle it after the first view
  - B: Pre-warm (push) CDN caches for new releases, and accept cache misses for niche content since pre-warming everything is wasteful
  - C: Pre-warm all content to all edge locations regardless of popularity
  - D: Remove CDN — serve everything from origin
correct: B
explanation: "Pre-warming (pushing new content to edge caches before users request it) eliminates the cold start for anticipated popular content. For niche content, the cost of pre-warming to all edges outweighs the benefit — accept occasional cache misses and let the pull model handle it organically."
trade_offs: "Pre-warming popular content to all edges is expensive (bandwidth + storage). Pre-warming to select regional edges based on expected audience geography is more efficient. Niche content may never be cached at distant edges, but that's acceptable — the origin serves it directly for the few users who need it."
difficulty: 3

### Q8
type: scenario
stem: "Your application serves private user documents through a CDN. You need to ensure only authenticated users can access their own documents, while still benefiting from CDN caching. Step 1: Evaluate whether to cache private content at all. Step 2: Design an access control mechanism. Step 3: Consider what happens if a signed URL is leaked. What approach do you take?"
options:
  - A: Don't cache private content — serve everything from origin
  - B: Use signed URLs with short expiration times and restrict to specific IPs or user agents, allowing CDN to cache while enforcing access control
  - C: Use HTTP Basic Auth on the CDN
  - D: Cache everything publicly and rely on obscurity (unguessable URLs)
correct: B
explanation: "Signed URLs (or signed cookies) allow the CDN to cache and serve private content while restricting access. The URL includes a cryptographic signature and expiration time. Only users with the signed URL can access the content. Short TTL limits damage from leaked URLs, and IP/user-agent restrictions add another layer."
trade_offs: "Signed URLs add complexity (signing service, key rotation). Very short expiration means frequent re-signing. IP restrictions break for mobile users on changing IPs. Leaked signed URLs are valid until expiration — this is a trade-off between convenience and security. Origin shield can reduce origin load for private content."
difficulty: 4
