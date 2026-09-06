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

describe('Conversation Service Tests', () => {
  let user1, user2, user3;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const res1 = await authService.register({ username: `conv_u1_${Date.now()}`, password: 'password123' });
    const res2 = await authService.register({ username: `conv_u2_${Date.now()}`, password: 'password123' });
    const res3 = await authService.register({ username: `conv_u3_${Date.now()}`, password: 'password123' });

    user1 = res1.user;
    user2 = res2.user;
    user3 = res3.user;
  });

  after(async () => {
    await User.deleteMany({ username: { $regex: '^conv_u' } });
    if (user1) {
      const memberships = await ConversationMember.find({ userId: { $in: [user1._id, user2._id, user3._id] } });
      const convIds = memberships.map((m) => m.conversationId);
      await Conversation.deleteMany({ _id: { $in: convIds } });
      await ConversationMember.deleteMany({ conversationId: { $in: convIds } });
      await Message.deleteMany({ conversationId: { $in: convIds } });
    }
    await mongoose.connection.close();
  });

  test('should create or retrieve a 1-on-1 DM conversation', async () => {
    const dm1 = await conversationService.getOrCreateDM(user1._id, user2._id);
    assert.ok(dm1);
    assert.strictEqual(dm1.type, 'DM');
    assert.strictEqual(dm1.members.length, 2);

    // Calling it again should return the exact same conversation
    const dm2 = await conversationService.getOrCreateDM(user2._id, user1._id);
    assert.strictEqual(dm1._id.toString(), dm2._id.toString());
  });

  test('should create a group conversation with members and owner role', async () => {
    const group = await conversationService.createGroup(user1._id, {
      title: 'Dev Team',
      memberIds: [user2._id, user3._id],
    });

    assert.ok(group);
    assert.strictEqual(group.type, 'GROUP');
    assert.strictEqual(group.title, 'Dev Team');
    assert.strictEqual(group.members.length, 3);

    const ownerMember = group.members.find((m) => m.userId._id.toString() === user1._id.toString());
    assert.strictEqual(ownerMember.role, 'OWNER');
  });

  test('should list conversations for a user', async () => {
    const list = await conversationService.getUserConversations(user1._id);
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 2);
  });
});
