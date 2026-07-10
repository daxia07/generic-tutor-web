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
