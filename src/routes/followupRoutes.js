/**
 * Follow-up Routes
 * Defines endpoints for CRM follow-ups, pending queries, and status completions.
 */

const express = require('express');
const router = express.Router();
const followupController = require('../controllers/followupController');
const {
  validateCreateFollowup,
  validateFollowupId,
  validateFollowupQuery
} = require('../middleware/validate');

// POST /api/followups - Create follow-up
router.post('/', validateCreateFollowup, followupController.createFollowup);

// GET /api/followups/pending - Retrieve pending follow-ups with patient details
// Defined before /:id to prevent route shadowing
router.get('/pending', followupController.getPendingFollowups);

// GET /api/followups - Retrieve all follow-ups (supports ?status=pending|completed)
router.get('/', validateFollowupQuery, followupController.getAllFollowups);

// GET /api/followups/:id - Retrieve individual follow-up
router.get('/:id', validateFollowupId, followupController.getFollowupById);

// PATCH /api/followups/:id/complete - Mark follow-up as completed
router.patch('/:id/complete', validateFollowupId, followupController.completeFollowup);

module.exports = router;
