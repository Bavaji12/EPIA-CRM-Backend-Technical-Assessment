/**
 * Express Application Setup
 * Configures middleware, route bindings, and global error handling.
 */

const express = require('express');
const appointmentRoutes = require('./routes/appointmentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const followupRoutes = require('./routes/followupRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Body Parser Middleware
// Fixes the original bug where req.body was unparsed
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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

// 404 Not Found Handler
app.use(notFoundHandler);

// Centralized Error Handler Middleware
app.use(errorHandler);

module.exports = app;
