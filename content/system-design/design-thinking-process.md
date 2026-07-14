# Design Thinking Process

## Definition
The design thinking process is the structured approach to decomposing and solving system design problems in an interview setting. It's not about knowing the "right" architecture — it's about demonstrating a repeatable method: clarify requirements, estimate scale, draw a high-level design, dive deep on bottlenecks, and iterate. Interviewers evaluate your PROCESS as much as your solution. A candidate who methodically works through ambiguity and arrives at a reasonable design outperforms one who jumps to a complex architecture without justification.

## Key Terms
- **Requirements Clarification**: The first 5 minutes spent asking the interviewer to define scope, constraints, and priorities. Without this, you solve the wrong problem.
- **Functional vs Non-Functional**: Functional = what the system does (features). Non-functional = how well it does them (latency, availability, consistency, durability).
- **Constraint Identification**: Pinning down the numbers that drive design: QPS, storage, latency budget, availability SLA.
- **Scope Narrowing**: Explicitly deciding what NOT to build. "We won't handle real-time collaboration in v1" is as important as what you will build.
- **Assumption Stating**: Declaring your assumptions out loud so the interviewer can correct them. "Assuming 100M DAU with a 10:1 read-write ratio — is that reasonable?"
- **Bottleneck-Driven Deep Dive**: After the high-level design, identify the weakest component and optimize it. This shows analytical depth.
- **Iteration**: Starting simple, then adding complexity ONLY when scale or requirements demand it. Monolith → microservices, single DB → sharded, cache-aside → write-through.
- **Trade-Off Articulation**: Explicitly stating what you gain and lose with each choice. "Choosing eventual consistency gains 10x throughput but sacrifices real-time visibility."
- **Ambiguity Resolution**: The skill of making progress despite incomplete information by stating assumptions and asking targeted questions.

## Why It Matters
Airwallex's design interview explicitly evaluates "structured problem solving" and "requirements analysis" — two of six assessed criteria. The interview format is 10 min intro + 45 min design + 5 min Q&A. In those 45 minutes, candidates who follow a clear process consistently outperform those who don't, even if the latter know more technology. The process ensures you: (1) solve the right problem, (2) make every decision justifiable, (3) don't skip critical components under time pressure, and (4) give the interviewer natural checkpoints to guide you.

## Interview Questions
1. "How do you approach designing a system you've never seen before?"
2. "What's the first thing you do when given a design problem?"
3. "How do you handle ambiguity in requirements?"

## Gotchas
- Jumping to architecture before clarifying requirements — the #1 mistake in design interviews.
- Not stating assumptions — the interviewer can't help you if they don't know what you're assuming.
- Going too deep too early — nail the high-level first, then dive into ONE bottleneck.
- Forgetting non-functional requirements — latency, availability, and consistency are as important as features.
- Not managing time — spending 30 min on requirements leaves 15 min for the actual design.
- Being unwilling to iterate — the first design is never the final one. Expect to refine.

## Questions

### Q1
type: multiple-choice
stem: "The interviewer says 'Design a notification system.' What should you do FIRST?"
options:
  - A: "Draw the architecture with push notifications, message queues, and user preferences"
  - B: "Ask clarifying questions: what types of notifications, how many users, real-time or batch, what platforms?"
  - C: "Start estimating QPS and storage requirements"
  - D: "List the technology stack you'd use (Kafka, Firebase, SNS)"
correct: B
explanation: "Always clarify requirements before ANY design work. Without knowing the type (push/email/SMS), scale (1K or 1B users), latency requirements (real-time or batch), and delivery guarantees (at-least-once or exactly-once), any architecture you draw is speculative. The interviewer WANTS to see you ask questions — it shows maturity."
difficulty: 1

### Q2
type: select-all
stem: "Which of these are effective clarification questions for a system design problem?"
options:
  - A: "What's the expected scale — how many users and what QPS?"
  - B: "Is there a latency budget I should be aware of?"
  - C: "Should I use MongoDB or PostgreSQL?"
  - D: "What are the core features vs nice-to-haves?"
correct:
  - A
  - B
  - D
explanation: "A: Scale drives every architectural decision — essential question. B: Latency budget constrains component choices (DB vs cache, sync vs async). C: Wrong — technology choices come AFTER understanding requirements, not before. D: Critical — prevents over-engineering by focusing on must-haves first."
difficulty: 1

### Q3
type: fill-in-blank
stem: "In a 45-minute design interview, you should spend approximately ______ minutes on requirements clarification and estimation before drawing architecture."
answers:
  - "8"
  - "8-10"
  - "10"
hint: "Clarification + estimation = ~20% of total time."
explanation: "5 min for requirements clarification + 3-5 min for back-of-envelope estimation = ~8-10 minutes. This is 20% of your 45 minutes. Too little and you solve the wrong problem; too much and you run out of time for the actual design. The remaining 35 minutes: 10-15 min high-level, 15-20 min deep dive, 5 min wrap-up."
difficulty: 2

### Q4
type: multiple-choice
stem: "After drawing your high-level architecture, what should you do next?"
options:
  - A: "Redraw it with more components and microservices"
  - B: "Identify the bottleneck and do a deep dive on that component"
  - C: "Start writing the data model and API definitions"
  - D: "Ask the interviewer if they like your design"
correct: B
explanation: "The high-level design shows WHAT components exist. The deep dive shows you understand WHY and HOW. Identify the most challenging component (bottleneck) — usually the database, cache strategy, or message delivery — and discuss it in depth. This demonstrates analytical thinking and prioritization."
difficulty: 2

