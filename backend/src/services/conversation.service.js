const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model');
const ConversationMember = require('../models/conversationMember.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');

class ConversationService {
  async getUserConversations(userId) {
    // 1. Get all memberships for the user
    const memberships = await ConversationMember.find({ userId }).lean();
    if (!memberships || memberships.length === 0) return [];

    const conversationIds = memberships.map((m) => m.conversationId);
    const membershipMap = new Map(
      memberships.map((m) => [m.conversationId.toString(), m])
    );

    // 2. Fetch conversations
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      isArchived: false,
    })
      .sort({ updatedAt: -1 })
      .lean();

    // 3. Fetch all members for these conversations to populate user details
    const allMembers = await ConversationMember.find({
      conversationId: { $in: conversationIds },
    })
      .populate('userId', 'username displayName avatarUrl avatar status lastSeen')
      .lean();

    const membersByConvId = new Map();
    allMembers.forEach((mem) => {
      const convId = mem.conversationId.toString();
      if (!membersByConvId.has(convId)) {
        membersByConvId.set(convId, []);
      }
      membersByConvId.get(convId).push(mem);
    });

    // 4. Enrich conversation objects with unread count and peer info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const convIdStr = conv._id.toString();
        const myMembership = membershipMap.get(convIdStr);
        const members = membersByConvId.get(convIdStr) || [];

        // Count unread messages created after my lastReadAt
        const lastReadAt = myMembership ? myMembership.lastReadAt : new Date(0);
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId },
          createdAt: { $gt: lastReadAt },
          deletedAt: null,
        });

        // Determine title, avatar, and other participant for DMs
        let displayTitle = conv.title;
        let displayAvatar = conv.avatar;
        let peerUser = null;

        if (conv.type === 'DM') {
          const otherMember = members.find(
            (m) => m.userId && m.userId._id.toString() !== userId.toString()
          );
          if (otherMember && otherMember.userId) {
            peerUser = otherMember.userId;
            displayTitle = otherMember.userId.displayName || otherMember.userId.username;
            displayAvatar = otherMember.userId.avatarUrl || otherMember.userId.avatar;
          }
        } else if (conv.type === 'AI') {
          displayTitle = conv.title || 'AI Copilot';
          displayAvatar = 'https://ui-avatars.com/api/?name=AI&background=6366F1&color=fff&rounded=true&bold=true';
        }

        return {
          ...conv,
          displayTitle: displayTitle || 'Untitled Chat',
          displayAvatar,
          peerUser,
          members,
          unreadCount,
          myRole: myMembership ? myMembership.role : 'MEMBER',
        };
      })
    );

    return enriched;
  }

  async getOrCreateDM(userId, targetUserId) {
    if (userId.toString() === targetUserId.toString()) {
      const error = new Error('Cannot create a DM with yourself');
      error.statusCode = 400;
      throw error;
    }

    // Find all DM conversations of user1
    const user1Memberships = await ConversationMember.find({ userId }).select('conversationId');
    const user1ConvIds = user1Memberships.map((m) => m.conversationId);

    // Check if targetUser shares any of these DM conversations
    const sharedDM = await ConversationMember.findOne({
      userId: targetUserId,
      conversationId: { $in: user1ConvIds },
    });

    if (sharedDM) {
      const conv = await Conversation.findOne({ _id: sharedDM.conversationId, type: 'DM' });
      if (conv) {
        return this.getConversationDetails(conv._id, userId);
      }
    }

    // Create new DM Conversation
    const conversation = new Conversation({
      type: 'DM',
      createdBy: userId,
    });
    await conversation.save();

    await ConversationMember.create([
      { conversationId: conversation._id, userId, role: 'MEMBER' },
      { conversationId: conversation._id, userId: targetUserId, role: 'MEMBER' },
    ]);

    return this.getConversationDetails(conversation._id, userId);
  }

  async createGroup(userId, { title, memberIds = [], avatar = '' }) {
    if (!title || title.trim() === '') {
      const error = new Error('Group title is required');
      error.statusCode = 400;
      throw error;
    }

    const creator = await User.findById(userId);

    const conversation = new Conversation({
      type: 'GROUP',
      title: title.trim(),
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(title.trim())}&background=4F46E5&color=fff&rounded=true`,
      createdBy: userId,
      lastMessage: {
        text: `${creator.displayName || creator.username} created group "${title.trim()}"`,
        sender: userId,
        senderUsername: creator.username,
        timestamp: new Date(),
      },
    });
    await conversation.save();

    // Add owner
    const membersToInsert = [
      { conversationId: conversation._id, userId, role: 'OWNER' },
    ];

    // Add initial members (filter duplicates & creator)
    const uniqueMemberIds = [...new Set(memberIds.filter((id) => id.toString() !== userId.toString()))];
    uniqueMemberIds.forEach((mId) => {
      membersToInsert.push({
        conversationId: conversation._id,
        userId: mId,
        role: 'MEMBER',
      });
    });

    await ConversationMember.insertMany(membersToInsert);

    // Create initial system message
    await Message.create({
      conversationId: conversation._id,
      sender: userId,
      senderUsername: creator.username,
      content: `${creator.displayName || creator.username} created group "${title.trim()}"`,
      messageType: 'SYSTEM',
    });

    return this.getConversationDetails(conversation._id, userId);
  }

  async getConversationDetails(conversationId, userId) {
    const membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership) {
      const error = new Error('You do not have access to this conversation');
      error.statusCode = 403;
      throw error;
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      throw error;
    }

    const members = await ConversationMember.find({ conversationId })
      .populate('userId', 'username displayName avatarUrl avatar status lastSeen')
      .lean();

    let displayTitle = conversation.title;
    let displayAvatar = conversation.avatar;
    let peerUser = null;

    if (conversation.type === 'DM') {
      const otherMember = members.find(
        (m) => m.userId && m.userId._id.toString() !== userId.toString()
      );
      if (otherMember && otherMember.userId) {
        peerUser = otherMember.userId;
        displayTitle = otherMember.userId.displayName || otherMember.userId.username;
        displayAvatar = otherMember.userId.avatarUrl || otherMember.userId.avatar;
      }
    } else if (conversation.type === 'AI') {
      displayTitle = conversation.title || 'AI Copilot';
      displayAvatar = 'https://ui-avatars.com/api/?name=AI&background=6366F1&color=fff&rounded=true&bold=true';
    }

    return {
      ...conversation,
      displayTitle: displayTitle || 'Untitled Chat',
      displayAvatar,
      peerUser,
      members,
      myRole: membership.role,
    };
  }

  async addGroupMembers(conversationId, userId, newMemberIds = []) {
    const membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      const error = new Error('Only group admins or owner can add members');
      error.statusCode = 403;
      throw error;
    }

    const user = await User.findById(userId);

    for (const newId of newMemberIds) {
      const existing = await ConversationMember.findOne({ conversationId, userId: newId });
      if (!existing) {
        await ConversationMember.create({
          conversationId,
          userId: newId,
          role: 'MEMBER',
        });

        const addedUser = await User.findById(newId);
        if (addedUser) {
          await Message.create({
            conversationId,
            sender: userId,
            senderUsername: user.username,
            content: `${user.displayName || user.username} added ${addedUser.displayName || addedUser.username} to the group`,
            messageType: 'SYSTEM',
          });
        }
      }
    }

    return this.getConversationDetails(conversationId, userId);
  }

  async removeGroupMember(conversationId, userId, targetUserId) {
    const actorMembership = await ConversationMember.findOne({ conversationId, userId });
    if (!actorMembership) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }

    const isSelf = userId.toString() === targetUserId.toString();
    if (!isSelf && !['OWNER', 'ADMIN'].includes(actorMembership.role)) {
      const error = new Error('Only admins or the owner can remove members');
      error.statusCode = 403;
      throw error;
    }

    const targetMembership = await ConversationMember.findOne({ conversationId, userId: targetUserId });
    if (!targetMembership) {
      const error = new Error('User is not a member of this conversation');
      error.statusCode = 404;
      throw error;
    }

    if (targetMembership.role === 'OWNER' && !isSelf) {
      const error = new Error('Group owner cannot be removed');
      error.statusCode = 403;
      throw error;
    }

    await ConversationMember.deleteOne({ _id: targetMembership._id });

    const actor = await User.findById(userId);
    const target = await User.findById(targetUserId);

    const systemText = isSelf
      ? `${actor.displayName || actor.username} left the group`
      : `${actor.displayName || actor.username} removed ${target.displayName || target.username} from the group`;

    await Message.create({
      conversationId,
      sender: userId,
      senderUsername: actor.username,
      content: systemText,
      messageType: 'SYSTEM',
    });

    return { success: true, message: systemText };
  }

  async updateGroupInfo(conversationId, userId, { title, avatar }) {
    const membership = await ConversationMember.findOne({ conversationId, userId });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      const error = new Error('Only group admins or owner can edit group information');
      error.statusCode = 403;
      throw error;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== 'GROUP') {
      const error = new Error('Group conversation not found');
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(userId);
    let systemMessage = null;

    if (title && title.trim() !== conversation.title) {
      const oldTitle = conversation.title;
      conversation.title = title.trim();
      systemMessage = `${user.displayName || user.username} renamed the group from "${oldTitle}" to "${title.trim()}"`;
    }

    if (avatar !== undefined) {
      conversation.avatar = avatar;
    }

    await conversation.save();

    if (systemMessage) {
      await Message.create({
        conversationId,
        sender: userId,
        senderUsername: user.username,
        content: systemMessage,
        messageType: 'SYSTEM',
      });
    }

    return this.getConversationDetails(conversationId, userId);
  }
}

module.exports = new ConversationService();
