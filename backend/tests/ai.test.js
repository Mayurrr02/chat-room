const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/user.model');
const Conversation = require('../src/models/conversation.model');
const ConversationMember = require('../src/models/conversationMember.model');
const Message = require('../src/models/message.model');
const AIUsage = require('../src/models/aiUsage.model');
const authService = require('../src/services/auth.service');
const conversationService = require('../src/services/conversation.service');
const messageService = require('../src/services/message.service');
const aiService = require('../src/services/ai.service');

describe('AI Copilot Service Tests', () => {
  let testUser, conversation;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const res = await authService.register({
      username: `ai_tester_${Date.now()}`,
      password: 'password123',
      displayName: 'AI Tester',
    });
    testUser = res.user;

    const group = await conversationService.createGroup(testUser._id, {
      title: 'AI Architecture Planning',
    });
    conversation = group;

    // Seed conversation messages
    await messageService.sendMessage(testUser._id, {
      conversationId: conversation._id,
      content: 'We need to evaluate MongoDB vs PostgreSQL for our real-time messaging pipeline.',
    });
    await messageService.sendMessage(testUser._id, {
      conversationId: conversation._id,
      content: 'Decision: We will use MongoDB with compound indexes for messages and Redis for rate limiting.',
    });
  });

  after(async () => {
    if (testUser) {
      await User.deleteMany({ username: { $regex: '^ai_tester_' } });
      await Conversation.deleteOne({ _id: conversation._id });
      await ConversationMember.deleteMany({ conversationId: conversation._id });
      await Message.deleteMany({ conversationId: conversation._id });
      await AIUsage.deleteMany({ userId: testUser._id });
    }
    await mongoose.connection.close();
  });

  test('should correctly parse AI triggers and commands', () => {
    const trigger1 = aiService.parseAiTrigger('@ai which database is best?');
    assert.ok(trigger1);
    assert.strictEqual(trigger1.command, 'general');
    assert.strictEqual(trigger1.argument, 'which database is best?');

    const trigger2 = aiService.parseAiTrigger('@AI summarize this discussion');
    assert.ok(trigger2);
    assert.strictEqual(trigger2.command, 'summarize');
    assert.strictEqual(trigger2.argument, 'this discussion');

    const trigger3 = aiService.parseAiTrigger('@ai explain WebSockets');
    assert.ok(trigger3);
    assert.strictEqual(trigger3.command, 'explain');
    assert.strictEqual(trigger3.argument, 'WebSockets');

    const trigger4 = aiService.parseAiTrigger('Hello team how are we doing?');
    assert.strictEqual(trigger4, null);
  });

  test('should format chronological conversation context correctly', async () => {
    const context = await aiService.buildConversationContext(conversation._id, 10);
    assert.ok(context);
    assert.ok(context.includes('MongoDB vs PostgreSQL'));
    assert.ok(context.includes('Decision: We will use MongoDB'));
  });

  test('should generate and stream response with Gemini 2.5', async () => {
    let chunksReceived = 0;
    const result = await aiService.streamResponse({
      prompt: 'Give 3 bullet points on WebSocket advantages.',
      onChunk: (chunk) => {
        if (chunk) chunksReceived++;
      },
    });

    assert.ok(result.text.length > 0);
    assert.ok(chunksReceived > 0, 'Stream should receive at least 1 chunk');
    assert.ok(result.latencyMs > 0);
  });

  test('should execute @ai mention, save AI message to DB, and log usage', async () => {
    const aiMessage = await aiService.handleAiMessage({
      conversationId: conversation._id,
      userId: testUser._id,
      userMessage: {
        content: '@ai summarize our database decision',
        conversationType: 'GROUP',
      },
    });

    assert.ok(aiMessage);
    assert.strictEqual(aiMessage.senderUsername, 'AI Assistant');
    assert.strictEqual(aiMessage.messageType, 'AI_RESPONSE');
    assert.ok(aiMessage.content.length > 0);

    // Verify usage recorded in MongoDB
    const usage = await AIUsage.findOne({ userId: testUser._id, conversationId: conversation._id });
    assert.ok(usage);
    assert.strictEqual(usage.status, 'SUCCESS');
    assert.ok(usage.latencyMs > 0);
  });

  test('should suggest quick contextual replies', async () => {
    const suggestions = await aiService.suggestReplies({
      conversationId: conversation._id,
      lastMessageContent: 'Can we schedule our deployment for tomorrow morning?',
    });

    assert.ok(Array.isArray(suggestions));
    assert.ok(suggestions.length > 0);
  });

  test('should generate structured conversation summary', async () => {
    const summary = await aiService.summarizeConversation(conversation._id, testUser._id);
    assert.ok(summary.summary);
    assert.ok(summary.summary.length > 20);
  });
});
