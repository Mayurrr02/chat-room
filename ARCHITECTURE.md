# ARCHITECTURE: AI-Native Real-Time Communication Platform

**Status:** Target System Architecture  
**Architect:** Senior Full-Stack & AI Systems Architect  
**Version:** 2.0.0 (Production Target)

---

## 1. High-Level System Overview

The platform is designed as an enterprise-ready, AI-native real-time collaboration engine. It pairs low-latency human-to-human communication with an embedded Gemini-powered AI Copilot, contextual memory, and Retrieval-Augmented Generation (RAG) over uploaded workspace documents.

```
                                 ┌─────────────────────────────┐
                                 │   Modern React Frontend     │
                                 │  (Tailwind/CSS, Lucide,     │
                                 │   Markdown, Socket.io)      │
                                 └──────────────┬──────────────┘
                                                │
                          HTTP / REST API (JWT) │  WebSocket (WSS) + JWT Handshake
                                                │
                                 ┌──────────────▼──────────────┐
                                 │      API & Socket Gateway   │
                                 │   (Express.js + Socket.IO)  │
                                 └──────────────┬──────────────┘
                                                │
              ┌─────────────────────────────────┼─────────────────────────────────┐
              │                                 │                                 │
     ┌────────▼────────┐               ┌────────▼────────┐               ┌────────▼────────┐
     │  Core Services  │               │   AI & RAG Hub  │               │ Infra & Cache   │
     │  - Auth Service │               │  - Gemini 2.5   │               │  - Redis Cache  │
     │  - User Service │               │  - RAG Pipeline │               │  - Rate Limiter │
     │  - Chat Service │               │  - Memory Vector│               │  - Presence Pub │
     │  - Group/DM Hub │               │  - Doc Parser   │               │  - Logs/Metrics │
     └────────┬────────┘               └────────┬────────┘               └────────┬────────┘
              │                                 │                                 │
              └─────────────────────────────────┼─────────────────────────────────┘
                                                │
                                 ┌──────────────▼──────────────┐
                                 │        Data Storage         │
                                 │  - MongoDB (Users, Chats)   │
                                 │  - Vector Store (Embeddings)│
                                 │  - Redis (State & Presence) │
                                 └─────────────────────────────┘
```

---

## 2. Target Component Hierarchy & Folder Structure

```
Chat-room/
├── backend/
│   ├── src/
│   │   ├── config/             # DB, Redis, Gemini, JWT environment configurations
│   │   ├── constants/          # Event names, message types, error codes
│   │   ├── controllers/        # Express HTTP request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── friend.controller.js
│   │   │   ├── conversation.controller.js
│   │   │   ├── message.controller.js
│   │   │   ├── ai.controller.js
│   │   │   ├── document.controller.js
│   │   │   └── analytics.controller.js
│   │   ├── middlewares/        # Auth, rate-limiting, error handling, validation
│   │   │   ├── auth.middleware.js
│   │   │   ├── rateLimiter.middleware.js
│   │   │   ├── validate.middleware.js
│   │   │   └── errorHandler.middleware.js
│   │   ├── models/             # Mongoose schemas with indexes
│   │   │   ├── user.model.js
│   │   │   ├── conversation.model.js
│   │   │   ├── conversationMember.model.js
│   │   │   ├── message.model.js
│   │   │   ├── friendRequest.model.js
│   │   │   ├── document.model.js
│   │   │   ├── memory.model.js
│   │   │   └── aiUsage.model.js
│   │   ├── routes/             # REST route declarations
│   │   ├── services/           # Decoupled business logic
│   │   │   ├── auth.service.js
│   │   │   ├── user.service.js
│   │   │   ├── chat.service.js
│   │   │   ├── ai.service.js
│   │   │   ├── rag.service.js
│   │   │   ├── memory.service.js
│   │   │   ├── redis.service.js
│   │   │   └── document.service.js
│   │   ├── sockets/            # Socket.io handlers & middlewares
│   │   │   ├── socketAuth.middleware.js
│   │   │   ├── socketManager.js
│   │   │   ├── chat.handler.js
│   │   │   └── presence.handler.js
│   │   ├── utils/              # Token generators, crypto helpers, sanitizers
│   │   └── server.js           # Server bootstrap & initialization
│   ├── tests/                  # Integration & unit test suites
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/             # Icons, illustrations
│   │   ├── components/
│   │   │   ├── auth/           # Login, Register modals/forms
│   │   │   ├── layout/         # 3-Pane shell (LeftNav, CenterChat, RightInfo)
│   │   │   ├── sidebar/        # Search, Direct Messages, Groups, Friend Requests
│   │   │   ├── chat/           # MessageList, MessageItem, Composer, TypingIndicator
│   │   │   ├── ai/             # AI Copilot widget, Prompt suggestions, Summary modal
│   │   │   ├── rag/            # Document uploader, Knowledge Space manager, Citations
│   │   │   ├── common/         # MarkdownRenderer, Avatar, Badges, Modals
│   │   │   └── analytics/      # Usage dashboard metrics
│   │   ├── context/            # AuthContext, SocketContext, ChatContext, ThemeContext
│   │   ├── hooks/              # Custom hooks (useChat, useAIStream, usePresence)
│   │   ├── services/           # Axios/Fetch API client layer
│   │   ├── utils/              # Date formatters, token helpers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .github/workflows/ci.yml
├── ARCHITECTURE.md
├── PROJECT_AUDIT.md
├── PHASE_1.md
├── PHASE_2.md
├── PHASE_3.md
└── PHASE_4.md
```

