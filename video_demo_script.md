# 5-Minute Demo Video Recording Script

Follow this script step-by-step while recording your screen (using OBS, Loom, or Windows Xbox Game Bar `Win + G`).

---

### Step 1: Introduction & Login (0:00 - 0:45)
**Screen to show**: Browser at `http://localhost:3000` on the Login page.  
**What to say**:
> *"Hi Mitrajit and Yadav036! Welcome to my submission for the ReachInbox Distributed Email Scheduler assignment.  
> The system is built with Express, TypeScript, Redis, BullMQ, Prisma, and a modern React dashboard.  
> Let's sign in using the One-Click Evaluator Login."*

**Action**: Click the **"One-Click Evaluator Login"** button.

---

### Step 2: Dashboard Overview & Ethereal SMTP (0:45 - 1:15)
**Screen to show**: Main Dashboard with Stats cards.  
**What to say**:
> *"Here on the dashboard, we have real-time metric cards showing our Scheduled Queue, Sent Deliveries, and a live Sliding Window Hourly Quota progress bar.  
> Notice in the top navigation bar, the backend has auto-provisioned an active Ethereal SMTP test account for sandbox delivery verification."*

---

### Step 3: Scheduling Single & Batch Emails (1:15 - 2:30)
**Screen to show**: Click **"Schedule Email"** to open the Compose Modal.  
**What to say**:
> *"Now let's schedule an email. The modal supports single recipients or bulk lead uploads with CSV parsing.  
> I'll enter a recipient: `prospect@acme.com`, a subject, and personalize the body with the `{{name}}` template tag.  
> Under delivery schedule, I'll select 'In 10 sec (Demo)' and click Confirm."*

**Action**:
1. Fill in fields and click **Confirm & Schedule Email**.
2. Show the **Scheduled Queue** tab. Point out the live countdown timer showing `in 10s... in 8s... in 5s`.
3. When the timer hits 0, point out that BullMQ automatically processes the job.
4. Switch to the **Delivered (Sent)** tab.
5. Click the **"View Email"** button. This opens the rendered email in Ethereal's web viewer!

> *"As you can see, the email transitioned smoothly from Scheduled to Sent without manual page reloads. Clicking 'View Email' opens the authentic rendered HTML email directly on Ethereal."*

---

### Step 4: Server Restart Scenario & Persistence (2:30 - 3:45)
**Screen to show**: Browser + Backend Terminal side-by-side.  
**What to say**:
> *"Now let's demonstrate the critical requirement: persistence across server restarts.  
> I will schedule a demo batch of 3 emails spaced 5 seconds apart by clicking 'Demo Batch'."*

**Action**:
1. Click **"Demo Batch (3 emails)"**.
2. Show the 3 emails in the Scheduled Queue with countdowns.
3. Switch to the Backend Terminal and press `Ctrl + C` to **terminate the backend server**.
4. Point out in the browser: the emails remain persisted in the SQLite/Prisma database.
5. In the terminal, start the server again: `npm run dev`.
6. Highlight the console output:
   `[Reconciliation] Running persistence recovery check on startup... Verified pending emails (restored into queue)`.
7. Watch the frontend: the BullMQ worker resumes processing, and the remaining emails dispatch at their scheduled times and move to the Sent tab!

> *"Notice how the boot-time reconciliation service automatically detected the pending scheduled jobs in the database, re-queued them with their remaining delay in BullMQ, and dispatched them cleanly with zero duplicates."*

---

### Step 5: Rate Limiting & Inter-Email Delay Under Load (3:45 - 4:30)
**Screen to show**: Terminal or click "Spike Rate Limit Test".  
**What to say**:
> *"Next, let's look at rate limiting and concurrency. The backend implements a Redis sliding-window algorithm that enforces both an hourly sender limit and an inter-email delay.  
> When I click 'Spike Rate Limit Test', the system enqueues multiple rapid dispatches.  
> Looking at the terminal logs, the worker detects that consecutive emails violate the minimum delay and throttles them, gracefully re-delaying overflowing jobs rather than failing or dropping them."*

---

### Step 6: Conclusion (4:30 - 5:00)
**Screen to show**: Full Dashboard.  
**What to say**:
> *"To summarize:  
> - We achieved sub-second BullMQ delayed scheduling without fragile polling cron jobs.  
> - We guaranteed crash recovery through database reconciliation and idempotent task keys.  
> - We enforced strict sliding-window rate limiting and worker concurrency.  
> - And we provided a clean, responsive TypeScript frontend with live previews and reusable UI components.  
> Thank you for reviewing my assignment!"*
