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

### Q4
type: fill-in-blank
stem: "A ______ is a temporary URL that grants time-limited access to a private object in blob storage without exposing the storage credentials."
answers:
  - "pre-signed URL"
  - "presigned URL"
  - "pre signed URL"
  - "signed URL"
  - "SAS token"
  - "shared access signature"
explanation: "Pre-signed URLs (S3) or SAS tokens (Azure) grant temporary access to private objects. The URL contains a signature that expires after a set time, allowing clients to download/upload directly without needing storage account credentials."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are true about blob storage compared to a file system?"
options:
  - A: Objects are immutable — you replace them, not modify in place
  - B: Blob storage supports hierarchical directory listing natively
  - C: Object keys can simulate directories using prefix delimiters (e.g., /)
  - D: Blob storage is optimized for small, frequent random reads
correct:
  - A
  - C
explanation: "Blob storage objects are immutable (A) and use prefix delimiters to simulate directories (C). There is no native hierarchical directory system (B is false), and blob storage is optimized for large objects, not small frequent reads (D is false — use a database for that)."
difficulty: 2

### Q6
type: scenario
stem: "Your photo-sharing app lets users upload images. Currently, your backend receives the upload, then forwards it to S3. This creates a bottleneck — your servers are spending bandwidth and CPU on file transfer. Step 1: Identify the architectural inefficiency. Step 2: Propose a solution that removes your server from the data path. How do you fix this?"
options:
  - A: Upgrade to bigger servers with more bandwidth
  - B: Use pre-signed URLs — the client uploads directly to S3 using a temporary signed URL, bypassing your server entirely
  - C: Store images in the application database as BLOBs
  - D: Use a message queue to buffer uploads
correct: B
explanation: "Pre-signed URLs allow clients to upload directly to S3. Your server only generates the signed URL (a lightweight API call), and the client uploads the file straight to S3. This eliminates the server from the data path, saving bandwidth and reducing latency."
trade_offs: "Direct uploads bypass your server, so you lose the ability to validate file content before it's stored. You must use S3 event notifications (e.g., Lambda trigger on object creation) to validate, resize, or scan uploads after they arrive. Client-side file size limits should also be enforced."
difficulty: 3

### Q7
type: scenario
stem: "Your data analytics pipeline stores daily log files in S3. Each file is 500 MB and grows as traffic increases. Your upload script occasionally fails partway through, leaving corrupted partial files. Step 1: Identify why partial uploads corrupt the object. Step 2: Determine the upload strategy that handles failures gracefully. Step 3: Explain how it enables resumption. What do you implement?"
options:
  - A: Retry the full upload on failure until it succeeds
  - B: Use multipart upload — split the file into chunks, upload in parallel, and any failed chunk can be retried independently; the object is only assembled after all parts complete
  - C: Compress the file before uploading to reduce failure probability
  - D: Use S3 Transfer Acceleration to speed up the upload
correct: B
explanation: "Multipart upload splits large files into parts (minimum 5 MB each except the last). Parts upload in parallel and can be retried individually on failure. The object only becomes visible after the complete multipart upload command is issued, preventing partial/corrupted objects."
trade_offs: "Multipart upload has overhead for small files (not worth it under ~100 MB). Incomplete multipart uploads consume storage and incur charges — you must configure lifecycle rules to abort incomplete uploads after a timeout. Part count has a limit (10,000 parts)."
difficulty: 3

### Q8
type: scenario
stem: "Your video platform serves 50 TB of content per month directly from S3. Your AWS bill shows high egress charges. The product team wants to reduce costs. Step 1: Identify why egress is expensive. Step 2: Propose an architecture that reduces S3 egress while improving user experience. Step 3: Consider cache invalidation for content updates. What do you recommend?"
options:
  - A: Move to a cheaper storage provider
  - B: Put a CDN (e.g., CloudFront) in front of S3 — cache popular content at edge locations, reducing S3 egress and improving latency for users
  - C: Compress all videos to smaller sizes
  - D: Switch to archive tier for all content
correct: B
explanation: "A CDN caches content at edge locations worldwide. Users fetch from the nearest edge cache instead of S3 directly. This reduces S3 egress charges (CDN-to-origin is cheaper than user-to-origin at scale) and dramatically improves latency."
trade_offs: "CDN adds a caching layer that must be invalidated when content changes. Cache invalidation strategies (TTL expiry vs explicit invalidation) trade consistency for cost. CDN has its own egress pricing — model the total cost carefully. For rarely-accessed content, CDN cache miss rates are high and you pay for both CDN and S3 egress."
difficulty: 4
