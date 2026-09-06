const messageService = require('../services/message.service');
const conversationService = require('../services/conversation.service');
const ConversationMember = require('../models/conversationMember.model');
const User = require('../models/user.model');

module.exports = function registerChatHandlers(io, socket, socketManager) {
  const currentUser = socket.user;
  const currentUserId = currentUser._id.toString();

  // 1. Join a conversation room
  socket.on('conversation:join', async ({ conversationId }) => {
    try {
      if (!conversationId) return;
      socket.join(`conv:${conversationId}`);
    } catch (err) {
      console.error('[Socket] conversation:join error:', err.message);
    }
  });

  // 2. Leave a conversation room
  socket.on('conversation:leave', ({ conversationId }) => {
    if (conversationId) {
      socket.leave(`conv:${conversationId}`);
    }
  });

  // 3. Send message in a conversation
  socket.on('message:send', async (data, callback) => {
    try {
      const { conversationId, content, replyTo, messageType } = data;
      if (!conversationId || !content) return;

      const message = await messageService.sendMessage(currentUserId, {
        conversationId,
        content,
        replyTo,
        messageType: messageType || 'TEXT',
      });

      // Broadcast new message to everyone in the conversation room
      io.to(`conv:${conversationId}`).emit('message:new', message);

      // Also notify members' personal rooms to update conversation list sidebar
      const members = await ConversationMember.find({ conversationId }).lean();
      members.forEach((m) => {
        socketManager.emitToUser(m.userId.toString(), 'conversation:updated', {
          conversationId,
          lastMessage: message,
          senderId: currentUserId,
        });
      });

      if (typeof callback === 'function') {
        callback({ success: true, message });
      }
    } catch (err) {
      console.error('[Socket] message:send error:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // 4. Typing indicators
  socket.on('user:typing:start', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conv:${conversationId}`).emit('user:typing', {
      conversationId,
      userId: currentUserId,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      isTyping: true,
    });
  });

  socket.on('user:typing:stop', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conv:${conversationId}`).emit('user:typing', {
      conversationId,
      userId: currentUserId,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      isTyping: false,
    });
  });

  // 5. Read receipt
  socket.on('message:read', async ({ conversationId }) => {
    try {
      if (!conversationId) return;
      await messageService.markConversationAsRead(currentUserId, conversationId);

      io.to(`conv:${conversationId}`).emit('message:read:ack', {
        conversationId,
        userId: currentUserId,
        readAt: new Date(),
      });
    } catch (err) {
      console.error('[Socket] message:read error:', err.message);
    }
  });

  // 6. Message reactions
  socket.on('message:reaction', async ({ messageId, emoji }, callback) => {
    try {
      if (!messageId || !emoji) return;
      const result = await messageService.toggleReaction(currentUserId, messageId, emoji);

      io.to(`conv:${result.conversationId}`).emit('message:reaction:updated', {
        messageId: result.messageId,
        reactions: result.reactions,
        conversationId: result.conversationId,
      });

      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      console.error('[Socket] message:reaction error:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 7. Message editing & deleting
  socket.on('message:edit', async ({ messageId, content }, callback) => {
    try {
      const updated = await messageService.editMessage(currentUserId, messageId, content);
      io.to(`conv:${updated.conversationId}`).emit('message:edited', updated);
      if (typeof callback === 'function') callback({ success: true, message: updated });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('message:delete', async ({ messageId }, callback) => {
    try {
      const result = await messageService.deleteMessage(currentUserId, messageId);
      io.to(`conv:${result.conversationId}`).emit('message:deleted', {
        messageId,
        conversationId: result.conversationId,
      });
      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Backward Compatibility Handlers for Legacy Clients
  // ==========================================
  socket.on('register-user', (username) => {
    // Already handled in socketManager connection lifecycle
  });

  socket.on('mark-seen', async ({ sender, receiver }) => {
    try {
      const targetUser = await User.findOne({ username: sender.toLowerCase().trim() });
      if (targetUser) {
        socketManager.emitToUser(targetUser._id.toString(), 'messages-seen', { receiver });
      }
    } catch (e) {
      console.error('[Legacy Socket] mark-seen error:', e.message);
    }
  });

  socket.on('send-message', async (data) => {
    try {
      const { sender, receiver, text } = data;
      if (!sender || !receiver || !text) return;

      const senderUser = await User.findOne({ username: sender.toLowerCase().trim() });
      const receiverUser = await User.findOne({ username: receiver.toLowerCase().trim() });

      if (senderUser && receiverUser) {
        const conv = await conversationService.getOrCreateDM(senderUser._id, receiverUser._id);
        const msg = await messageService.sendMessage(senderUser._id, {
          conversationId: conv._id,
          content: text,
        });

        // Emit legacy event to receiver
        socketManager.emitToUser(receiverUser._id.toString(), 'receive-message', {
          _id: msg._id,
          sender,
          receiver,
          text,
          status: 'sent',
          timestamp: msg.createdAt,
        });
      }
    } catch (err) {
      console.error('[Legacy Socket] send-message error:', err.message);
    }
  });
};
