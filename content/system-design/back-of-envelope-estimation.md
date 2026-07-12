# Back-of-Envelope Estimation

## Definition
Back-of-envelope estimation is the skill of quickly approximating system metrics — throughput, storage, bandwidth, latency — using simple arithmetic and known reference numbers. It's not about exact answers; it's about being in the right ballpark (within 2-10x of reality).

## Key Terms
- **QPS (Queries Per Second)**: Number of requests a system handles per second. Derived from daily active users and usage patterns.
- **DAU/MAU**: Daily/Monthly Active Users. DAU ≈ MAU × 0.3 for typical consumer apps.
- **Read-to-Write Ratio**: How many reads vs writes a system handles. Most systems are read-heavy (100:1 to 10:1).
- **Peak Factor**: Traffic isn't uniform. Peak QPS ≈ 2-3x average QPS. Black Friday can hit 10x.
- **Storage Unit**: 1 KB = 1,000 bytes; 1 MB = 10^6 bytes; 1 GB = 10^9 bytes; 1 TB = 10^12 bytes; 1 PB = 10^15 bytes.
- **Bandwidth**: Data transferred per second. = QPS × average request/response size.

## Why It Matters
Every system design interview starts with estimation. The interviewer says "Design Twitter" — you must immediately ask "How many users? How many tweets per day? What's the read/write ratio?" These numbers drive every architectural decision: caching strategy, sharding scheme, database choice, CDN requirements. Without estimation, you're just drawing boxes.

## Interview Questions
1. "Design a news feed system for 100M users. How much storage do you need per day?"
2. "Estimate the QPS for Google Search."
3. "How many servers does WhatsApp need for 1B users sending 50B messages/day?"
4. "Design a video streaming service. What's the bandwidth requirement for 1M concurrent viewers at 4Mbps?"

## Gotchas
- Confusing MB (10^6) with MiB (2^20). In interviews, use powers of 10 — it's close enough.
- Forgetting to account for peak traffic. Design for peak, not average.
- Not asking the interviewer for constraints. Always clarify: "What's the user count? Read/write ratio?"
- Over-complicating the math. Round aggressively: 300M users → 3×10^8, not 312,456,789.
- Forgetting replication and redundancy. If you need 100GB storage, with 3x replication that's 300GB.
- Ignoring metadata overhead. A tweet is 140 chars but with user ID, timestamp, media references, it's ~1KB per record.

## Questions

### Q1
type: multiple-choice
stem: "A system has 100M monthly active users (MAU). Roughly how many daily active users (DAU) would you estimate?"
options:
  - A: 100M
  - B: 30M
  - C: 10M
  - D: 50M
correct: B
explanation: "DAU ≈ MAU × 0.3 is a common rule of thumb for consumer apps. 100M × 0.3 = 30M DAU. This varies by app type but 30% is a safe starting point."
difficulty: 1

### Q2
type: fill-in-blank
stem: "If a service has 10M DAU and each user makes 20 requests/day, the average QPS is approximately ______."
answers:
  - "2000"
  - "2K"
  - "2k"
  - "2300"
hint: "Divide total daily requests by seconds in a day (86400 ≈ 10^5)."
explanation: "Total daily requests = 10M × 20 = 200M. QPS = 200M / 86400 ≈ 200M / 10^5 ≈ 2,000 QPS. The key insight: divide daily requests by ~10^5 (not exactly 86400 — close enough for estimation)."
difficulty: 2

### Q3
type: multiple-choice
stem: "Your system averages 1,000 QPS. What peak QPS should you design for?"
options:
  - A: 1,000 QPS
  - B: 1,500 QPS
  - C: 2,000-3,000 QPS
  - D: 10,000 QPS
correct: C
explanation: "Peak traffic is typically 2-3x the average. Designing for average means your system will fail during traffic spikes. 10x is overkill for normal peaks but applies to rare events like Black Friday."
difficulty: 2

