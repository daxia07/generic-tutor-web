# Payment Rail Design

## Definition
Payment rail infrastructure is the network of systems, protocols, and banking relationships that enable money to move from one account to another. Rails vary by geography, speed, cost, and regulatory requirements — from real-time gross settlement systems like FedNow to batch-processed clearing houses like ACH, from SEPA's same-day euro transfers to SWIFT's multi-day cross-border correspondent chains. Designing payment rail infrastructure means building an abstraction layer over these diverse networks that enables smart routing, reliable settlement, and consistent status tracking.

## Key Terms
- **Payment Rail**: A specific payment network or channel through which funds are transferred (e.g., SWIFT, SEPA, ACH, FedNow, Faster Payments, PIX)
- **Correspondent Banking**: Traditional cross-border payment model where banks route through intermediary banks, each adding fees and delays
- **Proprietary Network**: A payment infrastructure built on local bank accounts across jurisdictions, bypassing correspondent chains for faster settlement
- **Smart Routing**: Algorithm that selects the optimal rail based on speed, cost, coverage, and compliance requirements
- **Settlement**: The actual movement of funds between accounts; net settlement batches obligations, gross settlement processes each individually
- **Clearing**: The process of submitting, validating, and reconciling payment instructions before settlement
- **RTGS**: Real-Time Gross Settlement — each payment settled individually and immediately, no netting
- **Fallback Chain**: Ordered list of alternative rails to try if the primary rail fails
- **Canonical Status Model**: A unified set of payment statuses that normalizes rail-specific statuses into a common vocabulary

## Why It Matters
Payment rail design is a core system design topic for fintech companies because it determines the speed, cost, and reliability of every transaction. Companies like Airwallex have demonstrated that proprietary networks routing through local rails (rather than SWIFT correspondent chains) can achieve 93% same-day settlement across 160+ countries. Interviewers at payment companies expect candidates to reason about rail selection trade-offs, multi-rail abstraction, failure handling, and the complexity of status tracking across heterogeneous networks.

## Interview Questions
1. "How would you design a smart routing engine that selects the optimal payment rail?"
2. "What happens when the primary payment rail goes down mid-transaction?"
3. "How do you track payment status across rails with different reporting capabilities?"

## Gotchas
- Assuming SWIFT is always the right choice for cross-border — local rails are faster and cheaper when available
- Not defining fallback chains — rail outages are common and must be handled gracefully
- Treating all rails as having the same status reporting — some are real-time, some batch, some silent
- Forgetting settlement timing differences — T+0 vs T+2 affects cash flow and reconciliation
- Ignoring rail-specific message formats — each rail has its own schema and validation rules
- Not handling idempotency across rails — retrying a payment on a fallback rail risks double-settlement

## Questions

### Q1
type: multiple-choice
difficulty: 1
stem: "Which payment rail is primarily used for cross-border payments between banks using a network of correspondent relationships and MT/MX message formats?"
options:
  A: "SEPA"
  B: "SWIFT"
  C: "ACH"
  D: "FedNow"
correct: B
explanation: "SWIFT (Society for Worldwide Interbank Financial Telecommunication) is the dominant messaging network for cross-border payments, using MT and ISO 20022 MX message formats routed through correspondent banking chains. SEPA is euro-zone specific, ACH is US domestic batch processing, and FedNow is a US instant payment infrastructure."

### Q2
type: multiple-choice
difficulty: 2
stem: "A proprietary payment network like Airwallex's achieves 93% same-day settlement across 160+ countries primarily by bypassing which traditional mechanism?"
options:
  A: "Encryption standards"
  B: "Correspondent banking intermediaries"
  C: "KYC verification"
  D: "Currency conversion"
correct: B
explanation: "Proprietary networks establish local bank accounts and settlement accounts across jurisdictions, allowing them to route payments through their own infrastructure rather than chaining through multiple correspondent banks. This eliminates intermediary delays, reduces fees from each hop, and enables same-day settlement that would otherwise take 2-5 days through correspondent chains."

