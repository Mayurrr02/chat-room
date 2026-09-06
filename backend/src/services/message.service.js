const mongoose = require('mongoose');
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const ConversationMember = require('../models/conversationMember.model');
const User = require('../models/user.model');

class MessageService {
  async getMessages(conversationId, userId, { cursor, limit = 40 }) {
    // 1. Verify membership
    const isMember = await ConversationMember.findOne({ conversationId, userId });
    if (!isMember) {
      const error = new Error('You are not a member of this conversation');
      error.statusCode = 403;
      throw error;
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);

    const query = {
      conversationId,
      deletedAt: null,
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Fetch messages descending by createdAt for efficient pagination
    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit + 1)
      .populate('sender', 'username displayName avatarUrl avatar status')
      .lean();

    const hasMore = rawMessages.length > parsedLimit;
    const messagesSlice = hasMore ? rawMessages.slice(0, parsedLimit) : rawMessages;

    const nextCursor =
      hasMore && messagesSlice.length > 0
        ? messagesSlice[messagesSlice.length - 1].createdAt
        : null;

    // Return in ascending chronological order for chat UI
    const chronologicalMessages = messagesSlice.reverse();

    return {
      messages: chronologicalMessages,
      nextCursor,
      hasMore,
    };
  }

  async sendMessage(userId, { conversationId, content, replyTo, messageType = 'TEXT' }) {
    if (!content || content.trim() === '') {
      const error = new Error('Message content cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    // Verify membership
    const membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      const error = new Error('You are not a member of this conversation');
      error.statusCode = 403;
      throw error;
    }

    const sender = await User.findById(userId);

    const message = new Message({
      conversationId,
      sender: userId,
      senderUsername: sender.username,
      content: content.trim(),
      messageType,
      replyTo: replyTo || undefined,
      status: 'SENT',
    });

    await message.save();

    // Update conversation lastMessage & updatedAt timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        text: content.trim().substring(0, 150),
        sender: userId,
        senderUsername: sender.username,
        timestamp: new Date(),
      },
      updatedAt: new Date(),
    });

    // Update sender's read timestamp
    await ConversationMember.updateOne(
      { conversationId, userId },
      { lastReadAt: new Date() }
    );

    const populated = await Message.findById(message._id)
      .populate('sender', 'username displayName avatarUrl avatar status')
      .lean();

    return populated;
  }

  async editMessage(userId, messageId, newContent) {
    if (!newContent || newContent.trim() === '') {
      const error = new Error('Content cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    if (message.sender.toString() !== userId.toString()) {
      const error = new Error('You can only edit your own messages');
      error.statusCode = 403;
      throw error;
    }

    if (message.deletedAt) {
      const error = new Error('Cannot edit a deleted message');
      error.statusCode = 400;
      throw error;
    }

    message.content = newContent.trim();
    message.isEdited = true;
    await message.save();

    return Message.findById(messageId).populate('sender', 'username displayName avatarUrl avatar status');
  }

  async deleteMessage(userId, messageId) {
    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    if (message.sender.toString() !== userId.toString()) {
      const error = new Error('You can only delete your own messages');
      error.statusCode = 403;
      throw error;
    }

    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await message.save();

    return { success: true, messageId: message._id, conversationId: message.conversationId };
  }

  async toggleReaction(userId, messageId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }

    const existingReactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    if (existingReactionIndex > -1) {
      const userIndex = message.reactions[existingReactionIndex].users.findIndex(
        (u) => u.toString() === userId.toString()
      );

      if (userIndex > -1) {
        // Remove reaction
        message.reactions[existingReactionIndex].users.splice(userIndex, 1);
        if (message.reactions[existingReactionIndex].users.length === 0) {
          message.reactions.splice(existingReactionIndex, 1);
        }
      } else {
        // Add user to existing emoji reaction
        message.reactions[existingReactionIndex].users.push(userId);
      }
    } else {
      // Create new emoji reaction entry
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    return { success: true, messageId: message._id, reactions: message.reactions, conversationId: message.conversationId };
  }

  async markConversationAsRead(userId, conversationId) {
    await ConversationMember.updateOne(
      { conversationId, userId },
      { lastReadAt: new Date() }
    );

    // Update status of messages where sender != userId to READ
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, status: { $ne: 'READ' } },
      { status: 'READ' }
    );

    return { success: true, conversationId };
  }

  // Legacy compatibility for GET /api/messages?from=...&to=...
  async getLegacyMessages(fromUsername, toUsername) {
    const user1 = await User.findOne({ username: fromUsername.toLowerCase().trim() });
    const user2 = await User.findOne({ username: toUsername.toLowerCase().trim() });

    if (!user1 || !user2) return [];

    // Find shared conversation or search direct message matches
    const convMember1 = await ConversationMember.find({ userId: user1._id }).select('conversationId');
    const convIds1 = convMember1.map((m) => m.conversationId);

    const shared = await ConversationMember.findOne({
      userId: user2._id,
      conversationId: { $in: convIds1 },
    });

    if (shared) {
      const msgs = await Message.find({
        conversationId: shared.conversationId,
        deletedAt: null,
      })
        .sort({ createdAt: 1 })
        .lean();

      return msgs.map((m) => ({
        _id: m._id,
        sender: m.senderUsername,
        receiver: m.sender.toString() === user1._id.toString() ? toUsername : fromUsername,
        text: m.content,
        timestamp: m.createdAt,
        status: m.status === 'READ' ? 'seen' : 'sent',
      }));
    }

    return [];
  }
}

module.exports = new MessageService();
