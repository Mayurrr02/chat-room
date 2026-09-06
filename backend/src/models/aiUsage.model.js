const mongoose = require('mongoose');

const AIUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
    },
    promptType: {
      type: String,
      enum: ['CHAT', 'MENTION', 'COMMAND', 'SUMMARY', 'SUGGEST_REPLY', 'RAG'],
      default: 'CHAT',
      index: true,
    },
    command: {
      type: String,
      default: null,
    },
    model: {
      type: String,
      default: 'gemini-2.5-flash',
    },
    promptLength: {
      type: Number,
      default: 0,
    },
    responseLength: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AIUsageSchema.index({ createdAt: -1 });

const AIUsage = mongoose.models.AIUsage || mongoose.model('AIUsage', AIUsageSchema);

module.exports = AIUsage;
