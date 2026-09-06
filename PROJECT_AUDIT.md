# PROJECT AUDIT: Real-Time Chat & AI Platform

**Audit Date:** September 2026  
**Auditor:** Senior Full-Stack & AI Systems Architect  
**Repository:** `Mayurrr02/chat-room`  
**Current Live URL:** `https://chat-room-frontend-gaqv.onrender.com/`

---

## 1. Executive Summary

The existing application is a functional prototype of a real-time 1-on-1 chat with a basic Gemini-powered chatbot ("yourgpt"). While it successfully demonstrates basic socket messaging and AI integration, it operates as a minimum viable demo rather than a production-grade SaaS communication system. 

Key issues include lack of token-based authentication (JWT), no conversation/room abstractions, flat message data modeling with no support for group conversations, unbounded database queries, unauthenticated WebSocket events, blocking non-streaming AI responses with zero conversational memory, and no automated testing or containerization.

This audit details the current state, identifies technical debt and security vulnerabilities, and outlines the architectural foundation required to transform the system into an enterprise-ready, AI-native collaboration platform.

---

## 2. Technology Stack Breakdown

| Layer | Current Technology | Current Version | Status / Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React (SPA) | `18.3.1` | Functional; uses Vite 7.0 bundler |
| **Frontend Styling** | Custom CSS (`App.css`) + Inline styles | N/A | Basic UI, lack of responsive design system |
| **Frontend Real-Time** | `socket.io-client` | `4.7.5` | Handles message receipt & typing state |
| **Backend Framework** | Node.js / Express.js | `4.19.2` | Monolithic `server.js` |
| **Backend Real-Time** | `socket.io` | `4.7.5` | In-memory socket mapping (`Map`) |
| **Database** | MongoDB Atlas via Mongoose | `8.3.1` | No indexes, flat unstructured schemas |
| **AI / LLM** | `@google/generative-ai` | `0.24.1` | Using Google Generative AI SDK |
| **Authentication** | Direct `bcryptjs` password verification | `3.0.3` | **No JWTs**, no sessions, no token auth |
| **Hosting & Deployment**| Render Web Service / Static Site | N/A | No Docker, no CI/CD pipeline |
| **Testing** | None | N/A | Zero unit, integration, or E2E tests |

---

## 3. Detailed Architecture Audit

### 3.1 Backend & API Architecture

1. **Monolithic `server.js`**:
   The entire active backend logic (database connection, schema declarations, auth endpoint, conversation search, message retrieval, and socket handlers) is packed into a single 224-line `server.js`.
2. **Orphaned Module Structure**:
   `backend/controllers/conversation.controller.js`, `backend/models/conversation.model.js`, and `backend/routes/conversation.routes.js` exist in the repository but use ES module syntax (`import/export`) while `backend/package.json` is configured as CommonJS. They are not imported in `server.js` and contain broken dependencies (`protectRoute.js` missing).
3. **Existing REST Endpoints**:
   - `POST /api/auth`: Takes `{ username, password }`. Auto-registers if user doesn't exist, otherwise validates password. Returns `{ username, isNew }`. No tokens issued.
   - `GET /api/conversations/:username`: Finds all messages where `sender === username || receiver === username`, iterates over all messages in JavaScript to extract unique contact usernames, and queries `User` collection. This is an $O(N)$ unindexed table scan that will fail at scale.
   - `GET /api/users/search?query=...`: Performs case-insensitive regex search `{ username: { $regex: query, $options: 'i' } }` with limit 10.
   - `GET /api/messages?from=...&to=...`: Fetches all messages between two users ordered by timestamp ascending without pagination, cursors, or authentication.

### 3.2 WebSocket Architecture

- **Handshake & Auth**: WebSocket connections accept all origins (`origin: "*"`) with zero authentication tokens.
- **Connection Registration**: Sockets emit `register-user` with a plaintext `username`. The server stores this in an in-memory `Map<username, socketId>`.
- **Event Flow**:
  - `send-message` -> Saves message to MongoDB -> Checks `onlineUsers` map for `receiver` -> Emits `receive-message` to recipient socket.
  - If `receiver === 'yourgpt'`: Emits `display-typing`, generates non-streaming AI response via `aiModel.generateContent(text)`, saves response to MongoDB, emits `hide-typing`, and emits `receive-message` back to sender.
- **Client/Server Event Discrepancies**:
  - Client emits `mark-seen`, but the server has **no handler** for `mark-seen`, rendering read receipts partially broken over WebSockets.

### 3.3 Database & Data Models

#### Current Models (in `server.js`):
1. **User**:
   ```javascript
   {
     username: { type: String, unique: true, required: true },
     password: { type: String, required: true }
   }
   ```
2. **Message**:
   ```javascript
   {
     sender: String,
     receiver: String,
     text: String,
     timestamp: { type: Date, default: Date.now }
   }
   ```

#### Model Limitations:
- No user profile fields (email, display name, avatar, bio, status, last seen, timestamps).
- Messages do not belong to a `Conversation` or `Room` entity; 1-to-1 relationships are inferred entirely by querying `sender` and `receiver` strings.
- Group chat is impossible with the current flat sender/receiver model.
- No support for message editing, soft deletion (`deleted_at`), message types (text, image, system, file, code), replies (`reply_to`), or reactions.
- No indexes on `sender`, `receiver`, or `timestamp`.

### 3.4 AI Integration (Gemini)

