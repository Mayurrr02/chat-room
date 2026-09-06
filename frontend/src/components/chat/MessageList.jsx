import React, { useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import MessageItem from './MessageItem';
import { ArrowUp, Loader2 } from 'lucide-react';

const MessageList = () => {
  const {
    messages,
    isLoadingMessages,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    typingUsers,
    activeConversation,
  } = useChat();

  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // Auto-scroll on initial load or new messages
  useEffect(() => {
    if (!isLoadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingMore]);

  // Preserve scroll position when loading older messages
  const handleLoadMore = async () => {
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
    }
    await loadMoreMessages();
    if (containerRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
    }
  };

  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = null;

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msgDate });
      }
      groups.push({ type: 'message', message: msg });
    });

    return groups;
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (isLoadingMessages) {
    return (
      <div className="message-list-loading-state">
        <Loader2 size={32} className="spin-icon" color="#6366f1" />
        <p>Loading messages...</p>
      </div>
    );
  }

  const groupedItems = groupMessagesByDate(messages);

  return (
    <div className="message-list-viewport" ref={containerRef}>
      {/* 1. Load Earlier Messages Button */}
      {hasMoreMessages && (
        <div className="load-more-wrapper">
          <button
            className="load-more-btn"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 size={14} className="spin-icon" /> Loading older messages...
              </>
            ) : (
              <>
                <ArrowUp size={14} /> Load earlier messages
              </>
            )}
          </button>
        </div>
      )}

      {/* 2. Messages List */}
      {messages.length === 0 ? (
        <div className="empty-messages-state">
          <h3>No messages yet</h3>
          <p>Be the first to say hello in this conversation!</p>
        </div>
      ) : (
        groupedItems.map((item, index) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${item.date}-${index}`} className="date-separator-pill">
                <span>{formatDateLabel(item.date)}</span>
              </div>
            );
          }

          const msg = item.message;
          const prevItem = index > 0 ? groupedItems[index - 1] : null;
          const prevMsg = prevItem && prevItem.type === 'message' ? prevItem.message : null;

          const isSameSender =
            prevMsg &&
            (prevMsg.sender?._id || prevMsg.sender) === (msg.sender?._id || msg.sender) &&
            new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 300000; // 5 min group

          return (
            <MessageItem
              key={msg._id || index}
              message={msg}
              isFirstInGroup={!isSameSender}
              showAvatar={!isSameSender}
            />
          );
        })
      )}

      {/* 3. Typing Indicators */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="typing-indicator-row">
          <div className="typing-bubble">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span className="typing-label">
            {typingUsers.map((u) => u.displayName || u.username).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
