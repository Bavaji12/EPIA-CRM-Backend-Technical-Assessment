/**
 * WhatsApp Controller
 * Handles dispatching simulated WhatsApp reminders and tracking message history.
 */

const { getDb } = require('../config/database');
const whatsappService = require('../services/whatsappService');
const { NotFoundError } = require('../middleware/errorHandler');

/**
 * Sends a simulated WhatsApp reminder
 * POST /api/whatsapp/send-reminder
 */
async function sendReminder(req, res, next) {
  try {
    const { appointmentId, phone, message, simulationMode = 'success' } = req.body;

    const db = getDb();

    // Verify appointment exists if an ID was provided
    if (appointmentId) {
      const checkAptStmt = db.prepare('SELECT id FROM appointments WHERE id = ?');
      const appointment = checkAptStmt.get(appointmentId);
      if (!appointment) {
        throw new NotFoundError(`Referenced appointment with ID ${appointmentId} does not exist.`);
      }
    }

    // Call simulated WhatsApp service
    const result = await whatsappService.sendWhatsAppReminder({
      appointmentId: appointmentId || null,
      phone,
      message,
      simulationMode
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      status: result.status,
      messageId: result.messageId
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves all simulated WhatsApp messages and delivery statuses
 * GET /api/whatsapp/messages
 */
function getMessages(req, res, next) {
  try {
    const messages = whatsappService.getAllMessages();

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendReminder,
  getMessages
};

