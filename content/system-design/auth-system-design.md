# Authentication & Authorization Design

## Definition
Authentication and authorization design encompasses the architectures, protocols, and patterns used to verify user identity (authentication) and control access to resources (authorization) in distributed systems. It spans token-based and session-based approaches, federated identity protocols, access control models, and the operational concerns of key rotation, token lifecycle management, and service-to-service identity verification.

## Key Terms
- **OAuth 2.0**: An authorization framework that enables delegated access to resources without sharing credentials, defining grant types for different client types
- **JWT (JSON Web Token)**: A compact, self-contained token format that carries claims about an entity and is digitally signed for integrity verification
- **PKCE (Proof Key for Code Exchange)**: An OAuth 2.0 extension that prevents authorization code interception attacks by requiring a code verifier/challenge pair
- **RBAC (Role-Based Access Control)**: An access control model where permissions are assigned to roles, and users inherit permissions through role membership
- **ABAC (Attribute-Based Access Control)**: An access control model that evaluates attributes of the subject, resource, action, and environment to make authorization decisions
- **PBAC (Policy-Based Access Control)**: An access control model where externalized policies govern access decisions, enabling centralized policy management and auditing
- **SSO (Single Sign-On)**: An authentication pattern allowing users to authenticate once and access multiple trusted applications without re-entering credentials
- **SAML (Security Assertion Markup Language)**: An XML-based federation protocol for exchanging authentication and authorization assertions between identity and service providers
- **OIDC (OpenID Connect)**: An identity layer on top of OAuth 2.0 that provides user authentication and identity information via ID tokens and a userinfo endpoint
- **mTLS (Mutual TLS)**: A TLS handshake variant where both client and server present certificates, enabling strong service-to-service authentication
- **Token Introspection**: An OAuth 2.0 mechanism (RFC 7662) that allows resource servers to query an authorization server about a token's active state and metadata
- **Token Refresh Rotation**: A security practice where each use of a refresh token issues a new refresh token and invalidates the old one, limiting the window for token theft

## Why It Matters
Authentication and authorization form the foundational security boundary of any system. A flawed design can lead to unauthorized data access, privilege escalation, or token leakage that compromises entire user populations. As systems grow from monoliths to microservices, the challenge shifts from simple session checks to federated identity, service mesh authentication, and zero-trust network architectures where every request must be independently verified.

In interviews, auth design questions test whether a candidate can reason about stateful vs. stateless trade-offs, understand why PKCE exists for public clients, articulate when RBAC breaks down and ABAC becomes necessary, and design token lifecycle strategies that balance security with user experience. These are among the most commonly asked system design topics because every production system must solve them.

## Interview Questions
1. "Compare the authorization code grant and the implicit grant in OAuth 2.0. Why is the implicit grant deprecated?"
2. "When should you use JWT-based stateless authentication versus session-based stateful authentication?"
3. "How does PKCE protect against authorization code interception in public clients?"
4. "Design an RBAC system that can transition to ABAC as requirements grow. What are the key architectural decisions?"

## Gotchas
- Using the implicit grant for any new system — it exposes tokens in the URL fragment and is deprecated in OAuth 2.1
- Storing refresh tokens without rotation, which allows indefinite access if a token is stolen
- Treating JWT as opaque and putting sensitive data in the payload — JWT contents are base64-encoded, not encrypted
- Implementing RBAC with a flat role hierarchy, leading to role explosion as the organization scales
- Skipping token revocation design, assuming short-lived tokens alone are sufficient
- Using API keys as the sole authentication mechanism for user-facing endpoints — they lack scoped delegation
- Forgetting that JWT validation requires checking the issuer, audience, expiration, and signature, not just decoding the payload

## Questions

### Q1
type: multiple-choice
stem: "Which OAuth 2.0 grant type is recommended for server-side web applications that can securely store a client secret?"
options:
  - A: Implicit grant
  - B: Client credentials grant
  - C: Authorization code grant
  - D: Resource owner password credentials grant
correct: C
explanation: "The authorization code grant is designed for server-side (confidential) clients that can securely store a client secret. The client exchanges an authorization code obtained via a redirect for tokens at the token endpoint, keeping tokens off the browser URL. The implicit grant exposes tokens in the fragment and is deprecated. Client credentials is for machine-to-machine with no user involved. Resource owner password credentials is deprecated and insecure."
difficulty: 1

### Q2
type: multiple-choice
stem: "What is the primary security risk that PKCE (Proof Key for Code Exchange) mitigates in OAuth 2.0?"
options:
  - A: Cross-site request forgery on the token endpoint
  - B: Authorization code interception by a malicious app on the same device
  - C: Token replay attacks across different resource servers
  - D: Brute-force attacks against short authorization codes
correct: B
explanation: "PKCE prevents authorization code interception attacks where a malicious application on the same device intercepts the authorization code and attempts to exchange it for tokens. The client generates a code verifier, sends its hash (code challenge) during the authorization request, and must present the original verifier at the token endpoint. An interceptor who only captured the code cannot produce the correct verifier. CSRF is mitigated by the state parameter, not PKCE."
difficulty: 2

### Q3
type: fill-in-blank
stem: "In OAuth 2.0, the ______ grant type is used for machine-to-machine authentication where no user is involved, and the client authenticates directly with its own credentials."
answers:
  - "client credentials"
  - "Client Credentials"
  - "client_credentials"
explanation: "The client credentials grant is designed for machine-to-machine communication where the client authenticates with its own credentials (client ID and secret) rather than acting on behalf of a user, making it the appropriate grant for service-to-service authentication."
difficulty: 1

