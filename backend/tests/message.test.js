const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/user.model');
const Conversation = require('../src/models/conversation.model');
const ConversationMember = require('../src/models/conversationMember.model');
const Message = require('../src/models/message.model');
const authService = require('../src/services/auth.service');
const conversationService = require('../src/services/conversation.service');
const messageService = require('../src/services/message.service');

describe('Message Service Tests', () => {
  let userA, userB, conversation;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const resA = await authService.register({ username: `msg_ua_${Date.now()}`, password: 'password123' });
    const resB = await authService.register({ username: `msg_ub_${Date.now()}`, password: 'password123' });

    userA = resA.user;
    userB = resB.user;

    conversation = await conversationService.getOrCreateDM(userA._id, userB._id);
  });

  after(async () => {
    await User.deleteMany({ username: { $regex: '^msg_u' } });
    if (conversation) {
      await Conversation.deleteOne({ _id: conversation._id });
      await ConversationMember.deleteMany({ conversationId: conversation._id });
      await Message.deleteMany({ conversationId: conversation._id });
    }
    await mongoose.connection.close();
  });

  test('should send a message and update conversation lastMessage', async () => {
    const msg = await messageService.sendMessage(userA._id, {
      conversationId: conversation._id,
      content: 'Hello from User A!',
    });

    assert.ok(msg);
    assert.strictEqual(msg.content, 'Hello from User A!');
    assert.strictEqual(msg.senderUsername, userA.username);

    const updatedConv = await Conversation.findById(conversation._id);
    assert.strictEqual(updatedConv.lastMessage.text, 'Hello from User A!');
  });

  test('should toggle emoji reactions on a message', async () => {
    const msg = await messageService.sendMessage(userA._id, {
      conversationId: conversation._id,
      content: 'Message to react to',
    });

    // Add reaction
    const reacted = await messageService.toggleReaction(userB._id, msg._id, '👍');
    assert.ok(reacted.success);
    assert.strictEqual(reacted.reactions.length, 1);
    assert.strictEqual(reacted.reactions[0].emoji, '👍');

    // Remove reaction (toggle off)
    const toggledOff = await messageService.toggleReaction(userB._id, msg._id, '👍');
    assert.ok(toggledOff.success);
    assert.strictEqual(toggledOff.reactions.length, 0);
  });

  test('should edit and soft-delete a message', async () => {
    const msg = await messageService.sendMessage(userA._id, {
      conversationId: conversation._id,
      content: 'Original message text',
    });

    // Edit
    const edited = await messageService.editMessage(userA._id, msg._id, 'Updated message text');
    assert.strictEqual(edited.content, 'Updated message text');
    assert.strictEqual(edited.isEdited, true);

    // Delete
    const deleted = await messageService.deleteMessage(userA._id, msg._id);
    assert.ok(deleted.success);

    const checkMsg = await Message.findById(msg._id);
    assert.ok(checkMsg.deletedAt);
  });

  test('should paginate messages correctly', async () => {
    // Send 5 messages
    for (let i = 1; i <= 5; i++) {
      await messageService.sendMessage(userA._id, {
        conversationId: conversation._id,
        content: `Pagination test ${i}`,
      });
    }

    const page1 = await messageService.getMessages(conversationId = conversation._id, userA._id, {
      limit: 3,
    });

    assert.strictEqual(page1.messages.length, 3);
    assert.strictEqual(page1.hasMore, true);
    assert.ok(page1.nextCursor);

    const page2 = await messageService.getMessages(conversationId = conversation._id, userA._id, {
      cursor: page1.nextCursor,
      limit: 3,
    });

    assert.ok(page2.messages.length > 0);
  });
});
