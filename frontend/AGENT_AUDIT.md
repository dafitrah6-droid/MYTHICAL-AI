# MYTHICAL AI - Agent System Audit Report

**Date:** Current
**Auditor:** Principal AI Architect
**Scope:** Memory Consistency, Task Planning, Tool Routing, Reflection Engine, Execution Pipeline.

---

## 1. Execution Pipeline & Reflection

### 🔴 RISK: Lost Reflection Feedback (Useless Retries)
* **Severity:** **CRITICAL**
* **Location:** `backend/agents/pipeline.ts` & `backend/agents/reasoner.ts`
* **Description:** In the `ExecutionPipeline`, when a task fails reflection, the Critic's feedback is stored in `context.globalContext` (`context.globalContext[..._feedback_...] = reflection.feedback;`). However, the `TaskReasoner` **never reads** `context.globalContext`. When the pipeline retries the task, the Reasoner receives the exact same prompt as the first attempt. This guarantees the agent will repeat the exact same mistake up to `MAX_RETRIES` times, wasting tokens and ensuring task failure.
* **Recommended Fix:** 
  Modify `TaskReasoner.reason` to accept and inject previous failure feedback into its prompt. E.g., `if (retryCount > 0) prompt += "\nPrevious Attempt Feedback: " + context.globalContext[...]`.

### 🔴 RISK: Brittle JSON Parsing (Agent Crashes)
* **Severity:** **HIGH**
* **Location:** `backend/agents/planner.ts`, `backend/agents/reflection.ts`, `backend/services/aiService.ts`
* **Description:** The Planner, Critic, and Memory Extractor rely on `JSON.parse(response.text.trim())`. Even with `responseMimeType: 'application/json'`, LLMs frequently wrap their output in Markdown code blocks (e.g., ````json ... ````). If this happens, `JSON.parse` throws a `SyntaxError`, crashing the agent pipeline entirely.
* **Recommended Fix:** 
  Implement a robust JSON extraction utility that strips Markdown formatting before parsing: `text.replace(/```json\n?|```/g, '').trim()`.

---

## 2. Tool Routing & Reasoning

### 🔴 RISK: The "Telephone Game" Routing Failure
* **Severity:** **HIGH**
* **Location:** `backend/agents/reasoner.ts` -> `backend/tools/router.ts`
* **Description:** The architecture separates Reasoning and Routing into two distinct LLM calls. The Reasoner outputs a plain text "action plan", which is then passed to the `ToolRouter` as a user query to trigger a function call. This causes severe context loss. The Router doesn't know the original objective or task dependencies, it only sees the Reasoner's summarized string. If the Reasoner's string is slightly vague, the Router will fail to select the correct tool or hallucinate arguments.
* **Recommended Fix:** 
  Merge the Reasoner and Router. The Reasoner should be provided with the `tools` configuration directly. Its output should be the actual `functionCall`, eliminating the intermediate text-translation step and reducing latency/cost by 50%.

### 🟠 RISK: Ignored Parallel Tool Calls
* **Severity:** **MEDIUM**
* **Location:** `backend/tools/router.ts` (`routeAndExecute`)
* **Description:** The router explicitly only executes the first tool call: `const call = response.functionCalls[0];`. If the LLM determines that multiple tools need to be executed in parallel (e.g., searching two different queries simultaneously), the subsequent calls are silently dropped, leading to incomplete data and downstream task failure.
* **Recommended Fix:** 
  Iterate over all `response.functionCalls`. Execute them using `Promise.all()` and aggregate the results into a combined `ToolExecutionResult`.

### 🟠 RISK: Brittle Fallback Routing
* **Severity:** **MEDIUM**
* **Location:** `backend/tools/router.ts` (`evaluateFallback`)
* **Description:** The fallback logic relies on strict string matching (`lowerQuery.startsWith('search for')`). Because the input comes from the Reasoner LLM, the phrasing is non-deterministic. If the Reasoner outputs "Please search for..." or "I need to search for...", the fallback silently fails.
* **Recommended Fix:** 
  Remove regex/string-matching fallbacks for LLM outputs. If function calling fails, rely on the Critic to catch the failure and prompt the Reasoner to format its request more clearly.

---

## 3. Memory Consistency

### 🟠 RISK: Memory Duplication & Context Bloat
* **Severity:** **HIGH**
* **Location:** `backend/services/aiService.ts` (`extractMemories`)
* **Description:** The memory extraction engine runs on every user message and blindly inserts new facts into the database. There is no deduplication, consolidation, or conflict resolution. If a user says "I live in NY" and later "I moved to SF", both facts are stored and injected into the context window, confusing the LLM. Over time, duplicate memories will bloat the context window, increasing latency and costs.
* **Recommended Fix:** 
  Implement a Memory Manager agent or logic that retrieves existing memories *before* extraction. Ask the LLM to output operations: `INSERT`, `UPDATE`, or `DELETE` existing memory IDs based on the new conversation context, ensuring a consolidated and accurate state.

---

## 4. Task Planning

### 🟡 RISK: Blind Planning (Tool Ignorance)
* **Severity:** **MEDIUM**
* **Location:** `backend/agents/planner.ts`
* **Description:** The `TaskPlanner` generates a DAG of tasks based *only* on the user's objective. It is not provided with the schemas of the available tools. Consequently, it may plan tasks that the system has no tools to execute (e.g., "Task 3: Call the user's phone"), leading to guaranteed execution failures later in the pipeline.
* **Recommended Fix:** 
  Inject the list of available tool names and descriptions (from `ToolRegistry.getPermittedDeclarations`) into the Planner's `systemInstruction` so it bounds its plans to the system's actual capabilities.