### Q4
type: fill-in-blank
stem: "JWT stands for ______ Web Token. Unlike opaque tokens, JWTs carry ______ that can be read without contacting the authorization server, but this means they cannot be ______ without a shared revocation mechanism."
answers:
  - "JSON"
  - "claims"
  - "revoked"
  - "JSON|claims|revoked"
explanation: "JWT stands for JSON Web Token. JWTs are self-contained and carry claims that can be read without server contact, but because they are self-contained and not opaque, they cannot be revoked without a shared revocation mechanism like a deny list or short expiration windows."
difficulty: 3

### Q5
type: select-all
stem: "Which of the following are valid reasons to prefer session-based authentication over JWT-based authentication for a web application?"
options:
  - A: You need immediate token revocation when a user logs out or is banned
  - B: Your application runs on a single server or a small cluster with shared session storage
  - C: You want to minimize the size of data sent with every request
  - D: You need to store sensitive data in the token that only the server should read
  - E: Your system already has a fast, distributed session store like Redis
correct:
  - A
  - B
  - D
  - E
explanation: "Session-based auth supports immediate revocation (A), works well when you already have shared session storage (B, E), and keeps sensitive data server-side (D). Option C is incorrect because JWTs are typically larger than session cookies since they carry claims, so sessions actually send less data per request (just a session ID)."
difficulty: 2

### Q6
type: scenario
stem: "You are designing auth for a mobile app and a companion web app that share the same backend. Step 1: Identify the appropriate OAuth grant for each client type and explain why PKCE is needed for one but not the other. Step 2: Design the token refresh strategy including rotation, and explain how you would detect refresh token theft. The web app runs on a server with a secure backend; the mobile app is a native public client."
explanation: "Use the authorization code grant with PKCE for the mobile app (public client that cannot store a secret) and the standard authorization code grant for the web app (confidential client with a server-side secret). Implement refresh token rotation so each use issues a new refresh token, and detect theft by revoking the entire token family if a previously rotated token is reused."
  trade_offs: "Convenience vs. security in token lifetimes, the complexity of refresh token rotation detection ( detecting concurrent use from different locations) vs. simply using short-lived tokens, and the operational overhead of managing two different grant flows vs. using one unified approach."
difficulty: 3

### Q7
type: scenario
stem: "Your company is building a multi-tenant SaaS platform. Tenants want to integrate their own corporate IdPs using SAML or OIDC for SSO. Step 1: Design the federation layer — how does your application accept inbound SAML assertions and OIDC id_tokens, and how do you map external identities to internal tenant-scoped accounts? Step 2: Design the authorization model. Some tenants want simple RBAC, others need fine-grained ABAC based on department and location. How do you build an access control layer that supports both without duplicating policy evaluation logic?"
explanation: "Build a federation layer that normalizes inbound SAML assertions and OIDC id_tokens into a common internal identity representation, mapping external identities to tenant-scoped accounts. For authorization, implement a policy-based access control (PBAC) layer that can express both RBAC (roles as policies) and ABAC (attribute-based policies), using a single policy evaluation engine."
  trade_offs: "Standardization (forcing all tenants to one protocol like OIDC) vs. flexibility (supporting both SAML and OIDC), simplicity of RBAC vs. expressiveness of ABAC, and the performance cost of evaluating complex ABAC policies on every request vs. caching resolved permissions."
difficulty: 4

### Q8
type: scenario
stem: "You are designing service-to-service authentication for a microservices architecture with 50 services. Step 1: Compare mTLS issued by a private CA vs. a service mesh sidecar approach vs. signed JWT tokens passed in headers. Which do you choose and why? Step 2: Design how a service validates incoming requests — does it verify the caller identity, the original user identity, or both? How are user identity and service identity propagated through the call chain?"
explanation: "Use a service mesh with sidecar proxies for mTLS to handle service-to-service authentication transparently, and propagate user identity via signed JWT headers passed along the call chain. Each service validates both the caller identity (via mTLS) and the original user identity (via the JWT) for defense in depth."
  trade_offs: "mTLS provides strong cryptographic identity but adds certificate management burden; service mesh abstracts mTLS but introduces infrastructure complexity and a new failure mode; JWT headers are simpler but require a shared signing key and do not encrypt the channel. Propagating both user and service identity increases header size and validation cost but enables per-user authorization at every hop."
difficulty: 3

### Q9
type: scenario
stem: "Your API gateway issues short-lived access tokens (15 min) and longer-lived refresh tokens (7 days with rotation). A resource server receives an access token but needs to check if it was revoked before expiration. Step 1: Compare three approaches for revocation checking — token introspection (calling the auth server per request), a shared revocation list cache (Redis-backed deny list), and short token lifetimes with no revocation. Step 2: Design a rate limiting system that enforces per-identity limits. How do you extract the identity from the token, and how do you handle the case where a compromised token is making requests at the limit before revocation takes effect?"
explanation: "Use a Redis-backed revocation list cache for fast revocation checking with eventual consistency, and extract the identity (subject claim) from the JWT for per-identity rate limiting. For compromised tokens, revoke the token family and force re-authentication to limit the blast radius despite the detection window."
  trade_offs: "Token introspection adds latency (a network call per request) but is always accurate; a revocation cache is fast but has eventual consistency and memory cost proportional to revoked tokens; short lifetimes avoid revocation entirely but force more frequent refreshes. Rate limiting per identity helps limit blast radius but can also lock out legitimate users who share an identity scope, and there is a window between token compromise and revocation detection where the rate limit alone cannot prevent abuse."
difficulty: 4
