# ReachInbox Distributed Email Scheduler & Outreach Dashboard

A high-performance, fault-tolerant cold email scheduling service and modern web dashboard designed for cold outreach automation. Built to handle delayed job dispatching, crash-recovery persistence, strict per-sender sliding-window rate limiting, controlled concurrency, and automated delivery verification via Ethereal SMTP sandboxing.

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
   - [How Scheduling Works](#1-how-scheduling-works)
   - [How Persistence on Restart is Handled](#2-how-persistence-on-restart-is-handled)
   - [How Rate Limiting & Concurrency are Implemented](#3-how-rate-limiting--concurrency-are-implemented)
2. [Features Implemented (Requirement Mapping)](#-features-implemented)
3. [Prerequisites & Tech Stack](#-prerequisites--tech-stack)
4. [How to Set Up Ethereal Email & Environment Variables](#-how-to-set-up-ethereal-email--environment-variables)
5. [How to Run the Application](#-how-to-run-the-application)
   - [Quick Start (Windows 1-Click)](#option-a-quick-start-windows-1-click)
   - [Manual Step-by-Step (Backend, Worker, Frontend)](#option-b-manual-step-by-step)
   - [Docker Setup (Redis & PostgreSQL)](#option-c-docker-compose-optional)
6. [Demo Video Walkthrough Script (5-Minute Guide)](#-demo-video-walkthrough-script-max-5-minutes)
7. [Testing & Verification](#-testing--verification)
8. [Assumptions, Shortcuts & Trade-offs](#-assumptions-shortcuts--trade-offs)
9. [Submission & Repository Access](#-submission--repository-access)

---

## 🏛️ Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React + Vite Frontend                           │
│  (Dashboard, Live Countdown, Reusable UI, Compose Modal, CSV Upload)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express API (Producer)                          │
│     - Validates payload schemas via Zod                                │
│     - Writes email records to Database (Prisma Source of Truth)        │
│     - Calculates delay & pushes delayed job to BullMQ                  │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               ▼                                          ▼
   ┌───────────────────────┐                  ┌───────────────────────┐
   │  Database (SQLite/PG) │                  │     Redis 7 / 8       │
   │  (Permanent Records)  │                  │  - BullMQ Queue       │
   │  - Statuses           │                  │  - Sliding Window     │
   │  - Ethereal Previews  │                  │  - Inter-email Delay  │
   └───────────▲───────────┘                  └───────────▲───────────┘
               │                                          │
               └────────────────────┬─────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BullMQ Background Worker                         │
│   - Controlled Concurrency (e.g. concurrency: 5)                       │
│   - Enforces Sender Sliding-Window Quota & Inter-Email Delays          │
│   - Transmits email payload via Ethereal SMTP                          │
│   - Captures Ethereal preview URLs and updates DB status to 'SENT'     │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. How Scheduling Works
* Traditional polling via `setInterval` or native `cron` jobs suffers from drift, high database CPU overhead, and uncoordinated duplicate executions across instances.
* Instead, this system utilizes **BullMQ delayed jobs backed by Redis sorted sets (ZSET)**.
* When a user schedules an email for future timestamp `T`:
  1. The API creates an `EmailJob` record in the database with status `SCHEDULED`.
  2. The target delay is computed: `delay = Math.max(0, T - Date.now())`.
  3. The job is enqueued in BullMQ with an idempotent identifier: `jobId = email_<db_id>`.
  4. BullMQ stores the task score equal to `timestamp = now + delay` in Redis.
  5. The BullMQ worker wakes up precisely when the delay expires without continuous database polling.

### 2. How Persistence on Restart is Handled
Persistence is critical: if an API node, background worker, or Redis instance restarts mid-flight, emails must neither be lost nor duplicated.
* **Database as Single Source of Truth**: Every campaign and email is recorded in the persistent database prior to being queued.
* **Idempotent Job Identifiers**: Jobs are keyed as `email_<id>`. Re-adding an existing job to BullMQ will not duplicate the task.
* **Boot-Time Reconciliation Service (`ReconciliationService.reconcile()`)**:
  - Upon server or worker startup, the reconciliation engine queries all pending records from the database where `status IN ('SCHEDULED', 'QUEUED')`.
  - It cross-checks Redis to verify if the corresponding BullMQ delayed job is actively scheduled.
  - If a job was lost (e.g., Redis restart without AOF or unexpected container termination), the service calculates the remaining delay `Math.max(0, scheduledAt - Date.now())` and re-enqueues it.
  - If the scheduled timestamp matured while the server was offline, the delay is set to `0`, ensuring it dispatches immediately upon service recovery.
  - Any tasks stuck in `SENDING` state due to an ungraceful crash are safely recovered and re-queued.

### 3. How Rate Limiting & Concurrency are Implemented
* **Worker Concurrency**:
  - The BullMQ worker is instantiated with a configurable concurrency parameter (`concurrency: 5`). This limits parallel SMTP socket connections to Ethereal, preventing network socket exhaustion and memory starvation.
* **Redis Sliding-Window Rate Limiting**:
  - Configurable hourly sender limit (`MAX_EMAILS_PER_HOUR`, default `60`) and inter-email delay (`MIN_DELAY_BETWEEN_EMAILS_MS`, default `2000ms`).
  - Utilizes a Redis sorted set per sender (`ratelimit:sender:<email>:window`) where dispatch timestamps are recorded as scores.
  - Atomic pipeline:
    1. Removes expired entries: `ZREMRANGEBYSCORE key 0 (now - 3600000)`.
    2. Counts current window dispatches: `ZCARD key`.
    3. Checks elapsed time since previous dispatch via `ratelimit:sender:<email>:last_sent`.
* **Graceful Backpressure / Auto-Rescheduling**:
  - If a sender reaches their hourly quota, the worker calculates the exact wait time until the earliest window slot frees up (`oldest_timestamp + 3600000 - now`).
  - The overflowing job is automatically delayed and pushed into the next window—**jobs are never dropped or discarded**.

---

## 🚀 Features Implemented

### Backend Features
| Feature | Implementation Details |
|---|---|
| **Scheduler Engine** | BullMQ delayed jobs with Redis sorted sets. Supports exact future ISO timestamps, immediate execution, and staggered delays. |
| **Persistence on Restart** | Database source of truth + startup reconciliation engine (`ReconciliationService`) ensuring 0 lost jobs on reboot. |
| **Rate Limiter** | Redis sliding window tracking rolling hourly sender quotas and inter-email delays. Automatic job re-delay on limit exceedance. |
| **Concurrency Control** | Configurable worker concurrency (`WORKER_CONCURRENCY=5`) for controlled parallel dispatching. |
| **Ethereal SMTP Integration**| Auto-generates test accounts or uses `.env` credentials. Captures live preview URLs (`nodemailer.getTestMessageUrl`). |
| **Batch Campaigns** | Multi-recipient batch scheduling with staggered delivery intervals and dynamic personalization (`{{name}}`, `{{recipient}}`). |
| **Idempotency** | Unique job IDs (`email_<id>`) preventing duplicate dispatches across retries and restarts. |
| **Analytics & Metrics API** | Live metrics for scheduled, sent, failed, and hourly rate limit consumption. |

### Frontend Features
| Feature | Implementation Details |
|---|---|
| **Reusable UI Components** | Modular, strongly-typed components: `Button`, `Input`, `Textarea`, `Select`, `Badge`, `Modal`, `Table`, `Tabs`, `Spinner`, `Card`, `EmptyState`, `Toast`. |
| **Authentication View** | Modern sign-in view with a 1-click **"Evaluator Login"** button for immediate access without manual signup. |
| **Main Dashboard** | Metric cards, active rate limiter meter, real-time background polling every 3s for seamless state changes. |
| **Scheduled Emails Table** | Live real-time countdown timer (`in 14s`), recipient info, subject, status badge, and one-click cancel action. |
| **Sent Emails Table** | Delivery timestamp, delivery badge, and clickable **"View Email"** button opening the live Ethereal sandbox preview! |
| **Compose Modal** | Dual-mode: single recipient or bulk lead list (paste or upload `.csv`/`.txt`), quick delay buttons ("In 10s", "In 30s", "In 1m", or custom datetime). |
| **Demo Assistant Bar** | 1-click **"Demo Batch (3 emails)"** and **"Spike Rate Limit Test"** buttons designed specifically for the 5-minute video demonstration. |
| **UX & Error Handling** | Animated loading spinners, toast notifications, empty states with actionable buttons, and clean error alerts. |

---

## 🛠️ Prerequisites & Tech Stack
- **Node.js**: v18+ (tested on Node.js v24.15)
- **Redis**: v5.0+ (Redis 8.10 installed locally or via Docker)
- **Database**: SQLite (default, zero setup required) or PostgreSQL via Prisma
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS, Lucide Icons

---

## 📧 How to Set Up Ethereal Email & Environment Variables

### Automatic Setup (Zero Friction)
On the very first launch, if `SMTP_USER` and `SMTP_PASS` are left empty, the backend **automatically generates a fresh Ethereal test account**, logs the credentials to the console, and connects immediately!

### Manual Setup
1. Visit [https://ethereal.email/create](https://ethereal.email/create) and generate a test SMTP account.
2. Open `backend/.env` (or copy from `backend/.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="file:./dev.db"

   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379

   WORKER_CONCURRENCY=5
   MAX_EMAILS_PER_HOUR=60
   MIN_DELAY_BETWEEN_EMAILS_MS=2000

   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_ethereal_username@ethereal.email
   SMTP_PASS=your_ethereal_password

   DEFAULT_SENDER=scheduler@reachinbox-demo.com
   JWT_SECRET=reachinbox_super_secret_jwt_key_2026
   ```

---

## 💻 How to Run the Application

### Option A: Quick Start (Windows 1-Click)
Double-click `start-all.bat` in the project root. This will:
1. Launch Redis server on port 6379.
2. Start the Backend API & BullMQ worker on port 5000.
3. Start the Frontend React dashboard on port 3000.
4. Open `http://localhost:3000` in your default browser.

---

### Option B: Manual Step-by-Step

#### 1. Start Redis
Make sure Redis is running on `127.0.0.1:6379`:
```bash
redis-server
```

#### 2. Start Backend API & Worker
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
*Note: In development mode, `npm run dev` runs both the Express API and the BullMQ background worker simultaneously.*  
*To run them in separate terminals, set `SEPARATE_WORKER=true` in `.env`, run `npm run dev:server` in terminal 1, and `npm run dev:worker` in terminal 2.*

#### 3. Start Frontend UI
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

### Option C: Docker Compose (Optional)
If you prefer running Redis and PostgreSQL inside Docker:
```bash
docker compose up -d
```
Then update `backend/.env` with:
```env
DATABASE_URL="postgresql://reachinbox_user:reachinbox_secure_password@localhost:5432/reachinbox_db?schema=public"
```

---

## 🎥 Demo Video Walkthrough Script (Max 5 Minutes)

Use this step-by-step checklist to record your evaluation video:

| Timestamp | Action | What to Explain & Demonstrate |
|---|---|---|
| **0:00 - 0:45** | **Login & Overview** | Click **"One-Click Evaluator Login"**. Tour the dashboard: Stats cards, Hourly Quota progress bar, and Ethereal mailbox link. |
| **0:45 - 2:00** | **Creating Scheduled Emails** | 1. Click **"Schedule Email"**.<br>2. Select "In 10 sec (Demo)", enter subject & body with `{{name}}` tag, and submit.<br>3. Point out the live countdown timer (`in 10s`) in the **Scheduled** tab.<br>4. Watch it automatically transition to the **Sent** tab upon maturing.<br>5. Click **"View Email"** to open the real Ethereal rendered email preview! |
| **2:00 - 3:15** | **Server Restart Resilience** | 1. Click **"Demo Batch (3 emails)"** or schedule an email for 30 seconds into the future.<br>2. **Kill the backend terminal (`Ctrl + C`)** to simulate an unexpected server crash.<br>3. Highlight that the email remains safely stored in the database.<br>4. Restart the backend (`npm run dev`).<br>5. Point to the console log: `[Reconciliation] Verified pending emails (restored into queue)`.<br>6. Show the frontend: the email reaches its scheduled time and dispatches successfully! |
| **3:15 - 4:15** | **Rate Limiting & Concurrency Under Load** | 1. Click **"Spike Rate Limit Test"** or run `npm run test:rate-limit` in the backend.<br>2. Show how the worker throttles rapid requests and logs `[Worker RateLimit] Sender rate-limited. Waiting Xms`.<br>3. Explain how BullMQ delays overflowing tasks to preserve sender reputation. |
| **4:15 - 5:00** | **Summary & Architecture Wrap-up** | Conclude with a recap: BullMQ queue, Redis sliding window, Prisma persistence, Ethereal sandboxing, and zero-downtime crash recovery. |

---

## 🧪 Testing & Verification

### 1. Automated Rate Limiting Script
Run the built-in rate limit verification suite:
```bash
npm run test:rate-limit
```
This tests:
- Immediate dispatch allowance
- Inter-email delay enforcement (2-second spacing)
- Hourly quota exhaustion and next-window delay computation

### 2. Manual API Scheduling via cURL / Postman
```bash
curl -X POST http://localhost:5000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "evaluator@reachinbox.ai",
    "subject": "Scheduled Outreach via Postman",
    "body": "Hi there! Testing BullMQ delayed delivery.",
    "scheduledAt": "'$(date -u -d '+15 seconds' +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

---

## 💡 Assumptions, Shortcuts & Trade-offs

1. **Database Default (SQLite vs. PostgreSQL)**:
   - *Decision*: Configured SQLite as the default datasource with Prisma.
   - *Rationale*: Eliminates external database installation hurdles for evaluators (`Mitrajit` and `Yadav036`), allowing the project to run out of the box with `npx prisma db push`.
   - *Trade-off*: SQLite handles single-writer concurrency well for assessments. For massive horizontal multi-node production clusters, switching `provider = "postgresql"` in `prisma/schema.prisma` takes 1 minute.
2. **Worker Process Bundling**:
   - *Decision*: In development mode, the worker can run inside the server process or independently as a standalone worker process (`src/worker.ts`).
   - *Rationale*: Running both in a single terminal simplifies local testing and demo recording, while keeping `worker.ts` completely decoupled for enterprise production deployments.
3. **Ethereal Mail Sandbox**:
   - *Decision*: Auto-provisions a fresh Ethereal account if `.env` keys are empty.
   - *Rationale*: Prevents reviewers from needing to register an SMTP account manually before testing.

---

## 📦 Submission & Repository Access

- **Private Repository Collaborators**: Access granted to:
  - `Mitrajit`
  - `Yadav036`
- **Assignment Submission Form**: [ClickUp Submission Form](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)
