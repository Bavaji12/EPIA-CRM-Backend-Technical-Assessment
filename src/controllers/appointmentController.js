/**
 * Appointment Controller
 * Handles CRUD operations for patient appointments with SQLite persistent storage.
 */

const { getDb } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Creates a new appointment
 * POST /api/appointments
 */
function createAppointment(req, res, next) {
  try {
    const { name, phone, date } = req.body;

    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO appointments (name, phone, date)
      VALUES (?, ?, ?)
    `);

    const result = insertStmt.run(name.trim(), phone.trim(), date.trim());
    const newAppointmentId = result.lastInsertRowid;

    const selectStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
    const appointment = selectStmt.get(newAppointmentId);

    logger.info(`Appointment #${newAppointmentId} created for patient ${name} on ${date}`);

    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves an appointment by ID
 * GET /api/appointments/:id
 */
function getAppointmentById(req, res, next) {
  try {
    const { id } = req.params;
    const appointmentId = parseInt(id, 10);

    if (isNaN(appointmentId) || appointmentId <= 0) {
      throw new BadRequestError('Invalid appointment ID. Must be a positive integer.');
    }

    const db = getDb();
    const stmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
    const appointment = stmt.get(appointmentId);

    if (!appointment) {
      throw new NotFoundError(`Appointment with ID ${appointmentId} was not found.`);
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves all appointments
 * GET /api/appointments
 */
function getAllAppointments(req, res, next) {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM appointments ORDER BY date ASC, id ASC');
    const appointments = stmt.all();

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAppointment,
  getAppointmentById,
  getAllAppointments
};

