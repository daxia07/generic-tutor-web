# Blob Storage (Object Storage)

## Definition
Blob storage is a data storage architecture that manages unstructured data as objects (blobs) in a flat namespace, unlike file systems with hierarchical directories. Each object has data, metadata, and a unique identifier. It's designed for massive scale, durability, and cost-effective storage of files, images, videos, backups, and logs.

## Key Terms
- **Object/Blob**: A file + metadata + unique key. Immutable (replace, don't modify in place).
- **Bucket/Container**: Top-level namespace for organizing objects (S3 bucket, Azure container).
- **S3 (Amazon)**: The dominant blob storage service. De facto industry standard API.
- **Durability**: S3 offers 11 nines (99.999999999%) durability — data is replicated across facilities.
- **Storage tiers**: Hot (frequent access), cool (infrequent), archive (rare, cheapest). Lifecycle policies auto-tier.
- **Pre-signed URLs**: Temporary URLs granting time-limited access to private objects.
- **Multipart upload**: Upload large files in parallel chunks — faster and resumable.
- **Content-Type**: MIME type header — critical for browsers to handle objects correctly.
- **Event notifications**: Trigger functions/queues when objects are created/deleted (S3 → Lambda).

## Why It Matters
Almost every system design involves storing files somewhere. Blob storage is the default answer — it's cheap, durable, and infinitely scalable. Interviewers expect you to propose it for any file-related requirement.

## Interview Questions
1. "How would you store and serve user-uploaded images?"
2. "How do you handle large file uploads?"
3. "How would you make this storage cost-effective?"

## Gotchas
- Blob storage is not a file system — no in-place modification, no directory listing (simulated with prefixes).
- Egress costs can be surprising — serving content directly from S3 can be expensive at scale (use CDN).
- Pre-signed URLs are the secure way to give clients direct upload/download access.
- Consistency: S3 is now strongly consistent (since Dec 2020) but some services still aren't.
- Don't use blob storage as a database — it's optimized for large objects, not small frequent reads.

## Questions

### Q1
type: scenario
stem: "Your video streaming platform stores 10PB of content. New releases get heavy traffic for 2 weeks, then drop to near-zero. Old content is rarely accessed. How do you design a cost-effective storage tier strategy?"
options:
  - A: Store everything in hot storage for consistent low-latency access
  - B: Use lifecycle policies — hot tier for new releases, then auto-transition to cool and archive tiers
  - C: Store everything in archive tier and pre-warm on demand
  - D: Use a CDN for all content and skip cloud storage
correct: B
explanation: "Cloud blob storage (S3, Azure Blob) offers tiered pricing: hot (frequent access, higher storage cost), cool (infrequent, lower cost), archive (rare access, lowest cost). Lifecycle policies automate tier transitions based on age or access patterns."
trade_offs: "Rehydrating from archive takes hours and incurs egress charges. For content that might go viral unexpectedly, keep it in cool tier rather than archive."
difficulty: 2

### Q2
type: scenario
stem: "Your regulatory compliance requires zero data loss for financial records stored in cloud object storage. The provider claims 99.999999999% (11 nines) durability. How is this achieved?"
options:
  - A: A single RAID array with dual parity drives
  - B: Redundant storage across multiple availability zones with automatic replication and checksums
  - C: Frequent backup to tape and offsite vault
  - D: Client-side encryption with distributed hash tables
correct: B
explanation: "Cloud providers achieve 11 nines durability by replicating data across multiple AZs, adding checksums for bit-rot detection, and automatic self-healing. S3 stores 3+ copies in at least 2 AZs by default."
trade_offs: "Durability ≠ availability. Your data won't be lost, but it might be temporarily inaccessible during an AZ outage. For critical workloads, use cross-region replication."
difficulty: 2

### Q3
type: multiple-choice
stem: "What is the maximum size of a single object in Amazon S3?"
options:
  - A: 1 GB
  - B: 5 GB
  - C: 5 TB
  - D: Unlimited
correct: C
explanation: "A single S3 object can be up to 5 TB. Larger uploads must use multipart upload."
difficulty: 2
