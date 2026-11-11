/**
 * WhatsApp Simulation Integration Tests
 */

process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/test_epia_crm.db';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { initDb, closeDb, clearDb, getDb } = require('../src/config/database');

describe('Task 2: WhatsApp API Integration & Simulation', () => {
  let sampleAppointmentId;

  beforeAll(() => {
    initDb(process.env.DB_PATH);
  });

  beforeEach(async () => {
    clearDb();

    // Create a base appointment for message association
    const aptRes = await request(app)
      .post('/api/appointments')
      .send({
        name: 'Bruce Wayne',
        phone: '9876543210',
        date: '2026-11-20'
      });
    sampleAppointmentId = aptRes.body.data.id;
  });

  afterAll(() => {
    closeDb();
    const testDbPath = path.resolve(process.cwd(), process.env.DB_PATH);
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // Ignored if locked
      }
    }
  });

  describe('POST /api/whatsapp/send-reminder', () => {
    it('should successfully send a simulated reminder (HTTP 200) with status "sent"', async () => {
      const payload = {
        appointmentId: sampleAppointmentId,
        phone: '9876543210',
        message: 'Reminder: Your consultation is tomorrow at 10:00 AM.',
        simulationMode: 'success'
      };

      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Reminder processed successfully');
      expect(res.body.status).toBe('sent');
      expect(res.body.messageId).toMatch(/^SIM-\d+$/);

      // Verify stored message in SQLite
      const db = getDb();
      const messageRecord = db.prepare('SELECT * FROM messages WHERE phone = ?').get(payload.phone);
      expect(messageRecord).toBeDefined();
      expect(messageRecord.status).toBe('sent');
      expect(messageRecord.appointment_id).toBe(sampleAppointmentId);
      expect(messageRecord.provider_message_id).toBe(res.body.messageId);
      expect(messageRecord.error_code).toBeNull();
    });

    it('should simulate OAuth token error (Code 190) and record failure in SQLite (HTTP 502)', async () => {
      const payload = {
        appointmentId: sampleAppointmentId,
        phone: '9876543210',
        message: 'Testing OAuth failure simulation',
        simulationMode: 'invalid_token'
      };

      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send(payload);

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid OAuth access token');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errorCode).toBe(190);
      expect(res.body.details.status).toBe('failed');

      // Verify failed message is recorded in SQLite
      const db = getDb();
      const failedRecord = db.prepare("SELECT * FROM messages WHERE phone = ? AND status = 'failed'").get(payload.phone);
      expect(failedRecord).toBeDefined();
      expect(failedRecord.status).toBe('failed');
      expect(failedRecord.error_code).toBe(190);
      expect(failedRecord.error_message).toContain('Invalid OAuth access token');
    });

    it('should simulate temporary server failure (HTTP 503) and record failure in SQLite', async () => {
      const payload = {
        appointmentId: sampleAppointmentId,
        phone: '9876543210',
        message: 'Testing 503 outage simulation',
        simulationMode: 'temporary_failure'
      };

      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send(payload);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('temporary outage');

      const db = getDb();
      const record = db.prepare('SELECT * FROM messages WHERE phone = ? ORDER BY id DESC').get(payload.phone);
      expect(record.status).toBe('failed');
      expect(record.error_code).toBe(503);
    });

    it('should simulate network error / ECONNRESET and record failure in SQLite', async () => {
      const payload = {
        appointmentId: sampleAppointmentId,
        phone: '9876543210',
        message: 'Testing network failure simulation',
        simulationMode: 'network_error'
      };

      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send(payload);

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('ECONNRESET');

      const db = getDb();
      const record = db.prepare('SELECT * FROM messages WHERE phone = ? ORDER BY id DESC').get(payload.phone);
      expect(record.status).toBe('failed');
      expect(record.error_message).toContain('ECONNRESET');
    });

    it('should ensure the application remains operational after simulated failures', async () => {
      // Step 1: Trigger failure
      await request(app)
        .post('/api/whatsapp/send-reminder')
        .send({
          appointmentId: sampleAppointmentId,
          phone: '9876543210',
          message: 'Failing call',
          simulationMode: 'invalid_token'
        });

      // Step 2: Immediate subsequent successful call should work normally
      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send({
          appointmentId: sampleAppointmentId,
          phone: '9876543210',
          message: 'Recovered call',
          simulationMode: 'success'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('sent');
    });

    it('should reject missing required phone or message fields (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send({
          appointmentId: sampleAppointmentId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject non-existent appointment ID (HTTP 404)', async () => {
      const res = await request(app)
        .post('/api/whatsapp/send-reminder')
        .send({
          appointmentId: 99999,
          phone: '9876543210',
          message: 'Test reminder'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('does not exist');
    });
  });

  describe('GET /api/whatsapp/messages', () => {
    it('should retrieve message history including sent and failed logs', async () => {
      // Create 1 success and 1 failed message
      await request(app)
        .post('/api/whatsapp/send-reminder')
        .send({
          appointmentId: sampleAppointmentId,
          phone: '9876543210',
          message: 'First reminder',
          simulationMode: 'success'
        });

      await request(app)
        .post('/api/whatsapp/send-reminder')
        .send({
          appointmentId: sampleAppointmentId,
          phone: '9876543210',
          message: 'Second reminder',
          simulationMode: 'invalid_token'
        });

      const res = await request(app).get('/api/whatsapp/messages');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.some(m => m.status === 'sent')).toBe(true);
      expect(res.body.data.some(m => m.status === 'failed')).toBe(true);
    });
  });
});
