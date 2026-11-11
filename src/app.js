/**
 * Express Application Setup
 * Configures middleware, route bindings, and global error handling.
 */

const express = require('express');
const path = require('path');
const appointmentRoutes = require('./routes/appointmentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const followupRoutes = require('./routes/followupRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Body Parser Middleware
// Fixes the original bug where req.body was unparsed
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for web dashboard / API explorer
app.use(express.static(path.join(__dirname, '../public')));

// Root Route: Serves the Web Dashboard for browsers and JSON API metadata for API clients
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  return res.status(200).json({
    success: true,
    message: 'Welcome to EPIA CRM Backend Technical Assessment REST API',
    version: '1.0.0',
    status: 'healthy',
    documentation: 'See README.md or visit root URL in a web browser',
    endpoints: {
      health: 'GET /health',
      appointments: 'GET, POST /api/appointments',
      appointment_by_id: 'GET /api/appointments/:id',
      whatsapp_send: 'POST /api/whatsapp/send-reminder',
      whatsapp_messages: 'GET /api/whatsapp/messages',
      followups: 'GET, POST /api/followups',
      followups_pending: 'GET /api/followups/pending',
      followup_by_id: 'GET /api/followups/:id',
      followup_complete: 'PATCH /api/followups/:id/complete'
    }
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/followups', followupRoutes);

// 404 Not Found Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handler Middleware
app.use(errorHandler);

module.exports = app;
