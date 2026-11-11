/**
 * WhatsApp Simulation Routes
 * Defines endpoints for sending reminders and querying message logs.
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { validateSendReminder } = require('../middleware/validate');

// POST /api/whatsapp/send-reminder - Dispatch simulated reminder
router.post('/send-reminder', validateSendReminder, whatsappController.sendReminder);

// GET /api/whatsapp/messages - Retrieve message dispatch history
router.get('/messages', whatsappController.getMessages);

module.exports = router;