### Q5
type: scenario
stem: "You're 20 minutes into a 45-minute design interview. You've clarified requirements and drawn a high-level architecture. The interviewer hasn't interrupted. What should you do?"
options:
  - A: "Keep refining the high-level — add more components for completeness"
  - B: "Pick the hardest component, explain the trade-offs, and propose a solution"
  - C: "Ask the interviewer which component they'd like you to dive into"
  - D: "Start estimating costs for the infrastructure"
correct: C
explanation: "At 20 minutes with no interruption, proactively ask the interviewer for direction. This shows collaboration and time awareness. Option B is reasonable if you have a strong opinion on the bottleneck, but C is safer — it ensures you spend your remaining 25 minutes on what the interviewer cares about most. Best combo: 'I see two key bottlenecks — the write path at scale and the cache invalidation strategy. Which would you like me to explore?'"
trade_offs: "Asking shows humility but risks looking indecisive if overused. Self-directing shows confidence but risks going deep on something the interviewer doesn't care about. The sweet spot: name 2-3 bottlenecks yourself, THEN ask which to explore. This proves you can identify issues while still collaborating."
difficulty: 2

### Q6
type: scenario
stem: "The interviewer gives you an ambiguous requirement: 'The system should be fast.' How do you resolve this ambiguity productively?"
options:
  - A: "Assume p99 latency under 100ms and proceed"
  - B: "Ask 'What does fast mean for this use case? Are we optimizing for p50, p99, or throughput? Is there a specific SLA?'"
  - C: "Design for the lowest possible latency regardless of cost"
  - D: "Note the ambiguity and move on — you can optimize later"
correct: B
explanation: "'Fast' is meaningless without specifics. p50 of 10ms with p99 of 5 seconds is 'fast on average' but terrible for tail latency. p99 of 200ms might be 'slow' for real-time bidding but 'fast' for batch analytics. Always convert vague requirements into measurable constraints: latency percentile, throughput target, or SLA. This is exactly what senior engineers do in real projects."
trade_offs: "Asking too many clarification questions eats into design time. The key is to convert ONE vague requirement into a SPECIFIC constraint, then move on. Don't ask 5 follow-ups — ask the one that most constrains your architecture. For 'fast', latency percentile is usually the binding constraint."
difficulty: 2

### Q7
type: scenario
stem: "You've designed a system with a SQL database, but the interviewer pushes back: 'What if we need to handle 10x the current write volume?' Your current design handles the expected load. How should you respond?"
options:
  - A: "Switch to NoSQL — it scales horizontally better"
  - B: "Show how your design can evolve: add read replicas first, then sharding, and explain when each becomes necessary"
  - C: "Say the current design is fine and the interviewer's scenario is unrealistic"
  - D: "Add a message queue to buffer all writes before the database"
correct: B
explanation: "The interviewer is testing your ability to ITERATE. They want to see: (1) your design has scaling headroom, (2) you know when and how to add complexity. Option B shows a clear evolution path: at 2x → add read replicas (simple), at 5x → add caching layer, at 10x → shard the database. Each step adds complexity ONLY when the scale demands it. This is exactly how real systems evolve."
trade_offs: "Option A (switch to NoSQL) is premature — you don't know if the data model fits NoSQL, and you're abandoning ACID guarantees without justification. Option D (queue everything) adds complexity without solving the fundamental write bottleneck. The key insight: scaling is a JOURNEY, not a destination. Show the path, not just the endpoint."
difficulty: 3

### Q8
type: fill-in-blank
stem: "When stating an assumption in an interview, the most effective pattern is: 'Assuming [assumption], [consequence]. Is that ______?'"
answers:
  - "reasonable"
  - "correct"
  - "fair"
  - "accurate"
hint: "You're inviting the interviewer to confirm or correct your assumption."
explanation: "The pattern is: state assumption → state consequence → ask if reasonable. 'Assuming 100M DAU with a 10:1 read ratio, we'd need ~1,150 QPS read capacity. Is that reasonable?' This gives the interviewer a specific number to confirm or correct, and shows you've thought through the implication. 'Reasonable' is the best word — it's collaborative, not confrontational."
difficulty: 1

### Q9
type: scenario
stem: "You're in the final 5 minutes of the design interview. You've covered requirements, estimation, high-level architecture, and a deep dive on one component. What should you do with the remaining time?"
options:
  - A: "Start a second deep dive on another component"
  - B: "Summarize your design, call out trade-offs, and mention 2-3 areas you'd explore with more time"
  - C: "Ask the interviewer what you missed"
  - D: "Redraw the full architecture with improvements"
correct: B
explanation: "The final 5 minutes are for showing self-awareness and breadth. Summarize: 'So we have X for reads, Y for writes, and Z for the bottleneck we discussed.' Name trade-offs explicitly: 'We chose eventual consistency for throughput — the trade-off is stale reads for up to 5 seconds.' Then show humility: 'With more time, I'd explore the monitoring/observability layer and the failure recovery path.' This proves you know what you know AND what you don't."
trade_offs: "Option A risks leaving the interview without a clean conclusion — you might be mid-sentence when time runs out. Option C is passive — you should already know what you missed. Option D wastes time on drawing when talking is faster. The summary + trade-offs + next-steps pattern is the strongest close because it demonstrates reflection, which is what senior engineers do after every design session."
difficulty: 2
