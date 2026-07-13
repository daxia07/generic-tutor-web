# API Gateway

## Definition
An API Gateway is a single entry point for all client requests in a microservice architecture. It handles cross-cutting concerns like authentication, rate limiting, request routing, and response transformation before forwarding requests to the appropriate backend services.

## Key Terms
- **Request routing**: Directing requests to the correct backend service based on path, headers, etc.
- **Authentication/Authorization**: Verifying identity and permissions at the gateway level.
- **Rate limiting**: Enforcing request quotas per client/API key.
- **Request/response transformation**: Modifying headers, body format, or protocol.
- **API versioning**: Routing to different backend versions (v1, v2) based on path or header.
- **Backend for Frontend (BFF)**: Separate gateway per client type (mobile, web, IoT).
- **Service composition**: Aggregating responses from multiple services into one response.
- **Circuit breaking**: Preventing cascading failures by stopping requests to unhealthy services.
- **Kong, AWS API Gateway, Envoy**: Common gateway implementations.

## Why It Matters
API Gateways are the front door of microservice architectures. They centralize concerns that would otherwise be duplicated across services. Interviewers test whether you understand what belongs at the gateway vs in the service.

## Interview Questions
1. "How would you design the API layer for this microservice system?"
2. "What logic belongs in the gateway vs in the service?"
3. "How do you handle API versioning?"

## Gotchas
- The gateway can become a bottleneck or single point of failure — need redundancy and scaling.
- Don't put business logic in the gateway — it's for cross-cutting concerns only.
- BFF pattern adds complexity but improves client experience — worth it for mobile/web split.
- Gateway adds latency — keep it thin. Heavy transformation slows everything down.
- API versioning strategy matters: URL path (/v1/) vs header vs query param — each has trade-offs.

## Questions

### Q1
type: multiple-choice
stem: "Which is NOT a typical responsibility of an API gateway?"
options:
  - A: Rate limiting
  - B: Request routing
  - C: Business logic
  - D: Authentication
correct: C
explanation: "API gateways handle cross-cutting concerns like routing, auth, and rate limiting. Business logic belongs in backend services."
difficulty: 1

### Q2
type: select-all
stem: "Which are common API gateway features?"
options:
  - A: SSL termination
  - B: Request transformation
  - C: Circuit breaking
  - D: Data persistence
correct:
  - A
  - B
  - C
explanation: "API gateways handle SSL termination, request/response transformation, and circuit breaking. Data persistence is not a gateway concern."
difficulty: 2

### Q3
type: scenario
stem: "You have 10 microservices, each with its own authentication logic. Mobile clients must make multiple calls and handle auth separately for each. How do you unify access?"
options:
  - A: Add auth to each service and let clients manage tokens
  - B: Use an API Gateway as a single entry point that handles authentication and routes to services
  - C: Use a shared database for auth that all services query
  - D: Implement OAuth on the client side
correct: B
explanation: "An API Gateway centralizes cross-cutting concerns like authentication, rate limiting, and routing. Clients call one endpoint; the gateway validates auth and forwards to the right service."
trade_offs: "The API Gateway becomes a single point of failure and can add latency. Use it for cross-cutting concerns but keep service-specific logic in the services themselves."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The API Gateway pattern where each client type (mobile, web, IoT) gets its own dedicated gateway optimized for its specific needs is called ______."
answers:
  - "Backend for Frontend"
  - "Backend for Frontends"
  - "BFF"
  - "backends for frontends"
  - "backend for frontend"
explanation: "Backend for Frontend (BFF) provides separate gateway instances per client type, each tailored to that client's data and protocol needs, avoiding a one-size-fits-all gateway."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid strategies for API versioning through a gateway?"
options:
  - A: Include version in the URL path (e.g., /v1/resource)
  - B: Use a custom request header (e.g., X-API-Version: 2)
  - C: Use a different domain per version (e.g., v2.api.example.com)
  - D: Use the database schema version as the API version
correct:
  - A
  - B
  - C
explanation: "URL path versioning (A), header versioning (B), and subdomain versioning (C) are all valid API versioning strategies. Database schema version (D) is an internal concern that should not be exposed to API consumers."
difficulty: 2

### Q6
type: scenario
stem: "Your API gateway routes requests to 15 microservices. One service handling payments starts returning 500 errors, and the gateway keeps forwarding requests to it, causing cascading timeouts across the system. Step 1: Identify the missing gateway feature. Step 2: Explain how it prevents the cascading failure. What should you implement?"
options:
  - A: Add rate limiting to slow down all traffic
  - B: Implement circuit breaking — the gateway detects failures and stops routing to the unhealthy service, returning a fallback response
  - C: Remove the payment service from the gateway permanently
  - D: Increase the gateway timeout to give the service more time
correct: B
explanation: "Circuit breaking detects when a service is unhealthy (e.g., consecutive failures exceed a threshold) and stops sending traffic to it, returning a fast fallback or error. This prevents cascading failures and gives the unhealthy service time to recover."
trade_offs: "Circuit breakers add complexity: you must tune thresholds (failure count, reset interval), implement fallback logic, and handle the 'half-open' state carefully. Too aggressive tripping causes unnecessary outages; too lenient doesn't protect against cascading failures."
difficulty: 3

### Q7
type: scenario
stem: "Your mobile app needs a lightweight API that returns only the fields a phone screen displays, while your web app needs a richer response with additional data. Both hit the same gateway. Step 1: Evaluate whether a single gateway can serve both well. Step 2: Identify the pattern that solves this. Step 3: Consider the operational cost of your choice. What approach do you take?"
options:
  - A: Use one gateway and add a query parameter for response size
  - B: Use the BFF pattern — deploy separate gateways for mobile and web, each returning only what its client needs
  - C: Have the mobile app ignore fields it doesn't need from the full web response
  - D: Use GraphQL through a single gateway so clients request exactly what they need
correct: B
explanation: "The BFF (Backend for Frontend) pattern deploys a dedicated gateway per client type. Each BFF fetches only the data its client needs, reducing payload size and latency for mobile. It also allows independent evolution of each client's API."
trade_offs: "BFF adds operational overhead: more services to deploy, monitor, and maintain. Changes to shared backend services may need coordinated updates across multiple BFFs. Use BFF only when client needs genuinely diverge — if a simple field filter suffices, start there."
difficulty: 3

### Q8
type: scenario
stem: "Your startup runs 3 microservices behind an API gateway. As you scale to 20 services, the gateway configuration file grows large and deployments risk breaking unrelated routes. Step 1: Identify the architectural smell. Step 2: Evaluate centralized vs decentralized gateway approaches. Step 3: Propose a strategy that balances governance with team autonomy. What do you do?"
options:
  - A: Keep one monolithic gateway config — consistency is worth the coupling
  - B: Split into domain-specific gateways (e.g., payments gateway, user gateway), each owned by its team, with a shared global gateway for cross-cutting concerns
  - C: Eliminate the gateway entirely and let each service expose its own API
  - D: Use a service mesh and remove the API gateway layer
correct: B
explanation: "A monolithic gateway config becomes a deployment bottleneck and creates coupling between unrelated teams. Domain-specific gateways (federated gateway pattern) let each team own their routing and transformations, while a thin global gateway handles cross-cutting concerns like auth and rate limiting."
trade_offs: "Federated gateways require a shared platform strategy (consistent auth, logging, monitoring) and a way to present a unified API surface to clients. More gateways mean more infrastructure, but each is simpler. Without a platform team enforcing standards, you risk inconsistent policies across gateways."
difficulty: 4
