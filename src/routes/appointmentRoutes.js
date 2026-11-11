/**
 * Appointment Routes
 * Defines endpoints for creating and querying appointments.
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const {
  validateCreateAppointment,
  validateAppointmentId
} = require('../middleware/validate');

// POST /api/appointments - Create new appointment
router.post('/', validateCreateAppointment, appointmentController.createAppointment);

// GET /api/appointments - Retrieve all appointments
router.get('/', appointmentController.getAllAppointments);

// GET /api/appointments/:id - Retrieve specific appointment
router.get('/:id', validateAppointmentId, appointmentController.getAppointmentById);

module.exports = router;

