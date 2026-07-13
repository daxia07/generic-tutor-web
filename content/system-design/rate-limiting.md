# Rate Limiting

## Definition
Rate limiting controls the number of requests a client can make within a time window. It protects systems from abuse, ensures fair resource allocation, and prevents cascading failures during traffic spikes.

## Key Terms
- **Token bucket**: Tokens added at fixed rate, each request consumes a token. Allows bursts up to bucket size.
- **Leaky bucket**: Requests processed at constant rate, excess queued or dropped. Smooths traffic.
- **Fixed window**: Count requests in fixed time intervals (e.g., per minute). Simple but has boundary burst issue.
- **Sliding window log**: Track timestamps of each request — precise but memory-intensive.
- **Sliding window counter**: Hybrid — weighted count of current + previous window. Good balance.
- **429 Too Many Requests**: HTTP status code for rate-limited requests.
- **Retry-After header**: Tells client when they can retry.
- **Distributed rate limiting**: Counting across multiple servers — needs shared state (Redis).
- **Per-user vs per-IP vs per-API-key**: Different scoping strategies for rate limits.

## Why It Matters
Rate limiting is a security and reliability requirement for any public API. Interviewers ask this to test your understanding of algorithms and distributed systems — implementing rate limiting across multiple servers is a non-trivial problem.

## Interview Questions
1. "How would you implement rate limiting for an API?"
2. "What algorithm would you use and why?"
3. "How do you handle rate limiting across multiple servers?"

## Gotchas
- Fixed window has a burst problem: 100 req/min allows 200 requests in a 2-second span across window boundary.
- Distributed rate limiting with Redis has race conditions — use Lua scripts for atomicity.
- Rate limiting by IP is problematic behind NAT/VPN — many users share one IP.
- Need graceful degradation — return 429 with helpful headers, don't just drop connections.
- Consider different limits for different endpoints (read vs write, cheap vs expensive).

## Questions

### Q1
type: multiple-choice
stem: "Which rate limiting algorithm uses a sliding time window to provide smoother rate control?"
options:
  - A: Fixed window counter
  - B: Sliding window log
  - C: Token bucket
  - D: Leaky bucket
correct: B
explanation: "Sliding window log tracks timestamps of each request and counts within a sliding window, providing smooth rate control."
difficulty: 2

### Q2
type: fill-in-blank
stem: "The ______ bucket rate limiting algorithm adds tokens at a fixed rate and allows a burst up to the bucket capacity."
answers:
  - "token"
explanation: "Token bucket allows bursts up to bucket capacity while maintaining a long-term rate limit."
difficulty: 2

### Q3
type: select-all
stem: "Which are common rate limiting strategies?"
options:
  - A: Token bucket
  - B: Leaky bucket
  - C: Fixed window
  - D: Random drop
correct:
  - A
  - B
  - C
explanation: "Token bucket, leaky bucket, and fixed window are all standard rate limiting algorithms. Random drop is not."
difficulty: 2

### Q4
type: fill-in-blank
stem: "When a client exceeds the rate limit, the server should return HTTP status code ______ with a Retry-After header indicating when the client can try again."
answers:
  - "429"
  - "429 Too Many Requests"
explanation: "429 Too Many Requests is the standard HTTP status code for rate-limited responses. The Retry-After header tells the client how long to wait, enabling graceful backoff instead of aggressive retries."
difficulty: 2

### Q5
type: select-all
stem: "Which are valid scoping strategies for rate limiting in a multi-tenant API?"
options:
  - A: Per-user (authenticated user ID)
  - B: Per-IP address
  - C: Per-API-key
  - D: Per-request-body-size
correct:
  - A
  - B
  - C
explanation: "Per-user, per-IP, and per-API-key are standard rate limiting scopes. Each has trade-offs: per-user is most fair, per-IP is problematic behind NAT, per-API-key works well for B2B. Body size is not a rate limiting scope."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your API uses a fixed window rate limiter set to 100 requests per minute. Step 2: A client sends 100 requests at 11:00:59 and another 100 requests at 12:00:01. Step 3: The client has effectively sent 200 requests in 2 seconds. What is this problem called and how do you fix it?"
options:
  - A: Thundering herd — use jitter in retry backoff
  - B: Boundary burst (window boundary problem) — switch to sliding window counter or sliding window log
  - C: Race condition — use Lua scripts for atomicity
  - D: Cache stampede — use request coalescing
correct: B
explanation: "Fixed window counters allow a burst of 2x the limit at window boundaries: 100 at the end of one window + 100 at the start of the next. Sliding window counter (weighted average of current + previous window) or sliding window log (exact timestamp tracking) eliminate this."
trade_offs: "Sliding window log is precise but memory-intensive (stores every request timestamp). Sliding window counter is a good balance — slightly less precise but far more memory-efficient. Choose based on your precision vs resource requirements."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: You need to implement distributed rate limiting across 10 API servers using Redis. Step 2: Two concurrent requests arrive on different servers, both read the current count as 99 (limit is 100), both increment to 100, and both allow the request through. Step 3: The actual count is now 101 — the limit was exceeded. How do you prevent this?"
options:
  - A: Use application-level mutexes to lock the Redis key before each read
  - B: Use Redis Lua scripts to atomically read-and-increment the counter in a single operation
  - C: Increase the limit to 110 to account for race conditions
  - D: Use eventual consistency — a small overage is acceptable
correct: B
explanation: "Redis Lua scripts execute atomically — the read-and-increment happens as a single Redis operation, preventing race conditions. This is the standard approach for distributed rate limiting with Redis."
trade_offs: "Lua scripts add complexity and couple your rate limiting logic to Redis. They also execute on Redis's single thread, so long-running scripts can block other Redis operations. Keep scripts short and efficient. For extremely high throughput, consider a dedicated rate limiting service or client-side token buckets."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Your SaaS platform has free-tier users (100 req/min) and premium users (1000 req/min). Step 2: You rate limit by IP, but many free-tier users share a corporate NAT gateway. Step 3: One heavy free-tier user exhausts the IP-based limit, blocking all other users behind the same NAT. How do you redesign the rate limiting?"
options:
  - A: Increase the per-IP limit to accommodate NAT users
  - B: Rate limit by authenticated user ID instead of IP, with different tiers mapped to different limits
  - C: Add a CAPTCHA for users behind detected NAT gateways
  - D: Rate limit by IP and also by User-Agent string
correct: B
explanation: "Rate limiting by authenticated user ID (from JWT/session) properly scopes limits to individuals, not IP addresses. Different tiers get different limits. This eliminates the NAT sharing problem entirely."
trade_offs: "User-based rate limiting requires authentication for all endpoints, including public ones — you may need a fallback strategy for unauthenticated requests (e.g., stricter per-IP limits for anonymous traffic, per-user limits after auth). It also means token theft allows rate limit theft."
difficulty: 4
