# EPIA CRM Backend — Technical Explanation

### 1. Identifying Original Appointment API Bugs
Code inspection of the legacy implementation exposed critical defects: omitted `express.json()` middleware leaving `req.body` unparsed; loose type comparison (`req.params.id == id`) causing route mismatches; absent input validation; and volatile in-memory array storage that lost all patient records on process restarts. We resolved these by implementing explicit input validation, strict type coercion, persistent relational storage, and centralized error handling.

### 2. Database Selection: SQLite with WAL
SQLite via `better-sqlite3` was chosen for its embedded zero-configuration architecture, synchronous C-binding execution speed, and ACID guarantees without external database daemon overhead. Enabling Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and foreign key constraints (`PRAGMA foreign_keys = ON`) ensures transactional integrity and fast concurrent reads.

### 3. Preventing Duplicate Follow-Ups
Duplicate prevention is enforced directly at the database engine level via a composite `UNIQUE(appointment_id, followup_date)` table constraint. Duplicate insert attempts throw `SQLITE_CONSTRAINT_UNIQUE`, which our centralized error handler catches and maps to a descriptive `HTTP 409 Conflict` response.

### 4. Handling WhatsApp OAuth Errors (Code 190)
External Meta WhatsApp API calls are encapsulated in `whatsappService.js`. When simulated token expiration occurs (OAuth code 190, `OAuthException`), the error is caught inside an isolated `try/catch` block. The system writes a failed delivery record to SQLite with status `failed`, records error code `190`, and issues an `HTTP 502 Bad Gateway` without crashing the Express event loop.

### 5. Most Challenging Issue & Production Improvements
The greatest challenge was modeling external asynchronous messaging boundaries and simulating realistic failure modes while maintaining deterministic test isolation.

For enterprise production scaling, recommended enhancements include:
- Migrating to PostgreSQL for multi-region clustering.
- Integrating message queues (e.g., BullMQ/Redis) with exponential backoff and Meta Webhook listeners for delivery receipts (`delivered`, `read`).
- Adding JWT/RBAC authentication, Redis caching, and OpenTelemetry distributed tracing.