### Q3
type: fill-in-blank
difficulty: 2
stem: "In payment settlement, ______ settlement nets multiple payment obligations into a single net position per participant, while ______ settlement processes each payment individually in real time without netting."
answers:
  - "net"
  - "gross"
explanation: "Net settlement aggregates payment obligations between participants over a settlement window and settles only the net difference, reducing liquidity requirements. Gross settlement—especially Real-Time Gross Settlement (RTGS)—processes each payment instruction individually and in full, requiring sufficient liquidity for each transaction but eliminating settlement risk from netting."

### Q4
type: fill-in-blank
difficulty: 3
stem: "The process of ______ involves submitting payment instructions to a clearing house that batches and reconciles them before settlement, whereas ______ clearing validates and processes each payment immediately upon receipt."
answers:
  - "batch"
  - "real-time"
explanation: "Batch clearing collects payment instructions over a period (e.g., hourly or daily cycles) and processes them together at scheduled times, which is cost-efficient but introduces latency. Real-time clearing validates and processes each payment as it arrives, enabling instant payment rails like Faster Payments and FedNow but requires more sophisticated infrastructure."

### Q5
type: select-all
difficulty: 3
stem: "Which of the following factors must a smart payment routing engine consider when selecting the optimal rail for a payment?"
options:
  A: "Settlement speed and cutoff times of each rail"
  B: "Transaction cost including fixed and variable fees per rail"
  C: "Destination country and currency coverage of each rail"
  D: "Compliance and regulatory requirements for the corridor"
  E: "The programming language used to build the rail's API"
correct:
  - A
  - B
  - C
  - D
explanation: "Smart routing engines evaluate settlement speed (can the rail deliver same-day?), cost structure (fixed + variable fees, FX spreads), geographic coverage (does the rail support the destination country/currency?), and compliance constraints (sanctions screening, licensing requirements for the corridor). The programming language of the rail's API is an implementation detail irrelevant to routing decisions."

### Q6
type: scenario
difficulty: 2
stem: "Your fintech platform needs to send a GBP 50,000 payment from the UK to a beneficiary in Germany. You have access to SEPA, SWIFT, and Faster Payments. Step 1: Identify that the payment is GBP-to-EUR cross-border within Europe, so SEPA covers the destination currency (EUR) and geography (EU/EEA), while SWIFT also covers it but with higher cost and longer settlement. Step 2: Since the beneficiary's account is in Germany and denominated in EUR, SEPA is the optimal first-choice rail because it offers same-day settlement for EUR payments within the SEPA zone at low fixed cost. Step 3: Define a fallback chain: if SEPA is unavailable (downtime or cutoff passed), fall back to SWIFT with ISO 20022 messaging; Faster Payments is UK-domestic only and cannot reach a German beneficiary, so it is excluded. What is the best rail selection strategy for this payment?"
options:
  A: "Use Faster Payments for fastest domestic processing, then convert to EUR via SWIFT"
  B: "Use SEPA as the primary rail with SWIFT as fallback, excluding Faster Payments"
  C: "Use SWIFT as the primary rail for maximum coverage, with SEPA as fallback"
  D: "Split the payment across SEPA and SWIFT to hedge against rail failure"
correct: B
explanation: "Step 1: The payment is GBP-to-EUR cross-border within Europe. SEPA covers the destination currency (EUR) and geography (EU/EEA), while SWIFT also covers it but with higher cost and longer settlement. Step 2: Since the beneficiary's account is in Germany and denominated in EUR, SEPA is the optimal first-choice rail because it offers same-day settlement for EUR payments within the SEPA zone at low fixed cost. Step 3: Define a fallback chain: if SEPA is unavailable (downtime or cutoff passed), fall back to SWIFT with ISO 20022 messaging; Faster Payments is UK-domestic only and cannot reach a German beneficiary, so it is excluded."
trade_offs: "SEPA provides the best combination of speed, cost, and coverage for intra-European EUR payments, but it only operates during defined settlement windows and cannot handle non-EUR currencies. SWIFT offers universal coverage and currency support but introduces correspondent chain delays and higher fees. Faster Payments is irrelevant here as it only supports GBP domestic transfers within the UK."

