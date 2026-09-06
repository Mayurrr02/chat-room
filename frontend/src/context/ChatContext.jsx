import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { [convId]: [ { userId, username, displayName } ] }
  const [replyingTo, setReplyingTo] = useState(null);

  const activeConvRef = useRef(activeConversation);
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoadingConversations(true);
    try {
      const data = await api.getConversations();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('[ChatContext] Failed to load conversations:', err.message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Select active conversation & fetch first page of messages
  const selectConversation = useCallback(
    async (conv) => {
      if (!conv) {
        setActiveConversation(null);
        setMessages([]);
        setReplyingTo(null);
        return;
      }

      // If leaving previous conversation room
      if (activeConvRef.current && socket) {
        socket.emit('conversation:leave', { conversationId: activeConvRef.current._id });
      }

      setActiveConversation(conv);
      setReplyingTo(null);
      setMessages([]);
      setIsLoadingMessages(true);

      // Join new room
      if (socket) {
        socket.emit('conversation:join', { conversationId: conv._id });
        socket.emit('message:read', { conversationId: conv._id });
      }

      // Reset unread count locally for this conversation
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
      );

      try {
        const data = await api.getMessages(conv._id, { limit: 40 });
        if (data.success) {
          setMessages(data.messages);
          setHasMoreMessages(data.hasMore);
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        console.error('[ChatContext] Failed to fetch messages:', err.message);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [socket]
  );

  // 3. Load older messages (Pagination / Infinite Scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !hasMoreMessages || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const data = await api.getMessages(activeConversation._id, {
        cursor: nextCursor,
        limit: 40,
      });

      if (data.success) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMoreMessages(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch (err) {
      console.error('[ChatContext] Error loading more messages:', err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeConversation, hasMoreMessages, nextCursor, isLoadingMore]);

  // 4. Send message
  const sendMessage = useCallback(
    async (content, messageType = 'TEXT') => {
      if (!activeConversation || !content.trim()) return;

      const payload = {
        conversationId: activeConversation._id,
        content: content.trim(),
        messageType,
        replyTo: replyingTo
          ? {
              messageId: replyingTo._id,
              senderUsername: replyingTo.senderUsername || replyingTo.sender?.username,
              content: replyingTo.content.substring(0, 100),
            }
          : undefined,
      };

      setReplyingTo(null);

      // Optimistically emit via Socket.io
      if (socket && isConnected) {
        socket.emit('message:send', payload, (res) => {
          if (!res?.success) {
            console.error('[ChatContext] Socket send failed, falling back to REST');
            api.sendMessage(payload);
          }
        });
      } else {
        const data = await api.sendMessage(payload);
        if (data.success && data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    },
    [activeConversation, replyingTo, socket, isConnected]
  );

  // 5. Typing State
  const sendTyping = useCallback(
    (isTyping) => {
      if (!socket || !activeConversation) return;
      const eventName = isTyping ? 'user:typing:start' : 'user:typing:stop';
      socket.emit(eventName, { conversationId: activeConversation._id });
    },
    [socket, activeConversation]
  );

  // 6. Reactions
  const toggleReaction = useCallback(
    async (messageId, emoji) => {
      if (!activeConversation) return;
      if (socket && isConnected) {
        socket.emit('message:reaction', { messageId, emoji });
      } else {
        await api.toggleReaction(messageId, emoji);
      }
    },
    [socket, isConnected, activeConversation]
  );

  // 7. Edit & Delete Message
  const editMessage = useCallback(
    async (messageId, content) => {
      if (socket && isConnected) {
        socket.emit('message:edit', { messageId, content });
      } else {
        const res = await api.editMessage(messageId, content);
        if (res.success && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? res.message : m))
          );
        }
      }
    },
    [socket, isConnected]
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      if (socket && isConnected) {
        socket.emit('message:delete', { messageId });
      } else {
        const res = await api.deleteMessage(messageId);
        if (res.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? { ...m, deletedAt: new Date(), content: 'This message was deleted' }
                : m
            )
          );
        }
      }
    },
    [socket, isConnected]
  );

  // 8. Start DM with another user
  const startDMWithUser = useCallback(
    async (targetUserId) => {
      try {
        const res = await api.getOrCreateDM(targetUserId);
        if (res.success && res.conversation) {
          await fetchConversations();
          selectConversation(res.conversation);
          return res.conversation;
        }
      } catch (err) {
        console.error('[ChatContext] Failed to start DM:', err.message);
        throw err;
      }
    },
    [fetchConversations, selectConversation]
  );

  // 9. Create Group
  const createGroup = useCallback(
    async ({ title, memberIds, avatar }) => {
      try {
        const res = await api.createGroup({ title, memberIds, avatar });
        if (res.success && res.conversation) {
          await fetchConversations();
          selectConversation(res.conversation);
          return res.conversation;
        }
      } catch (err) {
        console.error('[ChatContext] Failed to create group:', err.message);
        throw err;
      }
    },
    [fetchConversations, selectConversation]
  );

  // ==========================================
  // Socket.io Real-Time Event Handlers
  // ==========================================
  useEffect(() => {
    if (!socket) return;

    // Incoming new message
    const handleNewMessage = (newMessage) => {
      const active = activeConvRef.current;
      if (active && active._id === newMessage.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        // Mark as read immediately if chat is open
        socket.emit('message:read', { conversationId: active._id });
      }

      // Update conversations sidebar lastMessage and unread count
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === newMessage.conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }
        return prev.map((c) => {
          if (c._id === newMessage.conversationId) {
            const isCurrentChat = active && active._id === c._id;
            return {
              ...c,
              lastMessage: {
                text: newMessage.content,
                sender: newMessage.sender,
                senderUsername: newMessage.senderUsername,
                timestamp: newMessage.createdAt,
              },
              unreadCount: isCurrentChat ? 0 : (c.unreadCount || 0) + 1,
              updatedAt: newMessage.createdAt,
            };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
    };

    // Typing event
    const handleTyping = ({ conversationId, userId, username, displayName, isTyping }) => {
      setTypingUsers((prev) => {
        const currentList = prev[conversationId] || [];
        if (isTyping) {
          if (currentList.some((u) => u.userId === userId)) return prev;
          return {
            ...prev,
            [conversationId]: [...currentList, { userId, username, displayName }],
          };
        } else {
          return {
            ...prev,
            [conversationId]: currentList.filter((u) => u.userId !== userId),
          };
        }
      });
    };

    // Read receipt
    const handleReadAck = ({ conversationId, userId, readAt }) => {
      const active = activeConvRef.current;
      if (active && active._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender === user?._id || msg.sender?._id === user?._id
              ? { ...msg, status: 'READ' }
              : msg
          )
        );
      }
    };

    // Reactions updated
    const handleReactionUpdated = ({ messageId, reactions, conversationId }) => {
      const active = activeConvRef.current;
      if (active && active._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
        );
      }
    };

    // Message edited
    const handleMessageEdited = (editedMessage) => {
      const active = activeConvRef.current;
      if (active && active._id === editedMessage.conversationId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === editedMessage._id ? editedMessage : msg))
        );
      }
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId, conversationId }) => {
      const active = activeConvRef.current;
      if (active && active._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, deletedAt: new Date(), content: 'This message was deleted' }
              : msg
          )
        );
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleTyping);
    socket.on('message:read:ack', handleReadAck);
    socket.on('message:reaction:updated', handleReactionUpdated);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('conversation:updated', () => fetchConversations());

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleTyping);
      socket.off('message:read:ack', handleReadAck);
      socket.off('message:reaction:updated', handleReactionUpdated);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('conversation:updated');
    };
  }, [socket, user, fetchConversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isLoadingMore,
        hasMoreMessages,
        typingUsers: activeConversation ? typingUsers[activeConversation._id] || [] : [],
        replyingTo,
        setReplyingTo,
        selectConversation,
        loadMoreMessages,
        sendMessage,
        sendTyping,
        toggleReaction,
        editMessage,
        deleteMessage,
        startDMWithUser,
        createGroup,
        refreshConversations: fetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
