/**
 * Follow-up Controller
 * Handles CRM follow-up management, status transitions, and duplicate prevention.
 */

const { getDb } = require('../config/database');
const { NotFoundError, BadRequestError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Creates a new follow-up
 * POST /api/followups
 */
function createFollowup(req, res, next) {
  try {
    const { appointmentId, followupDate, notes = null } = req.body;
    const db = getDb();

    // 1. Verify referenced appointment exists
    const aptStmt = db.prepare('SELECT id, name, phone, date FROM appointments WHERE id = ?');
    const appointment = aptStmt.get(appointmentId);

    if (!appointment) {
      throw new NotFoundError(`Referenced appointment with ID ${appointmentId} was not found.`);
    }

    // 2. Insert into followups table (UNIQUE constraint on appointment_id, followup_date enforced by SQLite)
    const insertStmt = db.prepare(`
      INSERT INTO followups (appointment_id, followup_date, status, notes)
      VALUES (?, ?, 'pending', ?)
    `);

    try {
      const result = insertStmt.run(appointmentId, followupDate.trim(), notes ? notes.trim() : null);
      const newFollowupId = result.lastInsertRowid;

      const selectStmt = db.prepare(`
        SELECT f.*, a.name AS patient_name, a.phone AS patient_phone, a.date AS appointment_date
        FROM followups f
        INNER JOIN appointments a ON f.appointment_id = a.id
        WHERE f.id = ?
      `);
      const followup = selectStmt.get(newFollowupId);

      logger.info(`Follow-up #${newFollowupId} created for appointment #${appointmentId} on ${followupDate}`);

      return res.status(201).json({
        success: true,
        message: 'Follow-up created successfully',
        data: followup
      });
    } catch (dbErr) {
      // Catch UNIQUE constraint violation
      if (dbErr.code === 'SQLITE_CONSTRAINT_UNIQUE' || (dbErr.message && dbErr.message.includes('UNIQUE constraint failed'))) {
        throw new ConflictError(
          `A follow-up is already scheduled for appointment #${appointmentId} on ${followupDate}. Duplicate follow-ups for the same appointment and date are not allowed.`
        );
      }
      throw dbErr;
    }
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves all pending follow-ups with related appointment details
 * Sorted by follow-up date ascending
 * GET /api/followups/pending
 */
function getPendingFollowups(req, res, next) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        f.id,
        f.appointment_id,
        f.followup_date,
        f.status,
        f.notes,
        f.created_at,
        f.updated_at,
        a.name AS patient_name,
        a.phone AS patient_phone,
        a.date AS appointment_date
      FROM followups f
      INNER JOIN appointments a ON f.appointment_id = a.id
      WHERE f.status = 'pending'
      ORDER BY f.followup_date ASC, f.id ASC
    `);

    const pendingFollowups = stmt.all();

    return res.status(200).json({
      success: true,
      count: pendingFollowups.length,
      data: pendingFollowups
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves all follow-ups with optional status filter (?status=pending|completed)
 * GET /api/followups
 */
function getAllFollowups(req, res, next) {
  try {
    const { status } = req.query;
    const db = getDb();

    let query = `
      SELECT 
        f.id,
        f.appointment_id,
        f.followup_date,
        f.status,
        f.notes,
        f.created_at,
        f.updated_at,
        a.name AS patient_name,
        a.phone AS patient_phone,
        a.date AS appointment_date
      FROM followups f
      INNER JOIN appointments a ON f.appointment_id = a.id
    `;
    const params = [];

    if (status) {
      if (!['pending', 'completed'].includes(status)) {
        throw new BadRequestError("Invalid status query parameter. Must be 'pending' or 'completed'.");
      }
      query += ' WHERE f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY f.followup_date ASC, f.id ASC';

    const stmt = db.prepare(query);
    const followups = stmt.all(...params);

    return res.status(200).json({
      success: true,
      count: followups.length,
      data: followups
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves a single follow-up by ID
 * GET /api/followups/:id
 */
function getFollowupById(req, res, next) {
  try {
    const { id } = req.params;
    const followupId = parseInt(id, 10);

    if (isNaN(followupId) || followupId <= 0) {
      throw new BadRequestError('Invalid follow-up ID. Must be a positive integer.');
    }

    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        f.id,
        f.appointment_id,
        f.followup_date,
        f.status,
        f.notes,
        f.created_at,
        f.updated_at,
        a.name AS patient_name,
        a.phone AS patient_phone,
        a.date AS appointment_date
      FROM followups f
      INNER JOIN appointments a ON f.appointment_id = a.id
      WHERE f.id = ?
    `);

    const followup = stmt.get(followupId);

    if (!followup) {
      throw new NotFoundError(`Follow-up with ID ${followupId} was not found.`);
    }

    return res.status(200).json({
      success: true,
      data: followup
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Marks a follow-up as completed (idempotent)
 * PATCH /api/followups/:id/complete
 */
function completeFollowup(req, res, next) {
  try {
    const { id } = req.params;
    const followupId = parseInt(id, 10);

    if (isNaN(followupId) || followupId <= 0) {
      throw new BadRequestError('Invalid follow-up ID. Must be a positive integer.');
    }

    const db = getDb();

    // Check if record exists
    const checkStmt = db.prepare('SELECT id, status FROM followups WHERE id = ?');
    const existing = checkStmt.get(followupId);

    if (!existing) {
      throw new NotFoundError(`Follow-up with ID ${followupId} was not found.`);
    }

    // Update status to completed and touch updated_at
    const updateStmt = db.prepare(`
      UPDATE followups
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(followupId);

    // Fetch updated record with appointment details
    const selectStmt = db.prepare(`
      SELECT 
        f.id,
        f.appointment_id,
        f.followup_date,
        f.status,
        f.notes,
        f.created_at,
        f.updated_at,
        a.name AS patient_name,
        a.phone AS patient_phone,
        a.date AS appointment_date
      FROM followups f
      INNER JOIN appointments a ON f.appointment_id = a.id
      WHERE f.id = ?
    `);
    const updatedFollowup = selectStmt.get(followupId);

    logger.info(`Follow-up #${followupId} marked as completed`);

    return res.status(200).json({
      success: true,
      message: 'Follow-up marked as completed successfully',
      data: updatedFollowup
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createFollowup,
  getPendingFollowups,
  getAllFollowups,
  getFollowupById,
  completeFollowup
};

