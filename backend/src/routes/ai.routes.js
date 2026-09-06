const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/suggest-replies', aiController.suggestReplies);
router.post('/summarize/:conversationId', aiController.summarizeConversation);
router.get('/usage', aiController.getUserUsage);

module.exports = router;
