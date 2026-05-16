# MYTHICAL AI - Security Audit Report

**Date:** Current
**Auditor:** Principal AI Architect
**Scope:** Authentication, Session Security, Encryption, Access Policies, Input Validation, Prompt Injection Defense.

---

## 1. Authentication & Session Security

### 🔴 RISK: Unauthenticated Session Creation (Authentication Bypass)
* **Severity:** **CRITICAL**
* **Location:** `backend/api/router.ts` (`POST /auth/session`)
* **Description:** The session creation endpoint accepts a `userId` directly from the request body and issues a valid session token without verifying any credentials (e.g., password hash). An attacker can impersonate any user, including admins, simply by knowing or guessing their UUID.
* **Recommended Fix:** 
  Implement proper credential verification. The endpoint must accept `email` and `password`, fetch the user record, and use a secure comparison (e.g., `bcrypt.compare`) against the `password_hash` before generating a session token.

### 🟠 RISK: Token Storage Vulnerability (Frontend)
* **Severity:** **MEDIUM**
* **Location:** Frontend Architecture
* **Description:** While the backend generates secure tokens, the frontend architecture does not specify secure storage. If tokens are stored in `localStorage`, they are highly vulnerable to Cross-Site Scripting (XSS) attacks.
* **Recommended Fix:** 
  Transition to `HttpOnly`, `Secure`, `SameSite=Strict` cookies for session management to mitigate XSS token theft.

---

## 2. Tool Routing & Execution

### 🔴 RISK: Server-Side Request Forgery (SSRF)
* **Severity:** **CRITICAL**
* **Location:** `backend/tools/registry.ts` (`apiRequest` tool)
* **Description:** The API request tool attempts to block internal network access using a naive string-matching blocklist (`localhost`, `127.`, `10.`). This misses critical cloud metadata endpoints (e.g., AWS `169.254.169.254`), other private CIDR blocks (`172.16.0.0/12`, `192.168.0.0/16`), `0.0.0.0`, and IPv6 loopbacks (`::1`).
* **Recommended Fix:** 
  Use a robust SSRF prevention library. Resolve the target URL to an IP address *before* making the request and validate the resolved IP against a comprehensive list of reserved/private CIDR blocks. Disable HTTP redirects to prevent DNS rebinding attacks.

### 🔴 RISK: Remote Code Execution (RCE) via Naive Sandbox
* **Severity:** **CRITICAL**
* **Location:** `backend/tools/registry.ts` (`executeCode` tool)
* **Description:** The code execution tool relies on a regex/string blocklist (`process.exit`, `os.system`, `eval`) to prevent malicious code. This is trivially bypassed in Python and Node.js (e.g., `getattr(__import__('os'), 'system')` or using unicode escapes).
* **Recommended Fix:** 
  Never rely on static analysis or blocklists for code execution. Code must be executed in a strictly isolated, ephemeral sandbox (e.g., gVisor, Firecracker microVMs, or heavily restricted Docker containers with dropped capabilities and no network access).

### 🔴 RISK: Insecure Direct Object Reference (IDOR) in Tool Execution
* **Severity:** **HIGH**
* **Location:** `backend/tools/registry.ts` (`analyzeFile` tool)
* **Description:** The `analyzeFile` tool accepts a `fileId` but does not verify if the file belongs to the user executing the tool. An attacker could prompt the AI to analyze a guessed `fileId`, causing the AI to leak the contents of another user's private file.
* **Recommended Fix:** 
  Pass the `userId` into the tool execution context and enforce an ownership check against the database before allowing the tool to read or analyze the file.

---

## 3. Data Protection & Integrity

### 🔴 RISK: Unencrypted Sensitive Data at Rest
* **Severity:** **HIGH**
* **Location:** `backend/services/memory.service.ts`
* **Description:** The `EncryptionService` is implemented, and the `DbMemory` schema includes an `is_encrypted` flag. However, `MemoryService.addMemory` inserts plaintext content directly into the database without invoking `EncryptionService.encrypt()`.
* **Recommended Fix:** 
  Integrate `EncryptionService.encrypt()` in `MemoryService.addMemory` before database insertion, and `EncryptionService.decrypt()` in `getUserMemories` upon retrieval. Ensure the `is_encrypted` flag is set to `true`.

---

## 4. Input Validation & File Handling

### 🔴 RISK: Denial of Service (DoS) via Excessive Payload Limit
* **Severity:** **HIGH**
* **Location:** `backend/server.ts`
* **Description:** The Express JSON body parser is configured with `app.use(express.json({ limit: '50mb' }));`. This allows attackers to send massive, deeply nested JSON payloads, easily exhausting Node.js memory (OOM) and crashing the server.
* **Recommended Fix:** 
  Reduce the JSON body limit to a safe threshold (e.g., `2mb`). Handle large file uploads via `multipart/form-data` (using libraries like `multer`) with streaming directly to cloud storage, rather than processing base64-encoded files in memory.

### 🔴 RISK: Insecure File Type Validation
* **Severity:** **HIGH**
* **Location:** `backend/services/document.pipeline.ts`
* **Description:** `DocumentPipeline.processDocument` trusts the client-provided `mimeType` string. An attacker can upload a malicious executable or script and simply set the `mimeType` header to `application/pdf` or `text/plain` to bypass the check.
* **Recommended Fix:** 
  Validate file types using "magic bytes" (file signatures) via a library like `file-type` on the backend buffer, completely ignoring the client-provided MIME type for security decisions.

---

## 5. Prompt Injection Defense

### 🟠 RISK: Ineffective Prompt Injection Blocklist
* **Severity:** **MEDIUM**
* **Location:** `backend/security/validators.ts`
* **Description:** `SecurityValidators.isPromptSafe` uses a static regex blocklist (e.g., `/ignore previous instructions/i`) to detect prompt injection. LLMs are highly susceptible to bypasses using synonyms, role-playing framing, or encoding, making static regex highly ineffective.
* **Recommended Fix:** 
  Replace regex blocklists with a dedicated LLM-based prompt guard (e.g., passing the prompt to a smaller, specialized classification model to detect malicious intent) or utilize strict structured input framing (e.g., separating system instructions from user data using distinct API parameters, which the Gemini API partially handles via `systemInstruction`).

### 🟠 RISK: Naive XSS Sanitization
* **Severity:** **MEDIUM**
* **Location:** `backend/security/validators.ts`
* **Description:** `sanitizeInput` uses basic string replacement (`replace(/</g, '&lt;')`). While React escapes output by default, relying on custom, non-comprehensive sanitization logic on the backend can lead to edge-case bypasses if the data is ever rendered outside of React (e.g., in an email template or PDF report).
* **Recommended Fix:** 
  Use a robust, industry-standard sanitization library like `DOMPurify` if HTML is expected, or rely strictly on parameterized queries (already done) and frontend framework escaping.