### Q4
type: multiple-choice
stem: "You're designing a photo-sharing app with 50M users. Each user uploads 2 photos/day. Each photo averages 5MB. How much new storage per day (without replication)?"
options:
  - A: 500 GB
  - B: 50 GB
  - C: 500 TB
  - D: 5 TB
correct: A
explanation: "Daily uploads = 50M users × 2 photos = 100M photos. Storage = 100M × 5MB = 500M MB = 500,000 GB ≈ 500 GB. (500 GB ≈ 0.5 TB per day, or ~180 TB/year)."
difficulty: 2

### Q5
type: fill-in-blank
stem: "A chat app has 500M DAU, each sending 50 messages/day. Average message size is 100 bytes. Daily storage needed (no replication) is approximately ______ GB."
answers:
  - "2500"
  - "2500GB"
  - "2.5TB"
hint: "Total messages × size, then convert bytes to GB (divide by 10^9)."
explanation: "Messages/day = 500M × 50 = 25B messages. Storage = 25B × 100 bytes = 2.5 × 10^12 bytes = 2,500 GB = 2.5 TB. With 3x replication = 7.5 TB/day."
difficulty: 3

### Q6
type: multiple-choice
stem: "A web server typically handles how many QPS for simple requests?"
options:
  - A: 1-10 QPS
  - B: 100-1,000 QPS
  - C: 10,000-100,000 QPS
  - D: 1,000,000+ QPS
correct: B
explanation: "A single modern web server handles roughly 100-1,000 QPS for typical web requests. For static content or cached responses it can be much higher. For complex DB queries, lower. This is the key reference number for capacity planning."
difficulty: 1

### Q7
type: select-all
stem: "Which of these are important reference numbers for back-of-envelope estimation?"
options:
  - A: 1 day ≈ 10^5 seconds
  - B: A single web server handles ~1K QPS
  - C: HDD seek time ≈ 10ms, SSD seek time ≈ 0.1ms
  - D: 1 Gigabit Ethernet = 1 GB/s throughput
correct:
  - A
  - B
  - C
explanation: "1 day ≈ 86,400 ≈ 10^5 seconds (A is correct). Single web server ≈ 1K QPS for typical requests (B is correct). HDD seek ≈ 10ms, SSD ≈ 0.1ms (C is correct). 1 Gigabit Ethernet = ~125 MB/s, NOT 1 GB/s — confusing bits and bytes is a classic mistake (D is wrong)."
difficulty: 2

### Q8
type: scenario
stem: "You're designing a URL shortener. You expect 100M new URLs per month. Each short URL record needs: short code (7 bytes), original URL (200 bytes avg), metadata (50 bytes). How much storage for 5 years of data with 3x replication?"
options:
  - A: ~500 GB
  - B: ~5 TB
  - C: ~50 TB
  - D: ~500 TB
correct: B
explanation: "Per record: 7 + 200 + 50 = 257 bytes ≈ 250 bytes. Monthly: 100M × 250 = 25B bytes ≈ 25 GB. 5 years: 25 GB × 60 months ≈ 1,500 GB ≈ 1.5 TB. With 3x replication: ~4.5 TB ≈ 5 TB. The key: always account for replication and multi-year growth."
trade_offs: "Storage is cheap, but random lookups at scale require memory for caching hot URLs. 5 TB on disk is trivial; fitting the hot set in RAM is the real constraint."
difficulty: 3

### Q9
type: fill-in-blank
stem: "A video streaming service has 1M concurrent viewers at 4 Mbps each. The total egress bandwidth required is approximately ______ Gbps."
answers:
  - "4"
  - "4Gbps"
hint: "1M viewers × 4 Mbps = ? Gbps (divide Mbps by 1000 to get Gbps)."
explanation: "Total bandwidth = 1M × 4 Mbps = 4,000,000 Mbps = 4,000 Mbps = 4 Gbps. With overhead and variance, design for ~5-6 Gbps. This is why video streaming is bandwidth-expensive — CDN is essential."
difficulty: 2