---

## 3. Database Schema & Data Models

### 3.1 `User`
```typescript
{
  _id: ObjectId,
  username: { type: String, unique: true, index: true },
  email: { type: String, sparse: true, index: true },
  password: { type: String, select: false },
  displayName: String,
  avatarUrl: String,
  bio: String,
  status: { type: String, enum: ['ONLINE', 'AWAY', 'OFFLINE'], default: 'OFFLINE' },
  lastSeen: { type: Date, default: Date.now },
  aiPreferences: {
    systemPromptCustomization: String,
    autoSuggestReplies: Boolean,
    preferredModel: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 `Conversation`
```typescript
{
  _id: ObjectId,
  type: { type: String, enum: ['DM', 'GROUP', 'AI'], index: true },
  title: String,                  // For groups or named AI chats
  avatar: String,
  createdBy: { type: ObjectId, ref: 'User' },
  lastMessage: {
    text: String,
    sender: { type: ObjectId, ref: 'User' },
    timestamp: Date
  },
  workspaceId: { type: ObjectId, ref: 'Workspace', sparse: true },
  createdAt: Date,
  updatedAt: { type: Date, index: true }
}
```

### 3.3 `ConversationMember`
```typescript
{
  _id: ObjectId,
  conversationId: { type: ObjectId, ref: 'Conversation', index: true },
  userId: { type: ObjectId, ref: 'User', index: true },
  role: { type: String, enum: ['OWNER', 'ADMIN', 'MEMBER'], default: 'MEMBER' },
  lastReadAt: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now }
}
```
*Compound unique index: `{ conversationId: 1, userId: 1 }`*

### 3.4 `Message`
```typescript
{
  _id: ObjectId,
  conversationId: { type: ObjectId, ref: 'Conversation', index: true },
  sender: { type: ObjectId, ref: 'User', index: true },
  senderModel: { type: String, enum: ['User', 'AI'], default: 'User' },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['TEXT', 'SYSTEM', 'AI_RESPONSE', 'FILE', 'IMAGE'], default: 'TEXT' },
  replyTo: { type: ObjectId, ref: 'Message', sparse: true },
  reactions: [{
    emoji: String,
    users: [{ type: ObjectId, ref: 'User' }]
  }],
  status: { type: String, enum: ['SENT', 'DELIVERED', 'READ'], default: 'SENT' },
  sources: [{
    documentId: { type: ObjectId, ref: 'Document' },
    title: String,
    snippet: String,
    pageNumber: Number
  }],
  isEdited: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, index: true, default: Date.now },
  updatedAt: Date
}
```

### 3.5 `Document` & `DocumentChunk` (RAG)
```typescript
Document:
{
  _id: ObjectId,
  workspaceId: { type: ObjectId, ref: 'Workspace', index: true },
  uploadedBy: { type: ObjectId, ref: 'User', index: true },
  title: String,
  fileType: { type: String, enum: ['PDF', 'TXT', 'DOCX'] },
  fileSize: Number,
  totalChunks: Number,
  createdAt: Date
}

