/**
 * Logger Utility
 * Provides structured logging with timestamp and level.
 * Redacts sensitive credentials (tokens) and masks phone numbers
 * to ensure privacy and security compliance.
 */

const isTest = process.env.NODE_ENV === 'test';

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '****';
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('token') || lowerKey.includes('authorization') || lowerKey.includes('secret') || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('phone') && typeof sanitized[key] === 'string') {
      sanitized[key] = maskPhone(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
}

const logger = {
  info: (message, meta) => {
    if (isTest && !process.env.DEBUG_TESTS) return;
    const sanitizedMeta = meta ? sanitizeData(meta) : '';
    console.log(`[INFO]  ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
  },
  warn: (message, meta) => {
    if (isTest && !process.env.DEBUG_TESTS) return;
    const sanitizedMeta = meta ? sanitizeData(meta) : '';
    console.warn(`[WARN]  ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
  },
  error: (message, meta) => {
    if (isTest && !process.env.DEBUG_TESTS) return;
    const sanitizedMeta = meta ? sanitizeData(meta) : '';
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'development') return;
    const sanitizedMeta = meta ? sanitizeData(meta) : '';
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, sanitizedMeta ? JSON.stringify(sanitizedMeta) : '');
  },
  maskPhone
};

module.exports = logger;
