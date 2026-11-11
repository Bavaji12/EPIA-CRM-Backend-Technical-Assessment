# EPIA CRM Backend Technical Assessment — Video Demonstration Script

**Target Duration:** 3:00 – 4:30 Minutes  
**Audience:** EPIA Technical Interviewers and Senior Engineering Leadership  
**Tone:** Professional, articulate, structured, and confident  

---

### [0:00 – 0:30] Introduction & Architecture Overview
**Speaker Visual:** Screen showing VS Code workspace, project structure, and terminal.

> *"Hello and welcome. My name is [Your Name], and today I am presenting the backend system for the EPIA CRM Technical Assessment.*
>
> *This solution is built using Node.js, Express.js, SQLite powered by `better-sqlite3`, and tested with Jest and Supertest. It implements three core modules:*
> 1. *A resilient Patient Appointment API with full input validation and persistent storage.*
> 2. *A simulated Meta WhatsApp Business Cloud API integration featuring OAuth error 190 handling, failure tracking, and privacy-preserving logging.*
> 3. *A CRM Patient Follow-Up system with database-enforced duplicate prevention and lifecycle status management.*
>
> *Let us now inspect the live functionality."*

---

### [0:30 – 1:15] Task 1: Appointment Creation & Retrieval
**Speaker Visual:** Postman / Thunder Client or terminal running curl commands.

> *"We start the server with `npm start`. The server boots on port 3000, enforces foreign keys, and initializes our SQLite schema.*
>
> *In the original legacy code, incoming payloads failed because `express.json()` was omitted, IDs were loosely compared, and data vanished on restart. We resolved all of these issues.*
>
> *Let us create a new appointment for patient 'Eleanor Vance' on date '2026-11-20':*
>
> `POST /api/appointments`
>
> *We receive an `HTTP 201 Created` with a unique auto-incremented appointment ID, timestamp, and sanitized patient details.*
>
> *Next, let's retrieve this record with:*
>
> `GET /api/appointments/1`
>
> *The system returns `HTTP 200 OK`. If we query a non-existent ID such as `/api/appointments/999`, the centralized error handler returns an explicit `HTTP 404 Not Found`. Invalid input types return `HTTP 400 Bad Request`."*

---

### [1:15 – 2:15] Task 2: WhatsApp Integration & OAuth Error 190 Handling
**Speaker Visual:** Sending WhatsApp reminders via Postman, inspecting response and SQLite messages table.

> *"Now let's examine Task 2: Simulated WhatsApp reminders.*
>
> *In production, healthcare messaging interacts with Meta's Graph API. We must handle authentication failures without crashing the application.*
>
> *First, we send a successful reminder:*
>
> `POST /api/whatsapp/send-reminder`  
> Body: `{ "appointmentId": 1, "phone": "9876543210", "message": "Your consultation is tomorrow.", "simulationMode": "success" }`
>
> *We receive `HTTP 200 OK` with status `'sent'` and a simulated provider message ID like `SIM-74291`. Note that 'sent' means accepted by the provider gateway, pending delivery.*
>
> *Now, we simulate Meta API OAuth error 190—which happens when an access token expires or is revoked:*
>
> `POST /api/whatsapp/send-reminder`  
> Body: `{ "appointmentId": 1, "phone": "9876543210", "message": "Appointment reminder", "simulationMode": "invalid_token" }`
>
> *The system captures the OAuthException, updates the database message record to `'failed'` with error code `190`, and safely returns `HTTP 502 Bad Gateway`.*
>
> *Notice two key features: the application did not crash, and sensitive tokens and phone numbers are masked in our console logs for HIPAA/privacy compliance.*
>
> *We can verify the full audit trail with `GET /api/whatsapp/messages`."*

---

### [2:15 – 3:15] Task 3: CRM Follow-Up Management & Pending Retrieval
**Speaker Visual:** Postman showing follow-up endpoints.

> *"Moving to Task 3: Patient Follow-Up Management.*
>
> *Following an appointment, care coordinators must track patient recovery. We create a follow-up for appointment #1 scheduled for '2026-11-22':*
>
> `POST /api/followups`  
> Body: `{ "appointmentId": 1, "followupDate": "2026-11-22", "notes": "Post-procedure checkup" }`
>
> *The record is saved with status `'pending'`.*
>
> *Care coordinators can query all outstanding tasks with:*
>
> `GET /api/followups/pending`
>
> *Notice that this endpoint automatically performs a SQL JOIN with the `appointments` table, returning patient name, phone number, and appointment date, sorted in ascending order of follow-up date."*

---

### [3:15 – 4:00] Duplicate Follow-Up Prevention & Completion Lifecycle
**Speaker Visual:** Triggering duplicate follow-up (HTTP 409) and completing follow-up.

> *"A critical requirement of this assessment is duplicate follow-up prevention.*
>
> *If an operator accidentally attempts to schedule another follow-up for the same appointment on that same date '2026-11-22':*
>
> *We immediately receive `HTTP 409 Conflict`.*
>
> *This is not just checked in application memory; it is strictly enforced by a database-level composite `UNIQUE (appointment_id, followup_date)` constraint in SQLite.*
>
> *Next, once the patient is contacted, we complete the follow-up:*
>
> `PATCH /api/followups/1/complete`
>
> *The status transitions to `'completed'`, `updated_at` is refreshed, and the record is returned. Calling this endpoint again is completely safe and idempotent."*

---

### [4:00 – 4:30] Persistence, Testing, & Conclusion
**Speaker Visual:** Running `npm test` in terminal.

> *"Finally, let us review data persistence and test coverage.*
>
> *Because we use SQLite file-backed storage in WAL mode, all appointments, follow-ups, and message logs survive complete server restarts.*
>
> *Let us run the automated test suite:*
>
> `npm test`
>
> *All 32 test cases across Appointments, WhatsApp simulation, and Follow-ups pass with zero errors in an isolated test database.*
>
> *Thank you for your time and consideration. I look forward to discussing the architecture further during our technical interview."*

