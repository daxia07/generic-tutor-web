# Design a Video Streaming Platform

## Definition
A video streaming platform is a distributed system that ingests, processes, stores, and delivers video content to users at scale, supporting both on-demand and live streaming. It handles the full lifecycle from upload through transcoding into multiple formats and resolutions, cataloging metadata, and adaptively delivering content via CDNs to diverse client devices with varying bandwidth conditions.

## Key Terms
- **Chunked/Resumable Upload**: Breaking a video file into chunks so uploads can resume after failures without re-uploading completed chunks
- **Transcoding**: Converting a source video into multiple codec formats and resolution-bitrate combinations (an encoding ladder) for adaptive delivery
- **Encoding Ladder**: A predefined set of resolution-bitrate tiers (e.g., 1080p/6Mbps, 720p/3Mbps, 480p/1Mbps) used to produce multiple renditions of a video
- **Adaptive Bitrate Streaming (ABR)**: Protocols like HLS or DASH that let the client dynamically switch between renditions based on current network conditions
- **HLS (HTTP Live Streaming)**: Apple's ABR protocol that segments media into small .ts files described by an .m3u8 playlist
- **DASH (Dynamic Adaptive Streaming over HTTP)**: An ISO standard ABR protocol using .mp4 segments described by an MPD manifest
- **CDN (Content Delivery Network)**: A geographically distributed network of edge servers that caches and serves content close to users
- **Push CDN vs Pull CDN**: Push proactively distributes content to edges; Pull fetches content to the edge on first request (origin pull)
- **Pre-warming**: Proactively populating CDN edge caches with predicted-to-be-popular content before user demand spikes
- **Write-Behind Aggregation**: Buffering high-frequency writes (e.g., view counts) in memory and periodically flushing to persistent storage to reduce database load
- **Recommendation-Driven Pre-fetching**: Predictively loading video segments or metadata for content the user is likely to watch next based on recommendation signals
- **Digital Fingerprinting**: Generating compact perceptual hashes of video/audio to detect copyrighted or duplicate content
- **Manifest**: A metadata file (M3U8 for HLS, MPD for DASH) that lists available renditions and segment URLs for the client

## Why It Matters
Video streaming dominates global internet traffic, accounting for over 60% of downstream bandwidth. Designing such a system requires balancing massive scale in ingestion (thousands of uploads per hour), computationally expensive transcoding pipelines, globally distributed delivery with low startup latency, and real-time engagement metrics. Interviewers probe this topic because it touches nearly every system design concept: distributed storage, message queues, caching strategies, eventual consistency, and trade-offs between latency, cost, and quality.

Understanding video streaming design also demonstrates ability to reason about multi-stage data pipelines, CDN economics, and the interplay between batch and real-time processing — all reusable patterns across many large-scale systems.

## Interview Questions
1. "How would you design YouTube?"
2. "How do you handle video uploads that fail midway through a large file?"
3. "How do you deliver smooth playback to users with fluctuating network conditions?"
4. "How would you count views in real-time for a video going viral?"

## Gotchas
- Forgetting that transcoding is the bottleneck — a single video may generate 10+ renditions, and encoding is CPU-intensive
- Using a single monolithic transcoder instead of a distributed pipeline with a job queue
- Assuming CDN caches are always warm — cold starts cause origin floods for new or long-tail content
- Storing view counts in a relational database with per-view writes — this will not scale
- Ignoring live streaming latency — HLS inherently adds 10-30 seconds of delay; lower-latency variants require different segment strategies
- Treating video metadata the same as video blobs — metadata needs low-latency reads; blobs need high-throughput sequential reads
- Assuming one codec fits all — older devices may not support H.265/HEVC or AV1 despite their compression gains

## Questions

### Q1
type: multiple-choice
stem: "What is the primary benefit of chunked (resumable) upload for video files?"
options:
  - A: It reduces the total file size during upload
  - B: It allows the upload to resume from the last successful chunk after a network failure, avoiding re-uploading the entire file
  - C: It enables simultaneous transcoding while uploading
  - D: It compresses each chunk before sending to save bandwidth
correct: B
explanation: "Chunked upload divides the file into independent pieces. If a network failure occurs, only the incomplete chunk needs to be retried. Completed chunks are already stored on the server. This is critical for large video files where network interruptions are likely."
difficulty: 1

