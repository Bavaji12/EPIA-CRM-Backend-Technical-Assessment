/**
 * Simulated WhatsApp Service
 * Emulates Meta WhatsApp Business Cloud API messaging interactions.
 * Handles simulated success, OAuth error 190, temporary 503 outages, and network failures.
 * Records all transaction states in SQLite `messages` table.
 *
 * NOTE: Simulation mode flags are assessment-only test controls and should never
 * be exposed to clients in production environments.
 */

const { getDb } = require('../config/database');
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

/**
 * Simulates low-level HTTP interaction with Meta Graph API
 * @param {string} phone 
 * @param {string} message 
 * @param {string} simulationMode 
 */
async function simulateProviderApiCall(phone, message, simulationMode) {
  // Simulate network latency (20ms)
  await new Promise(resolve => setTimeout(resolve, 20));

  switch (simulationMode) {
    case 'invalid_token': {
      // Simulates Meta API OAuthException (Error code 190)
      const metaError = {
        error: {
          message: 'Invalid OAuth access token',
          type: 'OAuthException',
          code: 190,
          error_subcode: 463,
          fbtrace_id: 'SIM_FB_TRACE_190'
        }
      };
      const err = new Error(metaError.error.message);
      err.metaResponse = metaError;
      err.code = 190;
      err.statusCode = 502; // Bad Gateway from external provider failure
      throw err;
    }

    case 'temporary_failure': {
      // Simulates provider server 503 Service Unavailable / temporary maintenance
      const err = new Error('WhatsApp Provider temporary outage (Service Unavailable)');
      err.code = 503;
      err.statusCode = 503;
      throw err;
    }

    case 'network_error': {
      // Simulates underlying socket/DNS or ECONNRESET network failure
      const err = new Error('Network timeout: ECONNRESET while connecting to graph.facebook.com');
      err.code = 'ECONNRESET';
      err.statusCode = 502;
      throw err;
    }

    case 'success':
    default: {
      // Successful simulated acceptance
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: phone, wa_id: phone.replace(/\D/g, '') }],
        messages: [{ id: `SIM-${randomNum}` }]
      };
    }
  }
}

/**
 * Sends a simulated WhatsApp reminder and records state in SQLite.
 *
 * @param {Object} params
 * @param {number|null} [params.appointmentId]
 * @param {string} params.phone
 * @param {string} params.message
 * @param {string} [params.simulationMode='success']
 * @returns {Promise<Object>} Processed message result
 */
async function sendWhatsAppReminder({ appointmentId = null, phone, message, simulationMode = 'success' }) {
  const db = getDb();

  logger.info(`Processing WhatsApp reminder for phone ${logger.maskPhone(phone)} [Mode: ${simulationMode}]`);

  // Step 1: Insert initial message record in 'pending' status
  const insertStmt = db.prepare(`
    INSERT INTO messages (appointment_id, phone, message, status)
    VALUES (?, ?, ?, 'pending')
  `);

  const info = insertStmt.run(appointmentId, phone, message);
  const messageRecordId = info.lastInsertRowid;

  try {
    // Step 2: Perform simulated external call
    const providerResponse = await simulateProviderApiCall(phone, message, simulationMode);
    const providerMessageId = providerResponse.messages[0].id;

    // Step 3: Update DB record to 'sent'
    // NOTE: 'sent' indicates acceptance by simulated WhatsApp provider, not delivered to device.
    const updateSuccessStmt = db.prepare(`
      UPDATE messages
      SET status = 'sent',
          provider_message_id = ?,
          error_code = NULL,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateSuccessStmt.run(providerMessageId, messageRecordId);

    logger.info(`WhatsApp reminder successfully sent. Message ID: ${providerMessageId}`);

    return {
      success: true,
      message: 'Reminder processed successfully',
      status: 'sent',
      messageId: providerMessageId,
      messageRecordId
    };
  } catch (providerError) {
    // Step 4: Handle failure cleanly, update DB record to 'failed', never crash application
    const errorCode = typeof providerError.code === 'number' ? providerError.code : (providerError.statusCode || 500);
    const errorMessage = providerError.message || 'Unknown external provider error';

    const updateFailureStmt = db.prepare(`
      UPDATE messages
      SET status = 'failed',
          error_code = ?,
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateFailureStmt.run(errorCode, errorMessage, messageRecordId);

    logger.error(`WhatsApp reminder delivery failed: ${errorMessage} (Code: ${errorCode})`, {
      messageRecordId,
      phone: logger.maskPhone(phone),
      errorCode
    });

    // Throw standardized ExternalServiceError to be formatted cleanly by errorHandler
    throw new ExternalServiceError(
      `WhatsApp provider error: ${errorMessage}`,
      providerError.statusCode || 502,
      {
        messageRecordId,
        status: 'failed',
        errorCode,
        providerDetails: providerError.metaResponse || undefined
      }
    );
  }
}

/**
 * Retrieves all stored WhatsApp message tracking records.
 */
function getAllMessages() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT m.*, a.name AS patient_name
    FROM messages m
    LEFT JOIN appointments a ON m.appointment_id = a.id
    ORDER BY m.created_at DESC, m.id DESC
  `);
  return stmt.all();
}

/**
 * Retrieves a single message tracking record by ID.
 */
function getMessageById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT m.*, a.name AS patient_name
    FROM messages m
    LEFT JOIN appointments a ON m.appointment_id = a.id
    WHERE m.id = ?
  `);
  return stmt.get(id);
}

module.exports = {
  sendWhatsAppReminder,
  getAllMessages,
  getMessageById,
  simulateProviderApiCall
};
