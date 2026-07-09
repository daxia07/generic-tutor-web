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
type: fill-in-blank
stem: "The pattern where a single API endpoint handles requests for multiple microservices is called the ______ gateway pattern."
answers:
  - "API"
  - "api"
explanation: "An API gateway provides a single entry point for all microservice requests."
difficulty: 1
