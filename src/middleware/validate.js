/**
 * Request Validation Middleware using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { BadRequestError } = require('./errorHandler');

// Validation error formatting helper
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    return next(new BadRequestError('Validation failed', formattedErrors));
  }
  next();
};

// Date regex: YYYY-MM-DD
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Phone regex: 7-15 digits, optional leading +
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

// Helper to check valid calendar date
const isValidCalendarDate = (value) => {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
};

// Appointment validations
const validateCreateAppointment = [
  body('name')
    .exists({ checkFalsy: true }).withMessage('Name is required')
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .exists({ checkFalsy: true }).withMessage('Phone is required')
    .isString().withMessage('Phone must be a string')
    .trim()
    .matches(PHONE_REGEX).withMessage('Phone must be a valid phone number (7-15 digits, optional leading +)'),
  body('date')
    .exists({ checkFalsy: true }).withMessage('Date is required')
    .isString().withMessage('Date must be a string')
    .trim()
    .custom(isValidCalendarDate).withMessage('Date must be a valid calendar date in YYYY-MM-DD format'),
  handleValidationErrors
];

const validateAppointmentId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Appointment ID must be a positive integer'),
  handleValidationErrors
];

// WhatsApp Reminder validations
const validateSendReminder = [
  body('phone')
    .exists({ checkFalsy: true }).withMessage('Phone is required')
    .isString().withMessage('Phone must be a string')
    .trim()
    .matches(PHONE_REGEX).withMessage('Phone must be a valid phone number (7-15 digits, optional leading +)'),
  body('message')
    .exists({ checkFalsy: true }).withMessage('Message is required')
    .isString().withMessage('Message must be a string')
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('appointmentId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('appointmentId must be a positive integer if provided'),
  body('simulationMode')
    .optional()
    .isIn(['success', 'invalid_token', 'temporary_failure', 'network_error'])
    .withMessage("simulationMode must be one of: 'success', 'invalid_token', 'temporary_failure', 'network_error'"),
  handleValidationErrors
];

// Follow-up validations
const validateCreateFollowup = [
  body('appointmentId')
    .exists().withMessage('appointmentId is required')
    .isInt({ min: 1 }).withMessage('appointmentId must be a positive integer'),
  body('followupDate')
    .exists({ checkFalsy: true }).withMessage('followupDate is required')
    .isString().withMessage('followupDate must be a string')
    .trim()
    .custom(isValidCalendarDate).withMessage('followupDate must be a valid calendar date in YYYY-MM-DD format'),
  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('notes must be a string if provided')
    .trim()
    .isLength({ max: 1000 }).withMessage('notes cannot exceed 1000 characters'),
  handleValidationErrors
];

const validateFollowupId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Follow-up ID must be a positive integer'),
  handleValidationErrors
];

const validateFollowupQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'completed']).withMessage("Status filter must be either 'pending' or 'completed'"),
  handleValidationErrors
];

module.exports = {
  validateCreateAppointment,
  validateAppointmentId,
  validateSendReminder,
  validateCreateFollowup,
  validateFollowupId,
  validateFollowupQuery
};

