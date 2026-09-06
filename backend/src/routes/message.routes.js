const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

// Legacy unauthenticated endpoint: GET /api/messages?from=...&to=...
router.get('/', (req, res, next) => {
  if (req.query.from && req.query.to) {
    return messageController.getLegacyMessages(req, res, next);
  }
  return next();
});

router.use(protect);

router.get('/conversation/:conversationId', messageController.getMessages);
router.post('/', messageController.sendMessage);
router.put('/:id', messageController.editMessage);
router.delete('/:id', messageController.deleteMessage);
router.post('/:id/reaction', messageController.toggleReaction);
router.post('/conversation/:conversationId/read', messageController.markAsRead);

module.exports = router;
