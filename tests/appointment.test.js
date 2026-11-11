/**
 * Appointment API Integration Tests
 */

process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/test_epia_crm.db';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { initDb, closeDb, clearDb } = require('../src/config/database');

describe('Task 1: Appointment API', () => {
  beforeAll(() => {
    initDb(process.env.DB_PATH);
  });

  beforeEach(() => {
    clearDb();
  });

  afterAll(() => {
    closeDb();
    // Clean up test database file if it exists
    const testDbPath = path.resolve(process.cwd(), process.env.DB_PATH);
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // Ignored if file locked
      }
    }
  });

  describe('POST /api/appointments', () => {
    it('should create an appointment successfully with valid payload (HTTP 201)', async () => {
      const payload = {
        name: 'Sarah Connor',
        phone: '9876543210',
        date: '2026-11-15'
      };

      const res = await request(app)
        .post('/api/appointments')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Appointment created successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeGreaterThan(0);
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.phone).toBe(payload.phone);
      expect(res.body.data.date).toBe(payload.date);
      expect(res.body.data.created_at).toBeDefined();
    });

    it('should reject missing name (HTTP 400)', async () => {
      const payload = {
        phone: '9876543210',
        date: '2026-11-15'
      };

      const res = await request(app)
        .post('/api/appointments')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' })
        ])
      );
    });

    it('should reject invalid phone format (HTTP 400)', async () => {
      const payload = {
        name: 'John Doe',
        phone: 'abc-not-a-number',
        date: '2026-11-15'
      };

      const res = await request(app)
        .post('/api/appointments')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'phone' })
        ])
      );
    });

    it('should reject invalid date format and impossible dates (HTTP 400)', async () => {
      const payload = {
        name: 'John Doe',
        phone: '9876543210',
        date: '2026-02-31' // 31st Feb is invalid
      };

      const res = await request(app)
        .post('/api/appointments')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'date' })
        ])
      );
    });

    it('should reject empty JSON body (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/appointments/:id', () => {
    it('should retrieve existing appointment by ID (HTTP 200)', async () => {
      // Setup appointment
      const createRes = await request(app)
        .post('/api/appointments')
        .send({
          name: 'Jane Foster',
          phone: '+14155552671',
          date: '2026-11-20'
        });

      const appointmentId = createRes.body.data.id;

      const res = await request(app).get(`/api/appointments/${appointmentId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(appointmentId);
      expect(res.body.data.name).toBe('Jane Foster');
    });

    it('should return 404 for non-existent appointment ID', async () => {
      const res = await request(app).get('/api/appointments/99999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });

    it('should return 400 for non-numeric or invalid ID format', async () => {
      const res = await request(app).get('/api/appointments/abc');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/appointments', () => {
    it('should return an empty array when no appointments exist (HTTP 200)', async () => {
      const res = await request(app).get('/api/appointments');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should retrieve all appointments ordered by date (HTTP 200)', async () => {
      await request(app)
        .post('/api/appointments')
        .send({ name: 'Patient Two', phone: '9876543211', date: '2026-12-01' });

      await request(app)
        .post('/api/appointments')
        .send({ name: 'Patient One', phone: '9876543210', date: '2026-11-15' });

      const res = await request(app).get('/api/appointments');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].name).toBe('Patient One'); // Sorted by date ascending
      expect(res.body.data[1].name).toBe('Patient Two');
    });
  });
});

