---
tags:
  - system-design
  - airwallex
  - networking
aliases:
  - gRPC
  - protocol-buffers
  - protobuf
last-updated: 2026-06-22
type: concept
---

# gRPC — Interview Guide

> [!tip] Airwallex uses gRPC for service-to-service communication. REST for external APIs.

## What is gRPC?

**gRPC** = Google Remote Procedure Call. A framework for calling functions on a remote server as if they were local.

**Analogy:** Think of it like a REST API, but:
- Uses HTTP/2 (faster, multiplexed)
- Uses Protocol Buffers (binary, smaller payload)
- Strict contract (`.proto` file defines the API)
- Bi-directional streaming supported

## Why Not REST?

| Feature | REST | gRPC |
|---------|------|------|
| Protocol | HTTP/1.1 | HTTP/2 |
| Format | JSON (text) | Protobuf (binary) |
| Contract | Swagger/OpenAPI (optional) | .proto (required) |
| Speed | Slower (parsing JSON) | 2-10x faster |
| Streaming | No (request-response) | Yes (bi-directional) |
| Browser | Yes | Needs proxy |

**When to use gRPC:**
- Internal microservice communication (Airwallex's use case)
- High-throughput, low-latency requirements
- Strong typing needed
- Streaming data

**When to use REST:**
- Public APIs (browser-friendly)
- Simple CRUD
- When you need human-readable payloads

## Protocol Buffers (Protobuf)

The contract language for gRPC. Define your API in a `.proto` file:

```protobuf
syntax = "proto3";

service PaymentService {
  // Unary: single request, single response
  rpc CreatePayment(PaymentRequest) returns (PaymentResponse);

  // Server streaming: client gets a stream of responses
  rpc WatchPaymentStatus(PaymentId) returns (stream PaymentStatus);

  // Client streaming: client sends a stream
  rpc BatchUpload(stream Transaction) returns (BatchResult);

  // Bi-directional: both stream
  rpc RealTimeExchange(stream CurrencyRequest) returns (stream CurrencyRate);
}

message PaymentRequest {
  string id = 1;
  string from_currency = 2;
  string to_currency = 3;
  int64 amount_cents = 4;  // Use cents to avoid floating point
}

message PaymentResponse {
  string id = 1;
  string status = 2;
  int64 converted_amount_cents = 3;
}
```

## gRPC Communication Patterns

### 1. Unary (most common)
```
Client ──request──▶ Server
Client ◀──response── Server
```
Like REST POST/GET. One request, one response.

### 2. Server Streaming
```
Client ──request──▶ Server
Client ◀──stream──── Server
Client ◀──stream──── Server
Client ◀──stream──── Server
```
Example: Subscribe to payment status updates.

### 3. Client Streaming
```
Client ──stream──▶ Server
Client ──stream──▶ Server
Client ──stream──▶ Server
Client ◀──response── Server
```
Example: Batch upload transactions.

### 4. Bi-directional Streaming
```
Client ──stream──▶ Server
Client ◀──stream── Server
Client ──stream──▶ Server
Client ◀──stream── Server
```
Example: Real-time currency exchange rate feed.

## Airwallex Context

- **gRPC** for internal services (payment engine → wallet → FX engine)
- **REST** for external APIs (merchant integration, SDK)
- **Why gRPC?** High throughput (10K+ TPS), low latency (P99 < 20ms), strong typing for financial data

## Interview Talking Points

**When asked about service communication:**
- "For internal services, I'd use gRPC — it's faster than REST due to binary serialization and HTTP/2"
- "Define the contract in .proto files so both services have type safety"
- "For external APIs, use REST — it's more accessible for third-party integrations"

**Common follow-ups:**
- "How do you handle errors?" → gRPC status codes (OK, INVALID_ARGUMENT, NOT_FOUND, etc.)
- "How do you version APIs?" → Proto package versioning, backward compatibility
- "What about service discovery?" → DNS, Kubernetes services, or a service mesh

## Quick Reference

| Term | Meaning |
|------|---------|
| gRPC | Remote procedure call framework |
| Protobuf | Binary serialization format |
| .proto | API contract definition file |
| Unary | 1 request, 1 response |
| Streaming | Continuous data flow |
| HTTP/2 | Multiplexed, faster than HTTP/1.1 |

## Questions

### Q1
type: multiple-choice
stem: "Which protocol does gRPC use as its transport layer?"
options:
  - A: HTTP/1.1
  - B: HTTP/2
  - C: WebSocket
  - D: TCP raw sockets
correct: B
explanation: "gRPC is built on HTTP/2, which provides multiplexed streams, binary framing, and header compression."
difficulty: 1

### Q2
type: scenario
stem: "Your microservices team wants type-safe API contracts with automatic client code generation and efficient binary serialization. REST with JSON doesn't provide compile-time type safety. What should you use?"
options:
  - A: GraphQL with schema validation
  - B: gRPC with Protocol Buffers — define contracts in .proto files, generate code for multiple languages
  - C: OpenAPI/Swagger with code generation
  - D: XML-RPC
correct: B
explanation: "gRPC uses Protocol Buffers as its Interface Definition Language (.proto files). The compiler generates type-safe client stubs and server skeletons in multiple languages. Binary serialization is 3-10x smaller and faster than JSON."
trade_offs: "gRPC is harder to debug than REST (binary protocol, not human-readable). Browser support requires gRPC-Web or a REST proxy. Not ideal for public-facing APIs where REST is the standard."
difficulty: 2

### Q3
type: select-all
stem: "Which are gRPC communication patterns?"
options:
  - A: Unary
  - B: Server streaming
  - C: Client streaming
  - D: Bidirectional streaming
correct:
  - A
  - B
  - C
  - D
explanation: "gRPC supports all four patterns: Unary (1:1), server streaming, client streaming, and bidirectional streaming."
difficulty: 2
