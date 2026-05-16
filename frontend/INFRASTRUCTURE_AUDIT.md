# MYTHICAL AI - Infrastructure Audit Report

**Date:** Current
**Auditor:** Principal Cloud/Infrastructure Architect
**Scope:** Docker Configs, Kubernetes Configs, Auto Scaling, Failure Recovery, Backup Systems.

---

## 1. Containerization & Runtime

### 🔴 RISK: Node.js PID 1 Signal Handling
* **Severity:** **HIGH**
* **Location:** `Dockerfile` (`CMD ["node", "dist/backend/server.js"]`)
* **Description:** Node.js is running as PID 1 in the container. Node.js does not properly handle OS signals (like `SIGTERM` or `SIGINT`) when running as PID 1, nor does it reap zombie processes. In Kubernetes, this causes graceful shutdown to fail or timeout, leading to forcefully killed pods (`SIGKILL`), dropped active connections, and potential data corruption during rolling updates.
* **Recommended Fix:** 
  Wrap the Node process with an init system like `dumb-init` or `tini`. 
  *Fix:* `RUN apk add --no-cache dumb-init` and change CMD to `CMD ["dumb-init", "node", "dist/backend/server.js"]`.

---

## 2. Kubernetes Orchestration & Failure Recovery

### 🔴 RISK: Cascading Failures via Liveness Probes
* **Severity:** **CRITICAL**
* **Location:** `k8s/app-deployment.yaml` (`livenessProbe` hitting `/health`)
* **Description:** The `/health` endpoint in `server.ts` checks the database and Redis connections. Because the `livenessProbe` uses this endpoint, if the database experiences a brief latency spike or failover, the liveness probe will fail. Kubernetes will respond by restarting the API pods. Restarting the API pods during a database struggle creates a "thundering herd" of reconnection attempts, turning a minor DB blip into a complete cluster outage.
* **Recommended Fix:** 
  Decouple Liveness and Readiness. 
  - **Liveness Probe:** Should hit a static endpoint (e.g., `/ping` returning 200 OK) to verify the Node.js event loop is not deadlocked.
  - **Readiness Probe:** Should hit `/health` to verify DB/Redis connectivity, ensuring traffic isn't routed to a pod that can't serve it, without killing the pod.

### 🟠 RISK: Missing Pod Disruption Budget (PDB)
* **Severity:** **HIGH**
* **Location:** `k8s/` (Missing Configuration)
* **Description:** While `podAntiAffinity` is configured, there is no `PodDisruptionBudget`. During a managed Kubernetes cluster upgrade or node scaling event, the control plane could evict all replicas of the `mythical-ai-core` deployment simultaneously, causing total downtime.
* **Recommended Fix:** 
  Create a `PodDisruptionBudget` ensuring at least 1 or 2 replicas are always available (`minAvailable: 2` or `maxUnavailable: 1`).

---

## 3. Auto Scaling Limits

### 🟠 RISK: HPA Thrashing via Memory Metrics
* **Severity:** **HIGH**
* **Location:** `k8s/hpa.yaml` (`averageUtilization: 80` for memory)
* **Description:** Scaling Node.js applications based on memory utilization is an anti-pattern. Node.js uses a lazy garbage collector; memory usage will naturally climb towards the heap limit before GC runs. The HPA will interpret this natural heap growth as load, triggering false-positive scale-ups. When GC finally runs, memory drops, causing scale-downs. This results in constant HPA thrashing.
* **Recommended Fix:** 
  Remove the memory target from the HPA. Scale primarily on CPU utilization (e.g., 70%), or implement custom metrics scaling (e.g., using Prometheus Adapter to scale based on concurrent HTTP requests or event loop lag).

---

## 4. Backup Systems & Data Durability

### 🔴 RISK: Ephemeral Disk Exhaustion during Backups
* **Severity:** **CRITICAL**
* **Location:** `k8s/backup-cronjob.yaml`
* **Description:** The backup script dumps the entire database to the container's local filesystem (`/tmp/mythical_backup_...`). As the database grows (e.g., 50GB+), this will exceed the node's ephemeral storage limits or the container's `emptyDir` limits, causing the backup pod to crash with `No space left on device`. Backups will silently fail at scale.
* **Recommended Fix:** 
  Stream the backup directly to S3 without writing to disk.
  *Fix:* `pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://$BACKUP_BUCKET_NAME/database/backup_${TIMESTAMP}.sql.gz`

### 🟠 RISK: Dynamic Package Installation in Production
* **Severity:** **MEDIUM**
* **Location:** `k8s/backup-cronjob.yaml` (`yum install -y postgresql-client gzip`)
* **Description:** The CronJob dynamically installs packages at runtime. If the package repository is down, network is restricted, or package versions change, the backup fails. It also increases the attack surface and execution time.
* **Recommended Fix:** 
  Build a dedicated, immutable Docker image for backups that pre-installs `postgresql-client`, `gzip`, and `aws-cli`. Reference this custom image in the CronJob.

### 🟠 RISK: Unacceptable Recovery Point Objective (RPO)
* **Severity:** **HIGH**
* **Location:** `k8s/backup-cronjob.yaml`
* **Description:** The system relies solely on a daily CronJob for backups. In a production AI system storing user memories, documents, and conversations, a 24-hour RPO (potential data loss of up to 24 hours) is unacceptable.
* **Recommended Fix:** 
  Implement Continuous Archiving and Point-in-Time Recovery (PITR) using tools like `pgBackRest` or `WAL-G`. The daily cronjob can serve as a logical fallback, but WAL archiving is required for production database durability.

---

## 5. CI/CD & Deployment Pipeline

### 🟡 RISK: Configuration Drift (Anti-GitOps)
* **Severity:** **MEDIUM**
* **Location:** `.github/workflows/production.yml`
* **Description:** The pipeline uses `sed` to mutate the `app-deployment.yaml` file during the run and applies it directly to the cluster. The Git repository no longer reflects the actual state of the cluster (the image tag in Git remains `latest`, while the cluster runs a specific `sha`). Rollbacks via Git revert become impossible.
* **Recommended Fix:** 
  Adopt a GitOps workflow. Use `kustomize` to patch the image tag, and either commit the updated manifest back to a deployment repository, or use a GitOps controller like ArgoCD or Flux to sync the cluster state with the repository.
