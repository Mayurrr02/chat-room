const { GoogleGenerativeAI } = require('@google/generative-ai');
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const ConversationMember = require('../models/conversationMember.model');
const User = require('../models/user.model');
const AIUsage = require('../models/aiUsage.model');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.defaultModel = 'gemini-2.5-flash';
    this.aiUserCache = null;
  }

  // Ensure a persistent AI system user exists in DB
  async getAiUser() {
    if (this.aiUserCache) return this.aiUserCache;

    let aiUser = await User.findOne({ username: 'ai_assistant' });
    if (!aiUser) {
      aiUser = new User({
        username: 'ai_assistant',
        displayName: '🤖 AI Assistant',
        password: 'ai_system_internal_password_' + Date.now(),
        avatarUrl: 'https://ui-avatars.com/api/?name=AI&background=6366F1&color=fff&rounded=true&bold=true',
        bio: 'Embedded Gemini-powered AI Copilot',
        status: 'ONLINE',
      });
      await aiUser.save();
    }
    this.aiUserCache = aiUser;
    return aiUser;
  }

  // Retrieve clean formatted conversational history
  async buildConversationContext(conversationId, maxMessages = 15) {
    if (!conversationId) return '';

    const recentMessages = await Message.find({
      conversationId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(maxMessages)
      .populate('sender', 'username displayName')
      .lean();

    if (recentMessages.length === 0) return '';

    const chronological = recentMessages.reverse();

    return chronological
      .map((msg) => {
        const author =
          msg.sender?.displayName || msg.sender?.username || msg.senderUsername || 'User';
        const time = new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `[${time}] ${author}: ${msg.content}`;
      })
      .join('\n');
  }

  // Parse @ai mentions and slash commands
  parseAiTrigger(text) {
    if (!text) return null;
    const trimmed = text.trim();

    // Check if text starts with or contains @ai / @AI / @yourgpt
    const aiMentionRegex = /@(?:ai|AI|yourgpt)\b\s*(.*)/i;
    const match = trimmed.match(aiMentionRegex);

    if (!match) return null;

    const query = match[1].trim();

    // Check for specific sub-commands: summarize, explain, translate, extract-actions, brainstorm, rewrite, reply
    const commandMatch = query.match(/^(summarize|explain|translate|extract-actions|brainstorm|rewrite|reply)\b\s*(.*)/i);

    if (commandMatch) {
      return {
        isMention: true,
        command: commandMatch[1].toLowerCase(),
        argument: commandMatch[2].trim(),
        rawQuery: query,
      };
    }

    return {
      isMention: true,
      command: 'general',
      argument: query,
      rawQuery: query,
    };
  }

  // Core stream generator with error handling and retry
  async streamResponse({ prompt, context = '', systemInstruction = '', onChunk }) {
    if (!this.genAI) {
      throw new Error('Gemini API is not configured on the server');
    }

    const defaultInstructions =
      "You are 'AI Assistant', an intelligent, collaborative AI copilot living inside a real-time communication platform. " +
      "You are helpful, precise, friendly, and analytical. " +
      "Formatting Rules: Use clean Markdown. Use clear headings (###), bold key terms (**word**), bullet points (-) or numbered lists for readability. Never output monolithic unstructured blocks of text.";

    const finalInstruction = systemInstruction || defaultInstructions;

    const model = this.genAI.getGenerativeModel({
      model: this.defaultModel,
      systemInstruction: finalInstruction,
    });

    let fullPrompt = '';
    if (context) {
      fullPrompt += `=== RECENT CONVERSATION CONTEXT ===\n${context}\n===================================\n\n`;
    }
    fullPrompt += `User Request:\n${prompt}`;

    const startTime = Date.now();
    let accumulatedText = '';

    try {
      const result = await model.generateContentStream(fullPrompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          accumulatedText += chunkText;
          if (typeof onChunk === 'function') {
            onChunk(chunkText);
          }
        }
      }

      const latencyMs = Date.now() - startTime;
      return {
        text: accumulatedText,
        latencyMs,
        model: this.defaultModel,
      };
    } catch (err) {
      console.error('[AIService] Stream error:', err.message);
      throw err;
    }
  }

  // Execute AI response flow for message mentions
  async handleAiMessage({
    conversationId,
    userId,
    userMessage,
    onStreamChunk,
  }) {
    const trigger = this.parseAiTrigger(userMessage.content);
    const isAiChat = userMessage.conversationType === 'AI';

    if (!trigger && !isAiChat) return null;

    const query = trigger ? (trigger.argument || trigger.rawQuery || 'How can I assist you?') : userMessage.content;
    const command = trigger ? trigger.command : 'general';

    const context = await this.buildConversationContext(conversationId, 15);
    const aiUser = await this.getAiUser();

    let customInstruction = null;
    let effectivePrompt = query;

    // Command-specific prompt templating
    if (command === 'summarize') {
      customInstruction =
        "You are an expert executive meeting assistant. Analyze the conversation context and produce a structured Markdown summary with sections: ### 📋 Conversation Summary, ### 💡 Key Decisions, ### ✅ Action Items & Owners, and ### ❓ Open Questions.";
      effectivePrompt = query ? `Summarize this conversation focusing on: ${query}` : "Summarize this recent conversation concisely.";
    } else if (command === 'explain') {
      customInstruction =
        "You are an expert technical educator. Explain the following concept clearly with intuitive analogies, structured steps, and code/technical examples where applicable.";
      effectivePrompt = `Explain in depth: ${query}`;
    } else if (command === 'translate') {
      customInstruction =
        "You are a professional multilingual translator. Translate the provided text or conversation accurately, preserving tone and nuances. Format clearly.";
      effectivePrompt = `Translate the following: ${query}`;
    } else if (command === 'extract-actions') {
      customInstruction =
        "Extract all actionable tasks, deliverables, assignees, and deadlines from the conversation context. Present as a clean checkbox list.";
      effectivePrompt = "Extract all action items and tasks from this conversation.";
    } else if (command === 'brainstorm') {
      customInstruction =
        "You are a creative technical architect and product strategist. Brainstorm innovative, actionable ideas, architectural patterns, and solutions.";
      effectivePrompt = `Brainstorm ideas for: ${query}`;
    } else if (command === 'rewrite') {
      customInstruction =
        "You are an executive communication coach. Rewrite the user's text to make it more professional, articulate, concise, and persuasive. Provide 2-3 polished variations.";
      effectivePrompt = `Rewrite this: ${query}`;
    }

    const startTime = Date.now();
    let streamResult = null;
    let status = 'SUCCESS';
    let errorMessage = null;

    try {
      streamResult = await this.streamResponse({
        prompt: effectivePrompt,
        context,
        systemInstruction: customInstruction,
        onChunk: onStreamChunk,
      });

      // Save AI message to DB
      const aiMessage = new Message({
        conversationId,
        sender: aiUser._id,
        senderUsername: 'AI Assistant',
        content: streamResult.text,
        messageType: 'AI_RESPONSE',
        status: 'SENT',
      });
      await aiMessage.save();

      // Update conversation lastMessage
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          text: streamResult.text.substring(0, 150),
          sender: aiUser._id,
          senderUsername: 'AI Assistant',
          timestamp: new Date(),
        },
        updatedAt: new Date(),
      });

      // Track usage
      await AIUsage.create({
        userId,
        conversationId,
        promptType: trigger ? (command === 'general' ? 'MENTION' : 'COMMAND') : 'CHAT',
        command: trigger ? command : null,
        model: streamResult.model,
        promptLength: effectivePrompt.length + (context ? context.length : 0),
        responseLength: streamResult.text.length,
        latencyMs: streamResult.latencyMs,
        status: 'SUCCESS',
      });

      const populated = await Message.findById(aiMessage._id)
        .populate('sender', 'username displayName avatarUrl avatar status')
        .lean();

      return populated;
    } catch (err) {
      status = 'FAILED';
      errorMessage = err.message;

      // Track failed usage
      await AIUsage.create({
        userId,
        conversationId,
        promptType: trigger ? 'COMMAND' : 'CHAT',
        command,
        model: this.defaultModel,
        promptLength: effectivePrompt.length,
        responseLength: 0,
        latencyMs: Date.now() - startTime,
        status: 'FAILED',
        errorMessage: err.message,
      });

      const fallbackText = "I encountered an error connecting to my AI reasoning engine. Please try again in a moment.";
      if (typeof onStreamChunk === 'function') onStreamChunk(fallbackText);

      const fallbackMessage = new Message({
        conversationId,
        sender: aiUser._id,
        senderUsername: 'AI Assistant',
        content: fallbackText,
        messageType: 'AI_RESPONSE',
      });
      await fallbackMessage.save();

      return Message.findById(fallbackMessage._id)
        .populate('sender', 'username displayName avatarUrl avatar status')
        .lean();
    }
  }

  // Quick reply suggestions for the active conversation
  async suggestReplies({ conversationId, lastMessageContent }) {
    if (!this.genAI) return [];

    const context = await this.buildConversationContext(conversationId, 6);
    const model = this.genAI.getGenerativeModel({
      model: this.defaultModel,
      systemInstruction:
        "You are an assistant generating quick reply options for a chat app. " +
        "Generate exactly 3 short, natural, conversational responses (each under 12 words) to the latest message. " +
        "Return ONLY a valid JSON array of strings, for example: [\"Sounds great!\", \"Let's review tomorrow.\", \"Could you clarify?\"] with no markdown ticks or additional text.",
    });

    try {
      const prompt = `Conversation history:\n${context}\n\nLatest message: "${lastMessageContent}"\n\nGenerate 3 suggested replies as a JSON array.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Clean markdown code blocks if returned
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3);
      }
      return [];
    } catch (e) {
      console.warn('[AIService] Suggest replies error:', e.message);
      return ["Sounds good!", "Could you provide more details?", "Let's discuss this soon."];
    }
  }

  // Dedicated structured conversation summarizer
  async summarizeConversation(conversationId, userId) {
    const context = await this.buildConversationContext(conversationId, 30);
    if (!context || context.trim() === '') {
      return {
        summary: "There are not enough messages in this conversation to generate a summary.",
        decisions: [],
        actionItems: [],
      };
    }

    if (!this.genAI) {
      throw new Error('Gemini API is not configured');
    }

    const model = this.genAI.getGenerativeModel({
      model: this.defaultModel,
      systemInstruction:
        "You are an executive meeting synthesizer. Produce a high-quality, structured summary of the conversation. " +
        "Format cleanly in Markdown with sections: ### 📋 Executive Summary, ### 💡 Key Decisions Made, ### ✅ Action Items & Owners, and ### ❓ Open Questions.",
    });

    const startTime = Date.now();
    try {
      const result = await model.generateContent(`Here is the conversation history:\n\n${context}\n\nPlease generate a comprehensive summary.`);
      const summaryText = result.response.text();
      const latencyMs = Date.now() - startTime;

      await AIUsage.create({
        userId,
        conversationId,
        promptType: 'SUMMARY',
        model: this.defaultModel,
        promptLength: context.length,
        responseLength: summaryText.length,
        latencyMs,
        status: 'SUCCESS',
      });

      return {
        summary: summaryText,
        timestamp: new Date(),
      };
    } catch (err) {
      await AIUsage.create({
        userId,
        conversationId,
        promptType: 'SUMMARY',
        model: this.defaultModel,
        promptLength: context.length,
        responseLength: 0,
        latencyMs: Date.now() - startTime,
        status: 'FAILED',
        errorMessage: err.message,
      });
      throw err;
    }
  }

  // User AI usage analytics
  async getUserUsage(userId) {
    const totalRequests = await AIUsage.countDocuments({ userId });
    const successfulRequests = await AIUsage.countDocuments({ userId, status: 'SUCCESS' });
    const recentUsages = await AIUsage.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();

    const stats = await AIUsage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          avgLatency: { $avg: '$latencyMs' },
          totalPromptTokensEst: { $sum: '$promptLength' },
          totalResponseTokensEst: { $sum: '$responseLength' },
        },
      },
    ]);

    return {
      totalRequests,
      successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) + '%' : '100%',
      avgLatencyMs: stats[0] ? Math.round(stats[0].avgLatency) : 0,
      recentUsages,
    };
  }
}

module.exports = new AIService();