### Q2
type: multiple-choice
stem: "Why does a video streaming platform transcode uploaded videos into multiple renditions (an encoding ladder)?"
options:
  - A: To reduce storage costs by keeping only low-resolution copies
  - B: To support adaptive bitrate streaming, allowing clients to switch between quality levels based on available bandwidth
  - C: To encrypt the video content for DRM protection
  - D: To deduplicate identical frames across videos
correct: B
explanation: "An encoding ladder produces multiple resolution-bitrate combinations. The ABR player monitors bandwidth and switches between renditions to avoid rebuffering while maximizing quality. Without multiple renditions, users on slow connections would face constant buffering."
difficulty: 2

### Q3
type: fill-in-blank
stem: "The two dominant adaptive bitrate streaming protocols are HLS and ______."
answers:
  - DASH
  - MPEG-DASH
  - MPEG DASH
explanation: "HLS is Apple's protocol using .ts segments and .m3u8 playlists. DASH (MPEG-DASH) is the ISO standard using .mp4 segments and MPD manifests. Both enable client-side quality switching over HTTP."
difficulty: 1

### Q4
type: fill-in-blank
stem: "To aggregate millions of video view counts without overwhelming the database, platforms use a ______ pattern that buffers increments in memory and periodically flushes them to persistent storage."
answers:
  - write-behind
  - write behind
  - write-behind caching
  - write behind caching
  - write-back
  - write back
explanation: "Write-behind (also called write-back) buffers high-frequency increments in an in-memory counter and periodically batches the accumulated deltas to the database, converting millions of individual writes into periodic batch updates."
difficulty: 3

### Q5
type: select-all
stem: "Which of the following are important considerations when designing a CDN strategy for video streaming?"
options:
  - A: Using pull CDN for long-tail content to avoid wasting edge storage on rarely-watched videos
  - B: Pre-warming edge caches for new releases or predicted viral content to avoid origin floods
  - C: Storing video metadata on the same CDN as video segments for consistency
  - D: Using push CDN for highly popular content to ensure it is available at edges before the first request
  - E: Serving all content from origin servers to avoid cache inconsistency
correct:
  - A
  - B
  - D
explanation: "Pull CDN is cost-effective for long-tail content (only cached when requested). Push CDN ensures popular content is pre-positioned at edges. Pre-warming avoids cold-start origin floods for new releases. Video metadata should not be on the same CDN as segments because metadata needs low-latency reads (often from a database or separate cache), while segments need high-throughput edge delivery. Option E defeats the purpose of a CDN."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Consider a new movie premiere on your platform expected to draw 5M concurrent viewers in the first hour. Step 2: Think about what happens when millions of users request the same video segments simultaneously from CDN edges that have not yet cached them. Step 3: Consider how pre-warming and push CDN could prevent this cold-start problem. Which strategy best prevents the origin server from being overwhelmed at premiere time?"
options:
  - A: Rely on pull CDN alone — the first requests will populate the caches naturally within seconds
  - B: Pre-warm CDN edges by pushing the first few segments of the movie to all edge locations before the premiere, and use push CDN for the full encoding ladder of highly anticipated content
  - C: Serve the premiere directly from origin servers with auto-scaling to handle the spike
  - D: Delay the premiere release by region to stagger the load, avoiding CDN cold-start entirely
correct: B
explanation: "Pre-warming pushes content to edge caches before demand arrives, so the first user in each region gets a cache hit instead of an origin pull. For a premiere, pushing the opening segments (or the full ladder for guaranteed hits) to all edges ensures the origin is not flooded with simultaneous cache-miss requests from every edge. Pull CDN alone risks a thundering herd at origin."
trade_offs: "Push CDN and pre-warming consume edge storage and bandwidth even before viewers arrive (cost overhead). Pull CDN is cheaper for unpredictable demand but risks origin floods during cold starts. A hybrid approach — push for predicted blockbusters, pull for long-tail — balances cost and reliability."
difficulty: 2

### Q7
type: scenario
stem: "Step 1: Consider a user watching a video on a mobile connection that fluctuates between 5 Mbps and 1 Mbps. Step 2: Think about how the ABR player decides when to switch to a lower or higher quality rendition. Step 3: Consider the consequences of switching too aggressively versus too conservatively. What is the key trade-off in ABR algorithm design?"
options:
  - A: Higher quality always provides better user experience, so the algorithm should always prefer the highest possible rendition
  - B: Switching up quickly maximizes quality but risks rebuffering if bandwidth drops; switching down quickly avoids buffering but causes visible quality oscillation — the algorithm must balance rebuffering risk against quality oscillation
  - C: ABR algorithms should use a fixed bitrate matched to the average network speed to avoid any switching
  - D: The server should decide the bitrate for each client to ensure consistent quality across all users
