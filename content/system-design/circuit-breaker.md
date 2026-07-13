# Circuit Breaker

## Definition
A resilience pattern that prevents cascading failures in distributed systems. When a downstream service fails repeatedly, the circuit breaker "opens" and immediately fails subsequent requests without calling the failing service. After a timeout, it enters a "half-open" state, allowing a few test requests through to check if the service has recovered.

## Key Terms
- **Closed state**: Normal operation — requests pass through to the downstream service.
- **Open state**: Circuit tripped — requests fail immediately without calling downstream.
- **Half-open state**: Testing recovery — limited requests allowed through to probe health.
- **Failure threshold**: Number of failures before the circuit opens (e.g., 5 failures in 60 seconds).
- **Timeout**: Duration the circuit stays open before transitioning to half-open.
- **Fallback**: Alternative response when circuit is open (cached data, default value, error message).
- **Bulkhead pattern**: Isolating failures to prevent one failing service from consuming all resources.
- **Hystrix (legacy), Resilience4j, Polly**: Popular circuit breaker implementations.

## Why It Matters
In microservice architectures, one failing service can cascade and bring down the entire system. Circuit breakers isolate failures and enable graceful degradation. Interviewers test this to see if you design for failure.

## Interview Questions
1. "Service B is slow and causing Service A to hang. How do you fix this?"
2. "How would you prevent cascading failures in this architecture?"
3. "What's the difference between a circuit breaker and a timeout?"

## Gotchas
- Setting the failure threshold too low causes unnecessary circuit opens.
- Not having a fallback means the user just gets an error — consider degraded responses.
- Circuit breakers don't fix the underlying problem — they buy time. You still need monitoring and alerting.
- Half-open state needs careful tuning — too many test requests overwhelm a recovering service.
- Combine with retries (with exponential backoff) for transient failures, but don't retry on circuit open.

## Questions

### Q1
type: multiple-choice
stem: "In which state does a circuit breaker immediately reject requests without calling the downstream service?"
options:
  - A: Closed
  - B: Open
  - C: Half-open
  - D: Recovering
correct: B
explanation: "In the Open state, the circuit breaker rejects all requests immediately, giving the downstream service time to recover."
difficulty: 2

### Q2
type: order
stem: "Order the circuit breaker states as they typically cycle during a failure → recovery scenario:"
items:
  - "Closed"
  - "Open"
  - "Half-Open"
correct_order: [0, 1, 2]
explanation: "Closed (normal) → Open (failures detected, reject all) → Half-Open (test if recovered)."
difficulty: 2

### Q3
type: fill-in-blank
stem: "The ______ state allows a limited number of test requests through to check if the downstream service has recovered."
answers:
  - "half-open"
  - "half open"
explanation: "Half-open state allows a few test requests to probe if the service is healthy again."
difficulty: 2

### Q4
type: fill-in-blank
stem: "A ______ is an alternative response served when the circuit breaker is open, such as cached data or a default value."
answers:
  - "fallback"
  - "fallback response"
  - "fallback value"
  - "graceful degradation"
explanation: "Fallbacks provide graceful degradation when the circuit is open — returning cached data, default values, or meaningful error messages instead of a hard failure."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid concerns when configuring a circuit breaker's failure threshold?"
options:
  - A: Threshold too low causes unnecessary circuit opens from transient errors
  - B: Threshold too high allows prolonged cascading failures
  - C: The threshold should be the same for all services regardless of traffic volume
  - D: The time window for counting failures matters (e.g., 5 failures in 60s vs 5 failures in 1s)
correct:
  - A
  - B
  - D
explanation: "A too-low threshold trips the circuit on normal fluctuations (A). A too-high threshold lets failures cascade too long (B). The time window is critical — 5 failures in 1 second is very different from 5 failures in 60 seconds (D). Thresholds should be tuned per-service based on traffic patterns, not set uniformly (C is wrong)."
difficulty: 2

### Q6
type: scenario
stem: "Service A calls Service B through a circuit breaker. The circuit opens after 5 timeouts in 30 seconds. Your monitoring shows Service B recovers in ~2 minutes. Step 1: Determine how long the circuit should stay open before transitioning to half-open. Step 2: Consider what happens if the timeout is set too short. Step 3: Decide how many test requests to allow in half-open state. What configuration do you choose?"
options:
  - A: Open for 30 seconds, allow 50% of requests in half-open
  - B: Open for 2 minutes (matching recovery time), allow a small number of test requests (e.g., 1-5) in half-open
  - C: Open for 10 minutes to be safe, allow all requests in half-open
  - D: Open for 5 seconds, allow all requests in half-open
correct: B
explanation: "The open timeout should roughly match the expected recovery time (~2 minutes) to avoid hammering a still-recovering service. In half-open, only a small number of test requests should be allowed — too many could overwhelm a service that hasn't fully recovered, causing it to fail again."
trade_offs: "A longer open timeout means users experience failures for longer even if the service has recovered. A shorter timeout risks re-opening the circuit repeatedly. Half-open with too many probes can cause oscillation between open and half-open states."
difficulty: 3

### Q7
type: scenario
stem: "Your payment service calls 3 downstream services: FraudCheck, InventoryReserve, and EmailNotify. FraudCheck starts returning errors, causing its circuit to open. Step 1: Determine which downstream failures should block the payment. Step 2: Decide if the EmailNotify circuit being open should fail the payment. Step 3: Design fallbacks for non-critical services. What do you do?"
options:
  - A: Open circuits on all 3 services block the payment — consistency first
  - B: FraudCheck circuit open blocks payment (critical), InventoryReserve blocks payment (critical), EmailNotify circuit open uses a fallback (queue email for async retry) and allows payment
  - C: All circuits open should allow payment with fallbacks for all
  - D: Only FraudCheck circuit matters — ignore the other two
correct: B
explanation: "Critical path services (FraudCheck, InventoryReserve) must succeed — their circuit opening should block the payment. Non-critical services (EmailNotify) can have fallbacks (queue the email, retry later) without blocking the core transaction. This is the bulkhead principle applied to circuit breakers."
trade_offs: "Queue-based fallbacks for non-critical services add infrastructure complexity (message queue) and eventual delivery isn't guaranteed if the queue fills. Blocking on critical services means the payment fails when downstream is unavailable, but this is preferable to processing fraudulent or oversold orders."
difficulty: 4

### Q8
type: scenario
stem: "A circuit breaker protecting an API gateway's calls to a backend service keeps oscillating between open and closed every few seconds. Step 1: Identify why the circuit keeps re-opening. Step 2: Evaluate the half-open configuration. Step 3: Propose a fix. What is likely happening?"
options:
  - A: The half-open state allows too many test requests, overwhelming the still-recovering service and causing it to fail again
  - B: The failure threshold is too high
  - C: The service is permanently down
  - D: The circuit breaker implementation has a bug
correct: A
explanation: "Oscillation (flapping) typically occurs when the half-open state allows too many test requests through, causing the still-recovering downstream service to be overwhelmed and fail again. This re-trips the circuit. Fix: reduce the number of half-open test requests, increase the open timeout, or add a slow ramp-up (gradually increase traffic in half-open)."
trade_offs: "Reducing half-open test requests means slower recovery detection. Increasing open timeout means longer user-facing failures. A slow ramp-up (e.g., 1 request, then 10%, then 50%) is more robust but adds implementation complexity. Monitoring and alerting on circuit state transitions helps detect flapping early."
difficulty: 3
