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