correct: B
explanation: "The core ABR trade-off is between rebuffering (stalling playback) and quality oscillation (frequent resolution switches). Aggressive upswitching maximizes quality but risks rebuffering when bandwidth dips. Conservative switching avoids rebuffering but may stay at low quality longer than necessary or oscillate visibly. Production ABR algorithms use buffer-based and throughput-based heuristics to find the sweet spot."
trade_offs: "Rebuffering is generally worse for user experience than lower quality (users abandon streams that stall). But constant quality switching is also jarring. Buffer-based algorithms (switch when buffer crosses thresholds) are more stable; throughput-based algorithms (switch based on measured bandwidth) react faster but are noisier. Most players combine both."
difficulty: 2

### Q8
type: scenario
stem: "Step 1: Consider that your platform needs to detect copyrighted content in user uploads before publishing. Step 2: Think about how digital fingerprinting works — generating a compact perceptual hash of the audio or video track. Step 3: Consider the pipeline: upload completes, fingerprint is generated, compared against a reference database, and matched content is flagged. Where should fingerprinting occur in the upload-to-publish pipeline and why?"
options:
  - A: After transcoding — fingerprint the transcoded renditions since that is what users will watch
  - B: Before transcoding but after upload completes — fingerprint the source file to catch copyright before spending compute on transcoding, and compare against the reference database with a blocking check before the video enters the transcoding queue
  - C: After publishing — fingerprint in the background and take down flagged content retroactively
  - D: On the client side before upload — fingerprint locally and block the upload before it reaches the server
correct: B
explanation: "Fingerprinting the source file after upload but before transcoding saves the most resources: if the content is blocked, you avoid spending GPU/CPU hours transcoding 10+ renditions of a video that will never be published. A blocking check at this stage is a gate — only fingerprint-cleared videos enter the transcoding pipeline. Fingerprinting after transcoding wastes compute. Fingerprinting after publishing exposes the platform to legal liability during the window before detection."
trade_offs: "Pre-transcoding fingerprinting adds latency to the upload-to-publish pipeline (the fingerprint check must complete before transcoding starts). However, this delay is seconds compared to the minutes or hours of transcoding it can save for blocked content. Client-side fingerprinting (option D) is impractical — it requires shipping the reference database to clients, which is both a security and size problem."
difficulty: 3

### Q9
type: scenario
stem: "Step 1: Consider a platform that serves both live streams and on-demand video. Step 2: Think about how live streaming differs from on-demand: content is generated in real-time, segments are created as the stream progresses, and there is no pre-existing file to transcode. Step 3: Consider the latency requirements — live sports needs sub-5-second delay while standard live can tolerate 10-30 seconds. Step 4: Consider how the transcoding, packaging, and CDN delivery pipeline must differ for live versus on-demand. Which architecture best handles both live and on-demand at scale?"
options:
  - A: Use the same transcoding pipeline for both — transcode live streams into a full encoding ladder just like on-demand videos, with no special handling
  - B: Separate the pipelines: on-demand uses a batch transcoder with a job queue producing the full encoding ladder to object storage; live uses a real-time transcoder that produces a limited ladder (fewer renditions) and streams segments directly to CDN edges with shorter segment durations (1-2 seconds vs 6-10 seconds) for lower latency
  - C: Only support on-demand video and convert live streams to on-demand by recording them first, then transcoding
  - D: Transcode live streams on the client device to reduce server load
correct: B
explanation: "Live and on-demand have fundamentally different requirements. On-demand can afford batch transcoding of the full ladder (more renditions, better compression, two-pass encoding) because the video already exists. Live requires real-time transcoding with strict latency constraints — shorter segments (1-2s for low-latency HLS), fewer renditions (limited ladder to keep encoding within real-time), and direct segment push to CDN edges rather than object storage. Combining both in one pipeline either compromises live latency or on-demand quality."
trade_offs: "Separate pipelines increase operational complexity (two systems to monitor, scale, and maintain). However, a unified pipeline forces compromises: batch encoding settings produce better VOD quality but are too slow for live; live encoding settings are fast but produce lower compression efficiency. Shorter live segments reduce latency but increase manifest/segment overhead and reduce per-segment compression efficiency. The industry standard is separate pipelines with shared infrastructure (same CDN, same player, same monitoring)."
difficulty: 4