### Q7
type: scenario
difficulty: 3
stem: "Design a multi-rail architecture with an abstraction layer that allows your payment platform to route across 70+ local rails without exposing rail-specific complexity to upstream services. Step 1: Define a unified payment interface (e.g., createPayment with standardized fields: amount, currency, beneficiary, priority) that upstream services call without specifying a rail. Step 2: Implement a routing engine that receives the unified request, resolves beneficiary country/currency, evaluates available rails by speed/cost/compliance, and selects the optimal rail with fallback chains. Step 3: Build rail adapters that translate the unified payment model into rail-specific message formats (e.g., SEPA XML, SWIFT MT103, ACH NACHA file), handle rail-specific validation rules, and normalize rail-specific status responses into a common status model. What is the correct architecture?"
options:
  A: "A single monolithic service that hardcodes rail-specific logic per corridor with if/else branching"
  B: "A unified API layer, a smart routing engine, and rail-specific adapters using the adapter pattern"
  C: "Direct API calls from upstream services to each rail with a shared configuration file"
  D: "A centralized proxy that forwards all payments through SWIFT for universal coverage"
correct: B
explanation: "Step 1: Define a unified payment interface (e.g., createPayment with standardized fields: amount, currency, beneficiary, priority) that upstream services call without specifying a rail. Step 2: Implement a routing engine that receives the unified request, resolves beneficiary country/currency, evaluates available rails by speed/cost/compliance, and selects the optimal rail with fallback chains. Step 3: Build rail adapters that translate the unified payment model into rail-specific message formats (e.g., SEPA XML, SWIFT MT103, ACH NACHA file), handle rail-specific validation rules, and normalize rail-specific status responses into a common status model."
trade_offs: "A unified abstraction layer dramatically simplifies upstream integration and enables smart routing, but introduces latency from the translation layer and risks losing rail-specific features that some corridors require. Over-abstracting can make it harder to leverage unique rail capabilities (e.g., SEPA Instant's 10-second settlement promise or FedNow's request-for-payment feature). The adapter pattern must balance standardization with the flexibility to expose rail-specific options when needed."

### Q8
type: scenario
difficulty: 3
stem: "A high-priority corporate payment of USD 2M to a beneficiary in Brazil fails on the primary rail (local PIX rail) due to a temporary outage. Step 1: Detect the failure via rail-specific timeout or rejection response, classify it as a transient infrastructure failure (not a compliance or funds issue), and immediately trigger the fallback routing logic. Step 2: Execute the fallback chain: attempt SWIFT with a local Brazilian bank as the receiving correspondent, which provides coverage but with longer settlement (T+1 to T+2) and higher cost. Step 3: Implement a retry policy for the primary rail: queue a retry attempt on PIX with exponential backoff (e.g., 5 min, 15 min, 45 min) in case the outage is short-lived. If PIX recovers before SWIFT settlement completes, cancel the SWIFT payment and re-route through PIX for faster settlement. What is the best failure handling strategy?"
options:
  A: "Immediately retry PIX indefinitely until it recovers, since it offers the best settlement speed"
  B: "Fall back to SWIFT immediately and abandon PIX for this payment to avoid complexity"
  C: "Initiate SWIFT as safety net while retrying PIX with exponential backoff, cancelling SWIFT if PIX recovers"
  D: "Queue the payment and wait for manual operator intervention to decide the rail"
