/**
 * CRM Follow-up Integration Tests
 */

process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/test_epia_crm.db';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { initDb, closeDb, clearDb, getDb } = require('../src/config/database');

describe('Task 3: CRM Follow-Up Management', () => {
  let appointmentA;
  let appointmentB;

  beforeAll(() => {
    initDb(process.env.DB_PATH);
  });

  beforeEach(async () => {
    clearDb();

    // Create appointments for testing
    const apt1 = await request(app)
      .post('/api/appointments')
      .send({ name: 'Clark Kent', phone: '9876543210', date: '2026-11-15' });
    appointmentA = apt1.body.data.id;

    const apt2 = await request(app)
      .post('/api/appointments')
      .send({ name: 'Diana Prince', phone: '+14155552671', date: '2026-11-18' });
    appointmentB = apt2.body.data.id;
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

  describe('POST /api/followups', () => {
    it('should create a follow-up successfully with default pending status (HTTP 201)', async () => {
      const payload = {
        appointmentId: appointmentA,
        followupDate: '2026-11-16',
        notes: 'Check post-op pain level'
      };

      const res = await request(app)
        .post('/api/followups')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Follow-up created successfully');
      expect(res.body.data.appointment_id).toBe(appointmentA);
      expect(res.body.data.followup_date).toBe('2026-11-16');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.notes).toBe('Check post-op pain level');
      expect(res.body.data.patient_name).toBe('Clark Kent');
    });

    it('should create follow-up without notes (notes is optional)', async () => {
      const payload = {
        appointmentId: appointmentA,
        followupDate: '2026-11-17'
      };

      const res = await request(app)
        .post('/api/followups')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.notes).toBeNull();
    });

    it('should reject non-existent appointment (HTTP 404)', async () => {
      const payload = {
        appointmentId: 99999,
        followupDate: '2026-11-16',
        notes: 'Invalid appointment'
      };

      const res = await request(app)
        .post('/api/followups')
        .send(payload);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should reject invalid date format (HTTP 400)', async () => {
      const payload = {
        appointmentId: appointmentA,
        followupDate: 'invalid-date'
      };

      const res = await request(app)
        .post('/api/followups')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('DATABASE CONSTRAINT: should reject duplicate follow-up for the same appointment and date (HTTP 409)', async () => {
      const payload = {
        appointmentId: appointmentA,
        followupDate: '2026-11-16',
        notes: 'Initial follow-up check'
      };

      // First creation should succeed
      const firstRes = await request(app)
        .post('/api/followups')
        .send(payload);
      expect(firstRes.status).toBe(201);

      // Second creation for exact same appointment and date must be rejected
      const duplicateRes = await request(app)
        .post('/api/followups')
        .send({
          appointmentId: appointmentA,
          followupDate: '2026-11-16',
          notes: 'Duplicate attempt'
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error).toContain('already scheduled');
    });

    it('should allow different dates for the same appointment', async () => {
      const res1 = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-16' });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-25' });
      expect(res2.status).toBe(201);
    });

    it('should allow the same date for different appointments', async () => {
      const res1 = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-20' });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentB, followupDate: '2026-11-20' });
      expect(res2.status).toBe(201);
    });
  });

  describe('GET /api/followups/pending', () => {
    it('should return only pending follow-ups with patient details, sorted by followup_date ASC (HTTP 200)', async () => {
      // Create later pending follow-up
      await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-22', notes: 'Later follow-up' });

      // Create earlier pending follow-up
      const earlier = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentB, followupDate: '2026-11-16', notes: 'Earlier follow-up' });

      // Create one that we immediately mark completed
      const toComplete = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-10' });
      await request(app).patch(`/api/followups/${toComplete.body.data.id}/complete`);

      const res = await request(app).get('/api/followups/pending');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2); // Completed one excluded
      expect(res.body.data[0].followup_date).toBe('2026-11-16'); // Ascending order
      expect(res.body.data[1].followup_date).toBe('2026-11-22');
      expect(res.body.data[0].patient_name).toBe('Diana Prince');
      expect(res.body.data[0].status).toBe('pending');
    });
  });

  describe('PATCH /api/followups/:id/complete', () => {
    it('should mark a pending follow-up as completed and update updated_at (HTTP 200)', async () => {
      const createRes = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-16', notes: 'Call patient' });
      const followupId = createRes.body.data.id;

      const res = await request(app).patch(`/api/followups/${followupId}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('completed');
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.updated_at).toBeDefined();
    });

    it('should handle repeated completion requests safely (idempotent)', async () => {
      const createRes = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-16' });
      const followupId = createRes.body.data.id;

      // First complete
      await request(app).patch(`/api/followups/${followupId}/complete`);

      // Second complete
      const repeatRes = await request(app).patch(`/api/followups/${followupId}/complete`);

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.success).toBe(true);
      expect(repeatRes.body.data.status).toBe('completed');
    });

    it('should return 404 when attempting to complete non-existent follow-up', async () => {
      const res = await request(app).patch('/api/followups/99999/complete');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/followups and GET /api/followups/:id', () => {
    it('should retrieve individual follow-up by ID (HTTP 200)', async () => {
      const createRes = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-16', notes: 'Special check' });
      const followupId = createRes.body.data.id;

      const res = await request(app).get(`/api/followups/${followupId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(followupId);
      expect(res.body.data.notes).toBe('Special check');
    });

    it('should support filtering all follow-ups by status (?status=completed)', async () => {
      const f1 = await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-16' });
      await request(app).patch(`/api/followups/${f1.body.data.id}/complete`);

      await request(app)
        .post('/api/followups')
        .send({ appointmentId: appointmentA, followupDate: '2026-11-20' });

      const completedRes = await request(app).get('/api/followups?status=completed');
      expect(completedRes.status).toBe(200);
      expect(completedRes.body.count).toBe(1);
      expect(completedRes.body.data[0].status).toBe('completed');

      const pendingRes = await request(app).get('/api/followups?status=pending');
      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.count).toBe(1);
      expect(pendingRes.body.data[0].status).toBe('pending');
    });

    it('should reject invalid status filter parameter (HTTP 400)', async () => {
      const res = await request(app).get('/api/followups?status=invalid_status');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });
  });
});
