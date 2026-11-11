/**
 * SQLite Database Configuration and Initialization
 * Uses better-sqlite3 for synchronous, high-performance, and reliable SQLite operations.
 * Enforces Foreign Keys, WAL mode, and explicit schema constraints.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

let dbInstance = null;

/**
 * Resolves the database file path based on environment variables or defaults.
 */
function resolveDbPath(customPath) {
  const configuredPath = customPath || process.env.DB_PATH || './database/epia_crm.db';
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

/**
 * Initializes and returns the SQLite database connection.
 * Creates parent directory and initializes tables if they do not exist.
 *
 * @param {string} [customPath] Optional custom path for the database file (e.g. for testing)
 * @returns {Database} The better-sqlite3 database instance
 */
function initDb(customPath) {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = resolveDbPath(customPath);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info(`Initializing SQLite database at: ${dbPath}`);

  dbInstance = new Database(dbPath);

  // Enforce foreign key constraints and WAL mode for high concurrency & integrity
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('journal_mode = WAL');

  // Create tables inside a transaction
  const initializeSchema = dbInstance.transaction(() => {
    // 1. Appointments Table
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Messages Table (WhatsApp Simulation & Tracking)
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS messages (
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
    `);

    // 3. Follow-ups Table
    // Constraint: UNIQUE (appointment_id, followup_date) prevents duplicate followups on the same date
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        followup_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        CONSTRAINT uq_appointment_followup_date UNIQUE (appointment_id, followup_date)
      );
    `);

    // Performance Indexes
    dbInstance.exec(`
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
      CREATE INDEX IF NOT EXISTS idx_messages_appointment ON messages(appointment_id);
      CREATE INDEX IF NOT EXISTS idx_followups_status_date ON followups(status, followup_date);
    `);
  });

  initializeSchema();
  logger.info('Database schema initialized successfully.');

  return dbInstance;
}

/**
 * Returns the active database instance, initializing it if necessary.
 */
function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

/**
 * Closes the database connection (useful during shutdown and testing).
 */
function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed.');
  }
}

/**
 * Clears all data from tables (strictly for automated test reset).
 */
function clearDb() {
  if (!dbInstance) {
    getDb();
  }
  const clear = dbInstance.transaction(() => {
    dbInstance.exec('DELETE FROM messages;');
    dbInstance.exec('DELETE FROM followups;');
    dbInstance.exec('DELETE FROM appointments;');
  });
  clear();
}

module.exports = {
  initDb,
  getDb,
  closeDb,
  clearDb,
  resolveDbPath
};