correct: C
explanation: "Step 1: Detect the failure via rail-specific timeout or rejection response, classify it as a transient infrastructure failure (not a compliance or funds issue), and immediately trigger the fallback routing logic. Step 2: Execute the fallback chain: attempt SWIFT with a local Brazilian bank as the receiving correspondent, which provides coverage but with longer settlement (T+1 to T+2) and higher cost. Notify the sender of the rail switch and adjusted settlement timeline. Step 3: Implement a retry policy for the primary rail: queue a retry attempt on PIX with exponential backoff (e.g., 5 min, 15 min, 45 min) in case the outage is short-lived. If PIX recovers before SWIFT settlement completes, cancel the SWIFT payment and re-route through PIX for faster settlement."
trade_offs: "Immediately falling back to SWIFT ensures payment delivery but at higher cost and slower settlement (T+2 vs real-time with PIX). Waiting for PIX recovery risks missing the payment deadline but preserves the optimal rail. The hybrid approach—initiating SWIFT as safety net while retrying PIX—balances reliability with cost/speed optimization but requires cancellation logic and idempotency safeguards to prevent double-settlement."

### Q9
type: scenario
difficulty: 4
stem: "Your payment platform processes 500K payments daily across 160 countries. You need to design end-to-end payment status tracking with webhook notifications that provide real-time visibility across diverse rails with inconsistent status reporting capabilities. Step 1: Define a canonical state machine with standardized payment statuses (e.g., SUBMITTED, ACCEPTED, IN_CLEARING, SETTLED, FAILED, RETURNED) that maps from rail-specific statuses. Each rail adapter normalizes its native statuses into this canonical model. Step 2: Implement a status event pipeline: rail adapters emit normalized status events to a message queue, a status aggregator deduplicates and orders events by payment ID and timestamp, and a webhook dispatcher delivers notifications with retry and idempotency keys. Handle rails with async batch status updates vs real-time callbacks uniformly through polling adapters for batch rails. Step 3: Design webhook delivery with guaranteed-at-least-once semantics: persist every status transition in a status ledger, dispatch webhooks with unique idempotency keys derived from payment_id + status + timestamp, implement exponential backoff retry for failed deliveries, and expose a status query API for clients to reconcile missed notifications. What is the correct tracking architecture?"
options:
  A: "Each rail reports statuses directly to clients via its own callback format with no normalization"
  B: "A canonical status model with rail adapters, a message queue pipeline, and at-least-once webhook delivery with idempotency keys"
  C: "A polling-only architecture where clients query each rail individually for status updates"
  D: "Exactly-once webhook delivery using distributed transactions across all rails"
correct: B
explanation: "Step 1: Define a canonical state machine with standardized payment statuses (e.g., SUBMITTED, ACCEPTED, IN_CLEARING, SETTLED, FAILED, RETURNED) that maps from rail-specific statuses. Each rail adapter normalizes its native statuses into this canonical model (e.g., SEPA's ACSC maps to SETTLED, SWIFT's ACK maps to ACCEPTED). Step 2: Implement a status event pipeline: rail adapters emit normalized status events to a message queue (e.g., Kafka), a status aggregator deduplicates and orders events by payment ID and timestamp, and a webhook dispatcher delivers notifications to registered endpoints with retry and idempotency keys. Handle rails with async batch status updates (ACH) vs real-time callbacks (Faster Payments) uniformly through polling adapters for batch rails. Step 3: Design the webhook delivery with guaranteed-at-least-once semantics: persist every status transition in a status ledger, dispatch webhooks with unique idempotency keys derived from payment_id + status + timestamp, implement exponential backoff retry for failed deliveries (up to 72 hours), and expose a status query API for clients to reconcile missed notifications."
trade_offs: "A canonical status model simplifies client integration but loses rail-specific nuance—some rails report intermediate states (e.g., SWIFT's received, validated, forwarded) that collapse into a single canonical status, reducing granularity. Polling adapters for batch rails add operational overhead and latency versus real-time callbacks. At-least-once webhook delivery requires clients to handle duplicates via idempotency keys, adding complexity on the consumer side, but is simpler and more reliable than exactly-once delivery which requires distributed transaction support."
