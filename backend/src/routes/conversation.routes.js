const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { protect } = require('../middlewares/auth.middleware');

// Legacy unauthenticated endpoint: GET /api/conversations/:username
router.get('/:username([a-zA-Z0-9_-]{1,30})', (req, res, next) => {
  // If request has Authorization header, let next routes or protect handle it, otherwise run legacyGetConversations
  if (req.headers.authorization) {
    return next();
  }
  return conversationController.legacyGetConversations(req, res, next);
});

router.use(protect);

router.get('/', conversationController.getUserConversations);
router.post('/dm', conversationController.getOrCreateDM);
router.post('/group', conversationController.createGroup);
router.get('/:id', conversationController.getConversationDetails);
router.put('/:id/group-info', conversationController.updateGroupInfo);
router.post('/:id/members', conversationController.addGroupMembers);
router.delete('/:id/members/:userId', conversationController.removeGroupMember);
router.post('/:id/leave', conversationController.leaveGroup);

module.exports = router;