- **SDK**: `@google/generative-ai` initializing `GoogleGenerativeAI(process.env.GEMINI_API_KEY)`.
- **System Persona**: Configured with custom system instructions branding the AI as "yourgpt" created by Mayur Jadhav with markdown formatting guidelines.
- **Prompt Execution**: Direct single-turn completion `aiModel.generateContent(text)`.
- **Deficiencies**:
  - **Zero Conversation Context / Memory**: Previous conversation history is not supplied to Gemini. The bot has no awareness of prior messages.
  - **No Streaming**: AI generation blocks until the full response is ready, resulting in high perceived latency (2–5 seconds).
  - **No Group Chat Participation**: AI cannot be mentioned (`@ai`) in human group conversations.
  - **No RAG / Document Grounding**: Cannot process or reference uploaded documents or workspace knowledge bases.
  - **No Rate Limiting / Usage Quota**: Vulnerable to API quota exhaustion and abuse.
  - **Frontend Rendering Gap**: Although system prompts request Markdown output, the frontend renders messages as raw text strings without markdown parsing.

---

## 4. Security & Vulnerability Analysis

| Vulnerability | Severity | Description | Fix |
| :--- | :--- | :--- | :--- |
| **No Authentication Tokens (IDOR)** | **Critical** | Endpoints rely on query parameters (`/api/messages?from=Alice&to=Bob`). Any unauthenticated client can read any user's private chat history. | Implement JWT access + refresh tokens in `httpOnly` secure cookies / Authorization headers with user verification middleware. |
| **Unauthenticated WebSockets** | **Critical** | Any socket client can emit `register-user` claiming to be any user, hijacking their incoming real-time messages. | Verify JWT during the `socket.io` connection handshake. |
| **No Rate Limiting** | **High** | Endpoints (`/api/auth`, `/api/messages`, Gemini generation) have no rate limits, opening the service to brute-force attacks and Gemini API quota drainage. | Add Redis-backed sliding-window rate limiters across auth, standard API, AI generation, and uploads. |
| **Regex Denial of Service (ReDoS)** | **Medium** | User search `/api/users/search?query=...` directly passes raw user input to regex without escaping special regex characters. | Sanitize query inputs and escape regex characters, or use MongoDB text indexes. |
| **Unrestricted CORS** | **Medium** | CORS is configured to `origin: "*"` across REST and Socket.io. | Restrict CORS to configured trusted frontend origins with credential support. |
| **Missing Input Validation** | **High** | No request payload validation schema (e.g., Zod / Joi). Malformed JSON or oversized strings can cause runtime crashes. | Implement strict schema validation on all incoming controller endpoints and socket events. |

---

## 5. Strengths & Reusable Assets

1. **Clear Foundation**: Clean Vite + React setup with instant HMR and clean base dependency footprint.
2. **Functional Core Flow**: End-to-end message flow (User -> Client -> Socket -> DB -> Socket -> Recipient) is already established and proven.
3. **Working MongoDB Atlas & Gemini Credentials**: Verified operational cloud database connection and functional Gemini 2.5 API access.
4. **Intuitive Component Decomposition**: Separation of Sidebar, Search, Conversation items, and Chat Window already started.

---

## 6. Migration Strategy & Incremental Refactoring Roadmap

To ensure zero regressions and maintain working code at each milestone, the migration will proceed in structured phases:

1. **Phase 1: Production-Grade Real-Time Chat**
   - Refactor backend into a clean modular MVC architecture (routes, controllers, models, services, middlewares).
   - Implement secure JWT-based authentication (register, login, me, logout, password hashing).
   - Migrate data models to first-class `User`, `Conversation`, `ConversationMember`, and `Message` schemas with indexes and backward compatibility.
   - Upgrade WebSocket engine with JWT handshake authentication, room-based broadcasting, typing states, and read receipts.
   - Implement group conversations, user presence (online/offline/last seen), and full message pagination.
   - Modernize frontend UI with responsive 3-pane layout, rich message cards, active status badges, group creation modals, and markdown rendering.

2. **Phase 2: AI Copilot Architecture**
   - Create a dedicated `AIService` managing model interactions, prompt templates, and streaming pipelines.
   - Support streaming responses over WebSockets for low-latency perceived generation.
   - Enable `@ai` mentions inside both 1-on-1 and Group chats.
   - Implement AI commands (`@ai summarize`, `@ai explain`, `@ai brainstorm`, `@ai reply`).
   - Introduce token-aware conversational context windows and AI usage metrics tracking.

3. **Phase 3: RAG, Long-Term Memory & Document Intelligence**
   - Add document upload and parsing pipeline (PDF, DOCX, TXT) with chunking and vector embedding generation.
   - Store vector embeddings using MongoDB Atlas Vector Search / pgvector.
   - Implement long-term semantic memory extraction and conversation retrieval.
   - Implement RAG query pipeline with strict citation / source attribution and authorization boundary enforcement.
   - Add prompt injection defense and safety validation layers.

4. **Phase 4: Production Engineering, Observability, Tests & Deployment**
   - Integrate Redis for caching, rate limiting, and presence tracking.
   - Implement comprehensive health checks (`/health`, `/health/ready`), structured logging, and request correlation IDs.
   - Build automated test suite (Unit, Integration, Socket, and Component tests).
   - Containerize full stack with `Dockerfile` and `docker-compose.yml`.
   - Setup GitHub Actions CI/CD workflows, developer analytics dashboard, and polished SaaS landing page.
