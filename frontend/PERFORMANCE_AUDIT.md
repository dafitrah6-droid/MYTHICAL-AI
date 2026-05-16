# MYTHICAL AI - Performance Audit Report

**Date:** Current
**Auditor:** Principal AI Architect
**Scope:** API Latency, Database Queries, Cache Efficiency, Tool Execution Speed, Memory Retrieval Speed.

---

## 1. API Latency & Event Loop Blocking

### 🔴 BOTTLENECK: Synchronous Large Payload Parsing
* **Severity:** **CRITICAL**
* **Location:** `backend/server.ts` (`app.use(express.json({ limit: '50mb' }))`) & `components/ChatInterface.tsx`
* **Description:** The frontend reads files as Base64 strings and sends them within the JSON payload. The backend accepts up to 50MB JSON bodies. `JSON.parse()` is synchronous and blocks the Node.js single-threaded event loop. Parsing a 50MB payload will freeze the server for hundreds of milliseconds, causing massive latency spikes and timeouts for *all* concurrent users connected to that pod.
* **Recommended Fix:** 
  Transition to `multipart/form-data` for file uploads using streams (e.g., `multer` or `busboy`). Stream files directly to cloud storage (S3) or process them in chunks without loading the entire file into memory.

### 🔴 BOTTLENECK: Synchronous Document Processing Pipeline
* **Severity:** **CRITICAL**
* **Location:** `backend/services/document.pipeline.ts` (`processDocument`)
* **Description:** Document parsing (PDF extraction), chunking, and embedding generation happen synchronously within the HTTP request lifecycle. A 100-page PDF will require hundreds of sequential API calls to Gemini for embeddings, guaranteeing an HTTP timeout and severe resource starvation.
* **Recommended Fix:** 
  Decouple document processing. The API should upload the file, create a `processing` DB record, and immediately return a `202 Accepted`. Offload the actual parsing and embedding to a background worker queue (e.g., BullMQ backed by Redis).

---

## 2. Database Queries & Integrity

### 🟠 BOTTLENECK: Unbounded Database Queries
* **Severity:** **HIGH**
* **Location:** `backend/services/chat.service.ts` (`getConversations`) & `backend/services/memory.service.ts` (`getUserMemories`)
* **Description:** Queries like `SELECT * FROM conversations WHERE user_id = $1` lack `LIMIT` and `OFFSET` (or cursor-based pagination). As users accumulate months of history, these queries will return massive datasets, consuming excessive DB memory, network bandwidth, and Node.js heap space.
* **Recommended Fix:** 
  Implement cursor-based pagination for all list endpoints. Default to fetching the most recent 20-50 items.

### 🟠 BOTTLENECK: Vector Search Pre-filtering Inefficiency
* **Severity:** **HIGH**
* **Location:** `backend/services/retrieval.service.ts` (`semanticSearch`)
* **Description:** The query uses `pgvector`'s HNSW index but applies a strict pre-filter (`WHERE d.user_id = $2`). In PostgreSQL, if the pre-filter eliminates a large portion of the dataset, the query planner might abandon the HNSW index and perform an exact K-NN sequential scan, destroying search performance at scale.
* **Recommended Fix:** 
  Include the `user_id` directly in the `document_chunks` table to avoid the `JOIN` during vector search. Consider using partitioned tables by `user_id` (if feasible) or utilize `pgvector`'s iterative index scans properly by ensuring the index is optimized for highly filtered queries.

### 🟡 SCALING RISK: Connection Pool Exhaustion
* **Severity:** **MEDIUM**
* **Location:** `backend/db.ts`
* **Description:** The Postgres pool is configured with `max: 20`. With the Kubernetes HPA scaling up to 20 pods, this results in 400 active connections to the database. Standard Postgres instances degrade in performance with high connection counts due to process-per-connection overhead.
* **Recommended Fix:** 
  Deploy a connection pooler like **PgBouncer** in transaction-pooling mode in front of the database, and reduce the Node.js pool size to `max: 5-10` per pod.

---

## 3. Cache Efficiency

### 🟠 BOTTLENECK: Uncached Authorization Checks
* **Severity:** **HIGH**
* **Location:** `backend/security/policies.ts` (`canAccessConversation`, `canAccessDocument`)
* **Description:** Every time a user sends a message or accesses a file, the system queries the database to verify ownership. This adds 10-50ms of latency to the critical path of every chat interaction.
* **Recommended Fix:** 
  Cache resource ownership in Redis (e.g., `SET resource_owner:conv_<id> <user_id>`). Invalidate or update the cache when a resource is created or deleted.

### 🟡 BOTTLENECK: Non-Atomic Rate Limiter
* **Severity:** **MEDIUM**
* **Location:** `backend/security/middleware.ts` (`rateLimiter`)
* **Description:** The rate limiter uses sequential Redis commands (`incr` followed by `expire`). This requires two network round-trips to Redis per API request.
* **Recommended Fix:** 
  Use a Redis `MULTI/EXEC` pipeline or a Lua script to execute the increment and expire atomically in a single network round-trip.

---

## 4. Tool Execution & Agent Orchestration

### 🔴 BOTTLENECK: Sequential Task Execution in DAG
* **Severity:** **HIGH**
* **Location:** `backend/agents/pipeline.ts` (`run`)
* **Description:** The `TaskPlanner` generates a Directed Acyclic Graph (DAG) of tasks with dependencies. However, the `ExecutionPipeline` iterates through them sequentially (`for (const task of tasks)`). Independent tasks are not executed in parallel, drastically increasing the total time to complete an objective.
* **Recommended Fix:** 
  Implement a concurrent execution engine. Traverse the DAG and use `Promise.all()` to execute tasks concurrently as soon as their specific dependencies are met.

### 🟠 BOTTLENECK: Sequential Embedding Generation
* **Severity:** **HIGH**
* **Location:** `backend/services/document.pipeline.ts`
* **Description:** Chunks are embedded one by one in a `for` loop. Network latency to the Gemini API compounds linearly (e.g., 100 chunks * 200ms = 20 seconds).
* **Recommended Fix:** 
  Batch embedding requests. Send multiple chunks in a single `embedContent` API call (if supported by the specific Gemini SDK version), or use `Promise.all` with a concurrency limiter (e.g., `p-limit`) to process 5-10 chunks simultaneously.

---

## 5. Memory Retrieval Speed

### 🟠 BOTTLENECK: Unbounded Context Window Growth
* **Severity:** **HIGH**
* **Location:** `backend/services/aiService.ts` (`processChat`)
* **Description:** The system injects *all* user memories into the system prompt (`${memories.map(m => ...).join('\n')}`). As the user accumulates hundreds of memories, the prompt size grows massively. This increases the Time-To-First-Token (TTFT) latency from the LLM and wastes token bandwidth.
* **Recommended Fix:** 
  Implement Semantic Memory Retrieval. Instead of injecting all memories, embed the user's current query, perform a vector search against a `memories` vector table, and inject only the top 3-5 most relevant memories into the context window.
