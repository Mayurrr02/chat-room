const conversationService = require('../services/conversation.service');
const User = require('../models/user.model');

const getUserConversations = async (req, res, next) => {
  try {
    const conversations = await conversationService.getUserConversations(req.user._id);
    res.status(200).json({ success: true, conversations });
  } catch (err) {
    next(err);
  }
};

const getOrCreateDM = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'targetUserId is required' },
      });
    }

    const conversation = await conversationService.getOrCreateDM(req.user._id, targetUserId);
    res.status(200).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { title, memberIds, avatar } = req.body;
    if (!title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Group title is required' },
      });
    }

    const conversation = await conversationService.createGroup(req.user._id, {
      title,
      memberIds: memberIds || [],
      avatar,
    });
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
};

const getConversationDetails = async (req, res, next) => {
  try {
    const conversation = await conversationService.getConversationDetails(
      req.params.id,
      req.user._id
    );
    res.status(200).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
};

const addGroupMembers = async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'memberIds array is required' },
      });
    }

    const conversation = await conversationService.addGroupMembers(
      req.params.id,
      req.user._id,
      memberIds
    );
    res.status(200).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
};

const removeGroupMember = async (req, res, next) => {
  try {
    const result = await conversationService.removeGroupMember(
      req.params.id,
      req.user._id,
      req.params.userId
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const result = await conversationService.removeGroupMember(
      req.params.id,
      req.user._id,
      req.user._id
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const updateGroupInfo = async (req, res, next) => {
  try {
    const { title, avatar } = req.body;
    const conversation = await conversationService.updateGroupInfo(
      req.params.id,
      req.user._id,
      { title, avatar }
    );
    res.status(200).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
};

// Legacy backward-compatibility endpoint: GET /api/conversations/:username
const legacyGetConversations = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json([]);
    }

    const conversations = await conversationService.getUserConversations(user._id);
    // Legacy client expects array of User objects
    const contacts = conversations
      .filter((c) => c.type === 'DM' && c.peerUser)
      .map((c) => c.peerUser);

    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUserConversations,
  getOrCreateDM,
  createGroup,
  getConversationDetails,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  updateGroupInfo,
  legacyGetConversations,
};
