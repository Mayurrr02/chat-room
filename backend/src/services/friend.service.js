const FriendRequest = require('../models/friendRequest.model');
const User = require('../models/user.model');

class FriendService {
  async sendRequest(senderId, recipientId) {
    if (senderId.toString() === recipientId.toString()) {
      const error = new Error('You cannot send a friend request to yourself');
      error.statusCode = 400;
      throw error;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      const error = new Error('Recipient user not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if request already exists in either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        const error = new Error('You are already friends');
        error.statusCode = 400;
        throw error;
      }
      if (existing.status === 'PENDING') {
        const error = new Error('Friend request already pending');
        error.statusCode = 400;
        throw error;
      }
      // If rejected, allow re-sending
      existing.sender = senderId;
      existing.recipient = recipientId;
      existing.status = 'PENDING';
      await existing.save();
      return existing;
    }

    const request = new FriendRequest({
      sender: senderId,
      recipient: recipientId,
      status: 'PENDING',
    });

    await request.save();
    return request;
  }

  async acceptRequest(requestId, recipientId) {
    const request = await FriendRequest.findOne({
      _id: requestId,
      recipient: recipientId,
      status: 'PENDING',
    });

    if (!request) {
      const error = new Error('Friend request not found or not pending');
      error.statusCode = 404;
      throw error;
    }

    request.status = 'ACCEPTED';
    await request.save();
    return request;
  }

  async rejectRequest(requestId, recipientId) {
    const request = await FriendRequest.findOne({
      _id: requestId,
      recipient: recipientId,
      status: 'PENDING',
    });

    if (!request) {
      const error = new Error('Friend request not found or not pending');
      error.statusCode = 404;
      throw error;
    }

    request.status = 'REJECTED';
    await request.save();
    return request;
  }

  async removeFriend(userId, friendId) {
    await FriendRequest.findOneAndDelete({
      status: 'ACCEPTED',
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId },
      ],
    });
    return { success: true };
  }

  async getFriends(userId) {
    const acceptedRequests = await FriendRequest.find({
      status: 'ACCEPTED',
      $or: [{ sender: userId }, { recipient: userId }],
    }).populate('sender recipient', '-password');

    const friends = acceptedRequests.map((req) => {
      if (req.sender._id.toString() === userId.toString()) {
        return req.recipient;
      }
      return req.sender;
    });

    return friends;
  }

  async getPendingRequests(userId) {
    const incoming = await FriendRequest.find({
      recipient: userId,
      status: 'PENDING',
    }).populate('sender', '-password');

    const outgoing = await FriendRequest.find({
      sender: userId,
      status: 'PENDING',
    }).populate('recipient', '-password');

    return { incoming, outgoing };
  }
}

module.exports = new FriendService();
