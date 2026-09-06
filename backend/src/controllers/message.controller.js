const messageService = require('../services/message.service');

const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { cursor, limit } = req.query;

    const result = await messageService.getMessages(conversationId, req.user._id, {
      cursor,
      limit,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, replyTo, messageType } = req.body;
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'conversationId and content are required' },
      });
    }

    const message = await messageService.sendMessage(req.user._id, {
      conversationId,
      content,
      replyTo,
      messageType,
    });
    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

const editMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'content is required' },
      });
    }

    const message = await messageService.editMessage(req.user._id, req.params.id, content);
    res.status(200).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const result = await messageService.deleteMessage(req.user._id, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const toggleReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'emoji is required' },
      });
    }

    const result = await messageService.toggleReaction(req.user._id, req.params.id, emoji);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await messageService.markConversationAsRead(
      req.user._id,
      req.params.conversationId
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// Legacy GET /api/messages?from=...&to=...
const getLegacyMessages = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(200).json([]);
    }

    const messages = await messageService.getLegacyMessages(from, to);
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  markAsRead,
  getLegacyMessages,
};
