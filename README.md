Live Link: https://epia-crm-backend-technical-assessment-bjey6snnu-bavaji12.vercel.app/
# EPIA CRM Backend Technical Assessment

![CI Pipeline](https://github.com/Bavaji12/EPIA-CRM-Backend-Technical-Assessment/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/Tests-32%20passed-brightgreen)
![Node](https://img.shields.io/badge/Node.js-18%20%7C%2020%20%7C%2022%20%7C%2024-blue)
![License](https://img.shields.io/badge/License-ISC-green)

A production-style RESTful backend for the EPIA CRM system developed with Node.js, Express.js, and SQLite. This system delivers appointment management, simulated Meta WhatsApp Business Cloud API reminders with OAuth error 190 handling, and CRM follow-up tracking with database-enforced duplicate prevention.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technologies Used](#2-technologies-used)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Prerequisites](#4-prerequisites)
5. [Installation Instructions](#5-installation-instructions)
6. [Environment Setup](#6-environment-setup)
7. [Database Initialization](#7-database-initialization)
8. [How to Start the Server](#8-how-to-start-the-server)
9. [API Documentation & Curl Examples](#9-api-documentation--curl-examples)
10. [Example Requests and Responses](#10-example-requests-and-responses)
11. [HTTP Status Codes](#11-http-status-codes)
12. [SQLite Schema Explanation](#12-sqlite-schema-explanation)
13. [WhatsApp OAuth Error 190 Diagnosis (Part A)](#13-whatsapp-oauth-error-190-diagnosis-part-a)
14. [Message Failure Handling](#14-message-failure-handling)
15. [Duplicate Follow-Up Prevention](#15-duplicate-follow-up-prevention)
16. [Automated Testing](#16-automated-testing)
17. [Limitations](#17-limitations)
18. [Production Improvement Recommendations](#18-production-improvement-recommendations)
19. [Postman Collection & Verification Flow](#19-postman-collection--verification-flow)
20. [GitHub Upload Instructions](#20-github-upload-instructions)

---

## 1. Project Overview

The **EPIA CRM Backend** provides core patient relationship management functionality:
- **Appointment Management:** Resolves critical legacy bugs (missing JSON body parsing, loose type comparisons, lack of schema validation, and ephemeral in-memory storage) by persisting validated records to SQLite.
- **Simulated WhatsApp Reminders:** Emulates the Meta WhatsApp Business Cloud API. Supports simulated success, OAuth error 190 (`OAuthException`), temporary 503 provider outages, and network failures without crashing the application or exposing sensitive credentials.
- **CRM Follow-Up Workflow:** Tracks pending patient post-consultation care tasks. Prevents duplicate follow-ups for the same appointment and date using a database-level composite unique constraint, and exposes idempotent completion endpoints.

---

## 2. Technologies Used

- **Runtime:** Node.js (v18+ / v20+ / v24+)
- **Framework:** Express.js (v5.x)
- **Database Engine:** SQLite (via `better-sqlite3` v13.x with synchronous C-bindings and WAL mode)
- **Validation:** `express-validator` with custom date and phone format validators
- **HTTP Client / Simulation:** `axios`
- **Environment Management:** `dotenv`
- **Testing Framework:** `jest` and `supertest`
- **Cross-Platform Compatibility:** `cross-env`

---

## 3. Project Folder Structure

```
epia-crm-backend/
│
├── src/
│   ├── config/
│   │   └── database.js            # SQLite connection, WAL mode, foreign keys & schema setup
│   │
│   ├── controllers/
│   │   ├── appointmentController.js # Appointment CRUD operations
│   │   ├── whatsappController.js    # WhatsApp reminder & message history handlers
│   │   └── followupController.js    # CRM follow-up management & completion
│   │
│   ├── routes/
│   │   ├── appointmentRoutes.js     # /api/appointments routes
│   │   ├── whatsappRoutes.js        # /api/whatsapp routes
│   │   └── followupRoutes.js        # /api/followups routes
│   │
│   ├── services/
│   │   └── whatsappService.js       # Simulated WhatsApp provider & OAuth 190 handler
│   │
│   ├── middleware/
│   │   ├── errorHandler.js          # Centralized error handler & custom error classes
│   │   └── validate.js              # express-validator schemas for all endpoints
│   │
│   ├── utils/
│   │   └── logger.js                # Masked structured logger (redacts tokens & patient phones)
│   │
│   ├── app.js                       # Express app configuration & middleware pipeline
│   └── server.js                    # Server bootstrap & graceful shutdown hooks
│
├── database/
│   ├── .gitkeep                     # Keeps database directory tracked in git
│   └── epia_crm.db                  # Persistent SQLite database file (auto-generated)
│
├── tests/
│   ├── appointment.test.js          # Appointment endpoint test suite
│   ├── whatsapp.test.js             # WhatsApp simulation & error 190 test suite
│   └── followup.test.js             # Follow-up lifecycle & constraint test suite
│
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore configuration
├── package.json                     # Project manifest and test runner configuration
├── epia_crm_postman_collection.json # Exported Postman collection (v2.1)
├── DEMO_SCRIPT.md                   # 3-5 minute presentation demonstration script
├── TECHNICAL_EXPLANATION.md         # Architecture explanation (<300 words)
└── README.md                        # Complete project documentation
```

---

## 4. Prerequisites

- **Node.js**: `v18.0.0` or later (tested on Node `v24.13.0`)
- **npm**: `v9.0.0` or later (tested on npm `v11.6.2`)
- **OS**: Windows, macOS, or Linux

---

## 5. Installation Instructions

### Windows (PowerShell)
```powershell
# 1. Clone repository or navigate to workspace
cd E:\EPIA-CRM-Backend-Technical-Assessment

# 2. Install all dependencies
npm install

# 3. Create .env configuration file
Copy-Item .env.example .env
```

### Linux / macOS (Bash)
```bash
# 1. Clone repository or navigate to workspace
cd epia-crm-backend

# 2. Install all dependencies
npm install

# 3. Create .env configuration file
cp .env.example .env
```

---

## 6. Environment Setup

Create `.env` in the root folder with the following variables:

```env
# Server Port & Environment
PORT=3000
NODE_ENV=development

# Persistent SQLite Database Path
DB_PATH=./database/epia_crm.db

# WhatsApp Simulation Settings (No real Meta credentials required)
WHATSAPP_SIMULATION_ENABLED=true
META_ACCESS_TOKEN=simulated_meta_access_token_placeholder
META_PHONE_NUMBER_ID=simulated_phone_number_id_placeholder
```

---

## 7. Database Initialization

The database initializes **automatically** on application startup. You do not need to run manual SQL migrations.

When `initDb()` is called:
1. The database directory `./database` is created if missing.
2. SQLite `foreign_keys = ON` is enabled to enforce relational integrity.
3. Write-Ahead Logging (`journal_mode = WAL`) is enabled for high concurrency.
4. Tables `appointments`, `messages`, and `followups` are created if they do not exist.
5. Indexes (`idx_appointments_date`, `idx_messages_appointment`, `idx_followups_status_date`) are created.

---

## 8. How to Start the Server

### Production / Standard Mode
```bash
npm start
```

### Development Mode (with automatic restart via nodemon)
```bash
npm run dev
```

### Expected Startup Output
```
[INFO]  2026-11-11T05:04:05.596Z - Initializing SQLite database at: .../database/epia_crm.db
[INFO]  2026-11-11T05:04:05.613Z - Database schema initialized successfully.
[INFO]  2026-11-11T05:04:05.615Z - EPIA CRM Backend Server is running on port 3000
[INFO]  2026-11-11T05:04:05.615Z - Environment: development
[INFO]  2026-11-11T05:04:05.615Z - Health check: http://localhost:3000/health
```

---

## 9. API Documentation & Curl Examples

### Summary of Endpoints

| Method | Endpoint | Description | Expected Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health and uptime check | 200 OK |
| `POST` | `/api/appointments` | Create a new patient appointment | 201 Created |
| `GET` | `/api/appointments/:id` | Retrieve appointment by ID | 200 OK / 404 Not Found |
| `GET` | `/api/appointments` | Retrieve all appointments (sorted by date) | 200 OK |
| `POST` | `/api/whatsapp/send-reminder` | Dispatch simulated WhatsApp appointment reminder | 200 OK / 502 Bad Gateway |
| `GET` | `/api/whatsapp/messages` | Retrieve message dispatch and failure logs | 200 OK |
| `POST` | `/api/followups` | Schedule a new patient follow-up | 201 Created / 409 Conflict |
| `GET` | `/api/followups/pending` | Retrieve all pending follow-ups with patient details | 200 OK |
| `GET` | `/api/followups` | Retrieve all follow-ups (supports `?status=...`) | 200 OK |
| `GET` | `/api/followups/:id` | Retrieve an individual follow-up by ID | 200 OK / 404 Not Found |
| `PATCH` | `/api/followups/:id/complete`| Mark a follow-up as completed (idempotent) | 200 OK / 404 Not Found |

---

## 10. Example Requests and Responses

### 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-11T05:10:00.000Z",
  "uptime": 12.34
}
```

---

### 2. Create Appointment
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Eleanor Vance",
    "phone": "9876543210",
    "date": "2026-11-20"
  }'
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "id": 1,
    "name": "Eleanor Vance",
    "phone": "9876543210",
    "date": "2026-11-20",
    "created_at": "2026-11-11 05:10:00",
    "updated_at": "2026-11-11 05:10:00"
  }
}
```

---

### 3. Get Appointment By ID
```bash
curl -X GET http://localhost:3000/api/appointments/1
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Eleanor Vance",
    "phone": "9876543210",
    "date": "2026-11-20",
    "created_at": "2026-11-11 05:10:00",
    "updated_at": "2026-11-11 05:10:00"
  }
}
```

---

### 4. Get All Appointments
```bash
curl -X GET http://localhost:3000/api/appointments
```
**Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "name": "Eleanor Vance",
      "phone": "9876543210",
      "date": "2026-11-20",
      "created_at": "2026-11-11 05:10:00",
      "updated_at": "2026-11-11 05:10:00"
    }
  ]
}
```

---

### 5. Send Simulated WhatsApp Reminder (Success)
```bash
curl -X POST http://localhost:3000/api/whatsapp/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": 1,
    "phone": "9876543210",
    "message": "Your consultation is scheduled for tomorrow at 10:00 AM.",
    "simulationMode": "success"
  }'
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reminder processed successfully",
  "status": "sent",
  "messageId": "SIM-74291"
}
```
*Note: In WhatsApp messaging, status `'sent'` indicates acceptance by the provider gateway, not confirmed on-device delivery.*

---

### 6. Simulate WhatsApp OAuth Error 190 (Failure)
```bash
curl -X POST http://localhost:3000/api/whatsapp/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": 1,
    "phone": "9876543210",
    "message": "Reminder: Consultation tomorrow.",
    "simulationMode": "invalid_token"
  }'
```
**Response (502 Bad Gateway):**
```json
{
  "success": false,
  "error": "WhatsApp provider error: Invalid OAuth access token",
  "details": {
    "messageRecordId": 2,
    "status": "failed",
    "errorCode": 190,
    "providerDetails": {
      "error": {
        "message": "Invalid OAuth access token",
        "type": "OAuthException",
        "code": 190,
        "error_subcode": 463,
        "fbtrace_id": "SIM_FB_TRACE_190"
      }
    }
  }
}
```

---

### 7. Get WhatsApp Message Audit History
```bash
curl -X GET http://localhost:3000/api/whatsapp/messages
```
**Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 2,
      "appointment_id": 1,
      "phone": "9876543210",
      "message": "Reminder: Consultation tomorrow.",
      "status": "failed",
      "provider_message_id": null,
      "error_code": 190,
      "error_message": "Invalid OAuth access token",
      "created_at": "2026-11-11 05:12:15",
      "updated_at": "2026-11-11 05:12:15",
      "patient_name": "Eleanor Vance"
    },
    {
      "id": 1,
      "appointment_id": 1,
      "phone": "9876543210",
      "message": "Your consultation is scheduled for tomorrow at 10:00 AM.",
      "status": "sent",
      "provider_message_id": "SIM-74291",
      "error_code": null,
      "error_message": null,
      "created_at": "2026-11-11 05:11:00",
      "updated_at": "2026-11-11 05:11:00",
      "patient_name": "Eleanor Vance"
    }
  ]
}
```

---

### 8. Create Follow-Up
```bash
curl -X POST http://localhost:3000/api/followups \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": 1,
    "followupDate": "2026-11-22",
    "notes": "Verify patient pain level and medication compliance"
  }'
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Follow-up created successfully",
  "data": {
    "id": 1,
    "appointment_id": 1,
    "followup_date": "2026-11-22",
    "status": "pending",
    "notes": "Verify patient pain level and medication compliance",
    "created_at": "2026-11-11 05:14:00",
    "updated_at": "2026-11-11 05:14:00",
    "patient_name": "Eleanor Vance",
    "patient_phone": "9876543210",
    "appointment_date": "2026-11-20"
  }
}
```

---

### 9. Trigger Duplicate Follow-Up (Duplicate Prevention)
```bash
curl -X POST http://localhost:3000/api/followups \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": 1,
    "followupDate": "2026-11-22",
    "notes": "Attempting second follow-up on same day"
  }'
```
**Response (409 Conflict):**
```json
{
  "success": false,
  "error": "A follow-up is already scheduled for appointment #1 on 2026-11-22. Duplicate follow-ups for the same appointment and date are not allowed."
}
```

---

### 10. Get Pending Follow-Ups
```bash
curl -X GET http://localhost:3000/api/followups/pending
```
**Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "appointment_id": 1,
      "followup_date": "2026-11-22",
      "status": "pending",
      "notes": "Verify patient pain level and medication compliance",
      "created_at": "2026-11-11 05:14:00",
      "updated_at": "2026-11-11 05:14:00",
      "patient_name": "Eleanor Vance",
      "patient_phone": "9876543210",
      "appointment_date": "2026-11-20"
    }
  ]
}
```

---

### 11. Mark Follow-Up Completed (Idempotent)
```bash
curl -X PATCH http://localhost:3000/api/followups/1/complete
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Follow-up marked as completed successfully",
  "data": {
    "id": 1,
    "appointment_id": 1,
    "followup_date": "2026-11-22",
    "status": "completed",
    "notes": "Verify patient pain level and medication compliance",
    "created_at": "2026-11-11 05:14:00",
    "updated_at": "2026-11-11 05:16:30",
    "patient_name": "Eleanor Vance",
    "patient_phone": "9876543210",
    "appointment_date": "2026-11-20"
  }
}
```

---

### 12. Get All Follow-Ups with Status Filter
```bash
curl -X GET "http://localhost:3000/api/followups?status=completed"
```
**Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "appointment_id": 1,
      "followup_date": "2026-11-22",
      "status": "completed",
      "notes": "Verify patient pain level and medication compliance",
      "created_at": "2026-11-11 05:14:00",
      "updated_at": "2026-11-11 05:16:30",
      "patient_name": "Eleanor Vance",
      "patient_phone": "9876543210",
      "appointment_date": "2026-11-20"
    }
  ]
}
```

---

## 11. HTTP Status Codes

The API strictly adheres to REST standards:

- `200 OK`: Successful retrieval or idempotent resource modification.
- `201 Created`: Resource successfully created and saved in SQLite.
- `400 Bad Request`: Invalid payload syntax, malformed JSON, or missing required fields.
- `404 Not Found`: Target resource (appointment or follow-up) does not exist.
- `409 Conflict`: Business or database constraint violation (duplicate follow-up for the same appointment and date).
- `500 Internal Server Error`: Unexpected runtime error.
- `502 Bad Gateway`: External provider error (e.g., Meta OAuth code 190 failure, network timeout).
- `503 Service Unavailable`: Temporary provider outage / maintenance simulation.

---

## 12. SQLite Schema Explanation

### `appointments` Table
Stores patient consultation bookings.
```sql
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,             -- ISO YYYY-MM-DD
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `messages` Table
Tracks WhatsApp notifications, gateway acknowledgment IDs, and provider error codes.
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  provider_message_id TEXT,
  error_code INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);
```

### `followups` Table
Tracks patient care checkups.
```sql
CREATE TABLE followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
  followup_date TEXT NOT NULL,     -- ISO YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT uq_appointment_followup_date UNIQUE (appointment_id, followup_date)
);
```

---

## 13. WhatsApp OAuth Error 190 Diagnosis (Part A)

When integrating with the Meta WhatsApp Business Cloud API, the following error response may be received:

```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```

### 1. Most Likely Causes
- **Expired Access Token:** Temporary User or System User access tokens expire (often after 24 hours or 60 days).
- **Invalid Access Token:** A truncated, malformed, or altered string was supplied in the `Authorization: Bearer <token>` header.
- **Revoked Token:** The token was manually deauthorized in Meta Business Manager, or the associated developer user changed their password or reset app credentials.
- **Incorrect Environment Configuration:** The server loaded a placeholder token or an environment variable intended for a staging/sandbox app instead of the production WhatsApp Business Account (WABA).

### 2. Investigation and Resolution Steps
1. **Verify Token Validity with Meta Debugging Tools:**
   Use Meta's official [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) (`graph.facebook.com/debug_token?input_token={token}&access_token={app-token}`). Inspect:
   - Token validity (`is_valid: true|false`).
   - Token expiration timestamp (`expires_at`).
   - Scopes (`whatsapp_business_messaging`, `whatsapp_business_management`).
2. **Verify Account & Phone Number Association:**
   Verify that the access token belongs to a System User with Admin permissions over the WABA and that the `phone_number_id` is assigned to that System User.
3. **Generate a Permanent System User Token:**
   In Meta Business Manager > System Users, create a permanent token with `whatsapp_business_messaging` permissions to avoid session expiration.
4. **Secure Secret Management:**
   Store tokens strictly in encrypted environment variables or secrets vaults (e.g., AWS Secrets Manager, HashiCorp Vault). Never hardcode tokens in repository code.
5. **Redaction & Privacy:**
   Ensure logging middleware scrubs authentication headers and token values (`[REDACTED]`) to prevent credential leakage in audit logs.

### 3. Investigation Flow: When API Accepts Message But It Is Not Delivered
If Meta responds with `HTTP 200` and a message ID (`wamid.HBgL...`), the message was **accepted** by the gateway, but delivery is not guaranteed. Investigate:
1. **WhatsApp Message ID Tracking:** Record the returned `wamid` in the `messages` table.
2. **Meta Webhook Subscriptions:**
   Subscribe to Meta's `messages` webhook to monitor delivery receipts:
   - `sent` -> `delivered` (device received) -> `read` (user opened).
   - If delivery fails, inspect `statuses[0].errors` in the webhook payload.
3. **Recipient Number Status:**
   Verify that the recipient phone number is active and registered on WhatsApp, and that the country code is correctly formatted in E.164 without dashes or spaces.
4. **Template Approval & Language Code:**
   When initiating conversations outside the 24-hour customer service window, you must use approved Meta Message Templates. If the template name, language code (e.g., `en_US` vs `en`), or variable count does not match Meta's approved version, Meta silently drops or rejects delivery.
5. **24-Hour Messaging Window:**
   Free-form text messages are rejected if sent outside 24 hours of the patient's last inbound message. Only approved utility/reminder templates can be sent.

### 4. Failure Monitoring & Operational Telemetry
- **Structured Error Logging:** Log every provider failure with error codes and sanitized metadata.
- **Circuit Breaker / Alerting:** If consecutive 190 errors occur, trigger immediate PagerDuty/Slack alerts indicating expired credentials.
- **Selective Retry Logic:**
  - **Never retry** client errors or fatal auth errors (400, 401, OAuth 190, invalid template). Retrying with an invalid token will only result in rate-limiting or account lockout.
  - **Only retry** transient network failures (503 Service Unavailable, network timeouts, ECONNRESET) using exponential backoff with jitter.

---

## 14. Message Failure Handling

In `src/services/whatsappService.js`:
- The service initiates every dispatch by recording a message record in `messages` with status `'pending'`.
- All external HTTP calls are wrapped in `try/catch`.
- If an error occurs (such as OAuth 190, 503 outage, or socket reset), the database record is immediately updated to `status = 'failed'`, capturing `error_code` and `error_message`.
- An `ExternalServiceError` is passed to Express's centralized error handler, which sends an `HTTP 502 Bad Gateway` or `HTTP 503 Service Unavailable` response to the client.
- **The Express application never crashes**, and subsequent requests are processed without degradation.

---

## 15. Duplicate Follow-Up Prevention

Duplicate follow-ups on the same date for the same patient appointment could result in duplicate outreach.

### Implementation:
1. **Database-Level Unique Constraint:**
   ```sql
   CONSTRAINT uq_appointment_followup_date UNIQUE (appointment_id, followup_date)
   ```
2. **Error Translation:**
   When an insert violates this constraint, `better-sqlite3` throws `SQLITE_CONSTRAINT_UNIQUE`.
3. **HTTP 409 Conflict:**
   The controller and centralized error handler capture this specific violation and return an `HTTP 409 Conflict` response with a clear message:
   ```json
   {
     "success": false,
     "error": "A follow-up is already scheduled for appointment #1 on 2026-11-22. Duplicate follow-ups for the same appointment and date are not allowed."
   }
   ```
4. **Permitted Workflows:**
   - The same appointment **can** have follow-ups on different dates (e.g., Day 2 and Day 7).
   - Different appointments **can** have follow-ups on the same date.

---

## 16. Automated Testing

The automated test suite uses **Jest** and **Supertest**. Tests run against an isolated SQLite database (`./database/test_epia_crm.db`), leaving your development database untouched.

### Run All Tests
```bash
npm test
```

### Test Coverage Highlights
- **`tests/appointment.test.js` (10 tests):**
  - Create appointment with valid payload (HTTP 201).
  - Validation rejects missing name, invalid phone, invalid date, and malformed bodies (HTTP 400).
  - Retrieve existing appointment (HTTP 200).
  - Return 404 for non-existent appointment ID and 400 for invalid ID format.
  - Retrieve all appointments ordered by date, returning empty array `[]` when none exist.
- **`tests/whatsapp.test.js` (8 tests):**
  - Send simulated reminder successfully (HTTP 200, status `'sent'`).
  - Simulate OAuth error code 190, verifying HTTP 502 and SQLite `'failed'` log.
  - Simulate temporary 503 failure and network timeout.
  - Verify application survives failures and processes subsequent requests normally.
  - Retrieve full message dispatch history.
- **`tests/followup.test.js` (14 tests):**
  - Create follow-up with default pending status (HTTP 201).
  - Reject non-existent appointment (HTTP 404).
  - Enforce database UNIQUE constraint rejecting duplicate date follow-ups (HTTP 409).
  - Allow different dates for the same appointment and same date for different appointments.
  - Retrieve pending follow-ups with patient details sorted by date ascending.
  - Complete follow-up idempotently and touch `updated_at`.
  - Filter follow-ups by status (`?status=completed` / `?status=pending`).

---

## 17. Limitations

1. **Single-Node SQLite:** SQLite operates via local file locks. It is ideal for single-instance applications, developer workstations, and edge appliances, but multi-node horizontal autoscaling requires a clustered database such as PostgreSQL.
2. **Synchronous Simulation:** In the simulated environment, reminders complete synchronously within the request-response cycle. In enterprise production, message dispatch should be queued.
3. **No Inbound Webhook Listener:** The current assessment does not include an exposed public endpoint for receiving real Meta inbound webhook receipts (`delivered`, `read`).

---

## 18. Production Improvement Recommendations

1. **Database Migration to PostgreSQL:**
   Replace SQLite with PostgreSQL (via Prisma or Knex) with read-replicas, connection pooling (PgBouncer), and automated point-in-time recovery (PITR).
2. **Asynchronous Message Queue:**
   Adopt BullMQ / RabbitMQ with Redis to process WhatsApp notifications asynchronously with dead-letter queues (DLQ) and exponential backoff retry policies.
3. **Meta Webhook Ingestion Service:**
   Implement a verified Meta Webhook endpoint (`GET /webhook` verification token handshake and `POST /webhook` signature verification via `X-Hub-Signature-256`) to update message statuses from `'sent'` to `'delivered'` and `'read'`.
4. **Security & Access Control:**
   Implement JWT-based authentication with Role-Based Access Control (RBAC), API rate-limiting via `express-rate-limit`, and CORS origin whitelisting.
5. **Observability & APM:**
   Incorporate OpenTelemetry distributed tracing and Prometheus/Grafana metrics to track gateway response latencies and authentication error rates.

---

## 19. Postman Collection & Verification Flow

A pre-configured Postman Collection is included at [`epia_crm_postman_collection.json`](./epia_crm_postman_collection.json).

### Recommended Verification Flow
1. Start server with `npm start`.
2. Import `epia_crm_postman_collection.json` into Postman or Thunder Client.
3. Execute the requests in sequence:
   - **Step 1:** Create Appointment (`POST /api/appointments`)
   - **Step 2:** Retrieve Appointment (`GET /api/appointments/1`)
   - **Step 3:** Send Simulated WhatsApp Reminder (`POST /api/whatsapp/send-reminder` with `simulationMode: "success"`)
   - **Step 4:** Simulate OAuth Error 190 (`POST /api/whatsapp/send-reminder` with `simulationMode: "invalid_token"`)
   - **Step 5:** Verify Messages History (`GET /api/whatsapp/messages` showing `'sent'` and `'failed'`)
   - **Step 6:** Create Follow-Up (`POST /api/followups`)
   - **Step 7:** Retrieve Pending Follow-Ups (`GET /api/followups/pending`)
   - **Step 8:** Attempt Duplicate Follow-Up on same date (Verify `HTTP 409 Conflict`)
   - **Step 9:** Complete Follow-Up (`PATCH /api/followups/1/complete`)
   - **Step 10:** Verify status is completed (`GET /api/followups?status=completed`)

---

## 20. GitHub Upload Instructions

To upload this completed project to your GitHub repository:

```bash
# 1. Initialize git repository if not already initialized
git init

# 2. Stage all files
git add .

# 3. Commit changes
git commit -m "feat: complete EPIA CRM backend technical assessment"

# 4. Set default branch to main
git branch -M main

# 5. Add remote GitHub repository URL
git remote add origin https://github.com/<your-username>/epia-crm-backend.git

# 6. Push to GitHub
git push -u origin main
```

# EPIA-CRM-Backend-Technical-Assessment
