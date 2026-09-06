const friendService = require('../services/friend.service');

const sendRequest = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'recipientId is required' },
      });
    }

    const request = await friendService.sendRequest(req.user._id, recipientId);
    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const request = await friendService.acceptRequest(req.params.id, req.user._id);
    res.status(200).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const request = await friendService.rejectRequest(req.params.id, req.user._id);
    res.status(200).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    await friendService.removeFriend(req.user._id, req.params.friendId);
    res.status(200).json({ success: true, message: 'Friend removed successfully' });
  } catch (err) {
    next(err);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const friends = await friendService.getFriends(req.user._id);
    res.status(200).json({ success: true, friends });
  } catch (err) {
    next(err);
  }
};

const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await friendService.getPendingRequests(req.user._id);
    res.status(200).json({ success: true, ...requests });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
};
