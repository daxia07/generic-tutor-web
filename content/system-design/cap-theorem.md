# CAP Theorem

## Definition
In a distributed system, you can only guarantee two of three properties simultaneously: **Consistency** (all nodes see the same data), **Availability** (every request gets a response), and **Partition tolerance** (system works despite network failures). Since network partitions are inevitable, the real choice is between CP and AP.

## Key Terms
- **Consistency**: Every read receives the most recent write or an error.
- **Availability**: Every request receives a (non-error) response, without guarantee it's the most recent write.
- **Partition tolerance**: System continues to operate despite network partitions between nodes.
- **CP system**: Sacrifices availability for consistency (e.g., HBase, MongoDB in certain configs).
- **AP system**: Sacrifices consistency for availability (e.g., Cassandra, DynamoDB).
- **PACELC extension**: Even when no partition exists, there's a trade-off between latency and consistency.

## Why It Matters
CAP theorem frames every distributed database decision. Interviewers use it to test whether you understand trade-offs — there's no "right" answer, only context-dependent choices.

## Interview Questions
1. "Is this system CP or AP? Why?"
2. "Can you have both consistency and availability?"
3. "How does PACELC extend CAP?"

## Gotchas
- Saying "pick two of three" is oversimplified — partitions are unavoidable, so it's really CP vs AP.
- Most real systems are "eventually consistent" — a spectrum, not binary.
- CAP doesn't mean you can't have consistency AND availability most of the time — it's about behavior during partitions.
- Confusing CAP consistency (all nodes same) with ACID consistency (data integrity constraints).

## Questions

### Q1
type: multiple-choice
stem: "According to the CAP theorem, a distributed system can guarantee at most how many of the three properties simultaneously?"
options:
  - A: One
  - B: Two
  - C: Three
  - D: All of them
correct: B
explanation: "The CAP theorem states you can only guarantee 2 of 3: Consistency, Availability, Partition tolerance."
difficulty: 1

### Q2
type: scenario
stem: "Your distributed database must serve reads even during a network partition between two data centers. You accept that some reads may return stale data. Which two CAP properties are you prioritizing?"
options:
  - A: Consistency + Availability
  - B: Consistency + Partition Tolerance
  - C: Availability + Partition Tolerance
  - D: Consistency + Durability
correct: C
explanation: "Serving reads during a partition means you choose Availability over Consistency. Partition Tolerance is mandatory in distributed systems. This is the AP trade-off (e.g., Cassandra, DynamoDB in eventual consistency mode)."
trade_offs: "AP systems may return stale data. For banking or inventory, you might choose CP instead (sacrifice availability during partitions) to prevent incorrect transactions."
difficulty: 2

### Q3
type: multiple-choice
stem: "Which CAP trade-off does a system choose when it remains available during a network partition but may return stale data?"
options:
  - A: CP
  - B: CA
  - C: AP
  - D: PA
correct: C
explanation: "AP systems choose Availability over Consistency during partitions — they serve requests but may return stale data."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The ______ extension of CAP states that even when no partition exists, there is a trade-off between latency and consistency."
answers:
  - "PACELC"
  - "PACELEC"
  - "pacelc"
explanation: "PACELC extends CAP by stating: During a Partition (P), choose Availability (A) or Consistency (C); Else (E) when running normally, choose Latency (L) or Consistency (C)."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are examples of AP-oriented systems?"
options:
  - A: Cassandra
  - B: HBase
  - C: DynamoDB (default configuration)
  - D: MongoDB (with strong read concern)
correct:
  - A
  - C
explanation: "Cassandra and DynamoDB (default eventual consistency) are AP systems — they prioritize availability over strong consistency. HBase is CP. MongoDB with strong read concern is CP-oriented."
difficulty: 2

### Q6
type: scenario
stem: "You design a shopping cart service that must always accept adds and removals, even during a network partition between data centers. Step 1: Identify which CAP property you must sacrifice. Step 2: Determine what inconsistency the user might see. Step 3: Decide how to resolve conflicts when the partition heals. What approach do you take?"
options:
  - A: Choose CP — reject cart operations during partition to prevent inconsistency
  - B: Choose AP — allow all operations, and on conflict resolution use last-write-wins or merge cart items
  - C: Choose CA — not possible in a distributed system
  - D: Choose CP — lock the cart in one data center during partition
correct: B
explanation: "A shopping cart must be available — users expect to add items anytime. This is AP. During a partition, carts in different DCs may diverge. On healing, merge strategies like union of cart items or last-write-wins per item resolve conflicts. Amazon's Dynamo paper describes exactly this use case."
trade_offs: "Last-write-wins can silently drop items if concurrent adds happened. Merging (union) never loses items but may resurrect removed items. Business rules (e.g., never drop added items, prefer more items) should drive the conflict resolution strategy."
difficulty: 3

### Q7
type: scenario
stem: "A banking system processes transfers across two data centers. During a network partition, you must choose between CP and AP. Step 1: Consider what happens if two data centers allow the same account to be debited independently (AP). Step 2: Consider what happens if one data center refuses withdrawals during partition (CP). Step 3: Decide which trade-off is acceptable for financial data. What do you choose?"
options:
  - A: AP — availability is critical, reconcile double-spends later
  - B: CP — consistency is non-negotiable for financial data, accept downtime during partitions
  - C: Hybrid — AP for reads, CP for writes
  - D: AP with compensating transactions to fix inconsistencies
correct: B
explanation: "Financial systems cannot tolerate double-spending or inconsistent balances. CP is the right choice: during a partition, the system refuses transactions that could violate consistency (e.g., only the primary DC processes writes). Availability is sacrificed, but data integrity is preserved."
trade_offs: "CP means the banking service may be unavailable in one region during a partition. This is acceptable because the cost of inconsistency (double-spending, incorrect balances) far exceeds the cost of temporary unavailability. Regulatory requirements often mandate CP behavior."
difficulty: 4

### Q8
type: scenario
stem: "Your social media platform uses an AP database. A celebrity's follower count shows 10M in DC-East and 10.1M in DC-West during normal operation (no partition). Step 1: Identify why counts differ without a partition. Step 2: Determine if this violates CAP. Step 3: Propose a solution for serving a consistent count. What is happening?"
options:
  - A: This violates CAP — AP systems should be consistent when there's no partition
  - B: This is eventual consistency — replication lag between DCs causes temporary divergence, which is allowed under PACELC's latency-consistency trade-off
  - C: The database is broken — restart replication
  - D: This is a partition — the network is down between DCs
correct: B
explanation: "Even without a partition, AP systems trade consistency for latency (the ELC part of PACELC). Replication lag means DCs temporarily diverge. This is expected behavior, not a bug. CAP only guarantees consistency DURING a partition choice — PACELC explains the latency-consistency trade-off during normal operation."
trade_offs: "You can serve consistent counts by reading from the primary/leader DC (higher latency for remote users), use read-repair to catch up faster (more replication traffic), or accept eventual consistency and show approximate counts (e.g., '10M+'). For follower counts, approximate is usually fine."
difficulty: 3