DocumentChunk:
{
  _id: ObjectId,
  documentId: { type: ObjectId, ref: 'Document', index: true },
  workspaceId: { type: ObjectId, ref: 'Workspace', index: true },
  content: String,
  chunkIndex: Number,
  embedding: [Number],           // 768 / 1536 float vector
  metadata: {
    pageNumber: Number,
    section: String
  }
}
```

### 3.6 `Memory` (AI Long-Term Conversation Memory)
```typescript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', index: true },
  conversationId: { type: ObjectId, ref: 'Conversation', index: true },
  fact: String,
  category: { type: String, enum: ['PREFERENCE', 'DECISION', 'ACTION_ITEM', 'FACT'] },
  embedding: [Number],
  createdAt: Date
}
```

---

## 4. Real-Time WebSocket Event Contract

| Event Name | Direction | Payload Structure | Description |
| :--- | :--- | :--- | :--- |
| `connection` | Client -> Server | Handshake with `auth: { token: "JWT..." }` | Authenticates and joins user socket to personal user room `user:<userId>`. |
| `conversation:join` | Client -> Server | `{ conversationId }` | Authorizes member and joins socket to room `conv:<convId>`. |
| `conversation:leave`| Client -> Server | `{ conversationId }` | Leaves room `conv:<convId>`. |
| `message:send` | Client -> Server | `{ conversationId, content, replyTo, messageType }` | Saves message, dispatches to room, triggers AI if mentioned. |
| `message:new` | Server -> Client | Full populated `Message` object | Broadcasted to room `conv:<convId>`. |
| `message:read` | Client -> Server | `{ conversationId, messageId }` | Updates read receipt in DB, broadcasts `message:receipt`. |
| `message:reaction`| Client -> Server | `{ messageId, emoji }` | Toggles reaction, broadcasts update. |
| `user:typing` | Client -> Server | `{ conversationId, isTyping: true/false }` | Broadcasted as typing indicator to other room members. |
| `ai:stream:start` | Server -> Client | `{ messageId, conversationId, placeholder }` | Emitted when AI begins generation. |
| `ai:stream:chunk` | Server -> Client | `{ messageId, deltaText }` | Real-time token streaming to frontend. |
| `ai:stream:done` | Server -> Client | `{ messageId, fullMessage, sources }` | Final message saved to DB and closed. |
| `presence:update` | Server -> Client | `{ userId, status: 'ONLINE'|'AWAY'|'OFFLINE', lastSeen }` | Broadcasted to active peers. |

---

## 5. Security & Authentication Architecture

1. **JWT Dual-Token Pattern**:
   - Short-lived Access Token (15m expiration, signed with `JWT_SECRET`).
   - Long-lived Refresh Token (7d expiration, stored securely or hashed in DB).
   - WebSocket Handshake Middleware decrypts and validates token prior to connection acceptance.
2. **Role-Based Conversation Authorization**:
   - All conversation and message access passes through `verifyConversationMembership(userId, conversationId)` middleware before any DB read/write.
3. **Prompt Injection & AI Sandboxing**:
   - Input sanitization layer stripping control tokens and delimiters.
   - Enforced system instructions isolating retrieval context (`<context>` tags) from user instructions.
4. **Rate Limiting Engine**:
   - Redis token-bucket / sliding-window limits applied across `/api/auth`, `/api/ai/*`, `/api/documents/upload`, and WebSocket messages.

---

## 6. Target Infrastructure & Deployment

- **Containerization**: Multi-stage `Dockerfile` for Node.js backend and Vite frontend static build with Nginx.
- **Orchestration**: `docker-compose.yml` defining `backend`, `frontend`, `mongo`, and `redis` services.
- **CI/CD**: GitHub Actions workflow validating linting, testing, and production container builds on every PR.
