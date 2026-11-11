/**
 * Server Entry Point
 * Initializes environment variables, connects to SQLite, and starts Express listener.
 */

require('dotenv').config();
const app = require('./app');
const { initDb, closeDb } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Initialize SQLite database
try {
  initDb();
} catch (error) {
  logger.error('Failed to initialize database during startup', { error: error.message });
  process.exit(1);
}

// Start HTTP server
const server = app.listen(PORT, () => {
  logger.info(`EPIA CRM Backend Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    closeDb();
    process.exit(0);
  });

  // Force close after 5 seconds if lingering
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = server;
