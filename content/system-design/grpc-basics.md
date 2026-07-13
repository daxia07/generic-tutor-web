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

### Q4
type: fill-in-blank
stem: "The binary serialization format used by gRPC for encoding messages is called Protocol ______."
answers:
  - "Buffers"
  - "buffers"
  - "Buf"
explanation: "Protocol Buffers (protobuf) is the serialization format for gRPC. It encodes structured data in a compact binary format that is smaller and faster to parse than JSON or XML."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are advantages of gRPC over REST with JSON?"
options:
  - A: Smaller payload size due to binary serialization
  - B: Built-in bi-directional streaming support
  - C: Human-readable wire format for easy debugging
  - D: Automatic client code generation from .proto files
correct:
  - A
  - B
  - D
explanation: "gRPC uses binary Protobuf (smaller payloads), supports streaming natively, and generates client/server code from .proto definitions. The wire format is NOT human-readable (C is false), which makes debugging harder — this is actually a disadvantage of gRPC."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your team builds a web dashboard that needs real-time currency exchange rate updates from a gRPC backend service. Step 2: The backend exposes a server-streaming RPC: WatchRates(stream CurrencyRequest) returns (stream CurrencyRate). Step 3: The browser cannot establish a native gRPC connection because browsers do not support HTTP/2 full-spec (noTrailers, no raw frames). What should you do?"
options:
  - A: Switch the backend to REST Server-Sent Events — give up gRPC for browser clients
  - B: Use gRPC-Web (a browser-compatible subset of gRPC) or add an Envoy proxy that translates gRPC-Web to native gRPC
  - C: Use WebSockets instead of gRPC for all communication
  - D: Ask users to install a desktop application
correct: B
explanation: "gRPC-Web is a JavaScript client library that allows browsers to communicate with gRPC services. It supports unary and server-streaming calls. Envoy proxy can translate gRPC-Web requests to native gRPC, so the backend service does not need to change. This preserves the gRPC contract for internal services while enabling browser access."
trade_offs: "gRPC-Web does not support client streaming or bidirectional streaming (only unary and server streaming). For full streaming in browsers, WebSockets or SSE may still be needed. The Envoy proxy adds an extra network hop and operational complexity."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: Your payment service defines a .proto with field int64 amount_cents = 1. Step 2: A JavaScript frontend calls the gRPC-Web endpoint and receives the response. Step 3: The amount_cents value is corrupted — it shows a different number than what the server sent. Step 4: You discover that JavaScript numbers are 64-bit floating point and cannot precisely represent all 64-bit integers. How should you fix this?"
options:
  - A: Change the field type to float in the .proto file
  - B: Use the int64 as a string type in the .proto (string amount_cents) or use the jspb.asString option to serialize int64 as strings for JSON/gRPC-Web clients
  - C: Remove the amount field entirely
  - D: Use a 32-bit integer instead — it is sufficient for all payment amounts
correct: B
explanation: "JavaScript's Number type is IEEE 754 double-precision (53-bit mantissa), so int64 values above 2^53 lose precision. The standard fix is to serialize int64 fields as strings when targeting JavaScript/gRPC-Web. In proto3, you can use the js_type = STRING option or switch to string type for monetary values."
trade_offs: "Using string type loses numeric type safety in the .proto contract — any string value is accepted. Using js_type = STRING preserves the int64 type for non-JS clients but adds complexity. For financial systems, string representation is common practice to avoid all floating-point issues."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: You have a running gRPC service with 15 client services consuming it. Step 2: You need to add a new field 'currency' to the PaymentResponse message. Step 3: You want to deploy the change without breaking any existing clients. Step 4: You consider three approaches: (a) rename the old message and create PaymentResponseV2, (b) add the field with a field number that has never been used, (c) reuse an old field number that was previously removed. Which approach is correct?"
options:
  - A: Approach (a) — create a new message type to ensure no conflicts
  - B: Approach (b) — add the new field with a new, never-used field number; proto3 treats unknown fields as optional by default
  - C: Approach (c) — reuse the old field number to avoid wasting numbers
  - D: All three approaches are equally valid
correct: B
explanation: "In Protobuf, field numbers identify fields on the wire. Adding a new field with a new number is backward-compatible: old clients simply ignore the unknown field, and new clients see the field as the default value when reading old messages. Never reuse a retired field number (C) — old data with that number would be misinterpreted."
trade_offs: "Creating a new message type (A) is the safest but requires duplicating definitions and updating all clients. Reusing field numbers (C) can cause silent data corruption. The simplest and correct approach is (B): add a new field number, following proto3's forward/backward compatibility rules. Document retired field numbers to prevent reuse."
difficulty: 4
