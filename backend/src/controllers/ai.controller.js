const aiService = require('../services/ai.service');

const suggestReplies = async (req, res, next) => {
  try {
    const { conversationId, lastMessageContent } = req.body;
    if (!lastMessageContent) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'lastMessageContent is required' },
      });
    }

    const suggestions = await aiService.suggestReplies({
      conversationId,
      lastMessageContent,
    });
    res.status(200).json({ success: true, suggestions });
  } catch (err) {
    next(err);
  }
};

const summarizeConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'conversationId is required' },
      });
    }

    const summary = await aiService.summarizeConversation(conversationId, req.user._id);
    res.status(200).json({ success: true, ...summary });
  } catch (err) {
    next(err);
  }
};

const getUserUsage = async (req, res, next) => {
  try {
    const usage = await aiService.getUserUsage(req.user._id);
    res.status(200).json({ success: true, usage });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  suggestReplies,
  summarizeConversation,
  getUserUsage,
};
