import React from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import { Users, Bot, MessageCircle } from 'lucide-react';

const ConversationList = ({ filter = 'all' }) => {
  const { conversations, activeConversation, selectConversation, isLoadingConversations } = useChat();
  const { user } = useAuth();
  const { presenceMap } = useSocket();

  const filtered = conversations.filter((c) => {
    if (filter === 'dms') return c.type === 'DM' || c.type === 'AI';
    if (filter === 'groups') return c.type === 'GROUP';
    return true;
  });

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoadingConversations) {
    return (
      <div className="conversation-list-loading">
        <div className="skeleton-item" />
        <div className="skeleton-item" />
        <div className="skeleton-item" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="empty-conversation-state">
        <MessageCircle size={28} color="#94a3b8" />
        <p>No conversations found</p>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Search for users or create a new group to begin chatting!
        </span>
      </div>
    );
  }

  return (
    <div className="conversation-list-container">
      {filtered.map((conv) => {
        const isActive = activeConversation?._id === conv._id;

        // Dynamic presence for DMs
        let currentStatus = conv.peerUser?.status || 'OFFLINE';
        if (conv.peerUser && presenceMap[conv.peerUser._id]) {
          currentStatus = presenceMap[conv.peerUser._id].status;
        }

        const isGroup = conv.type === 'GROUP';
        const isAI = conv.type === 'AI';

        return (
          <div
            key={conv._id}
            className={`conversation-item ${isActive ? 'active' : ''} ${conv.unreadCount > 0 ? 'unread' : ''}`}
            onClick={() => selectConversation(conv)}
          >
            <div className="conv-avatar-wrapper">
              <Avatar
                name={conv.displayTitle}
                src={conv.displayAvatar}
                size={44}
                status={!isGroup && !isAI ? currentStatus : undefined}
              />
              {isGroup && (
                <div className="conv-type-badge group">
                  <Users size={10} />
                </div>
              )}
              {isAI && (
                <div className="conv-type-badge ai">
                  <Bot size={10} />
                </div>
              )}
            </div>

            <div className="conv-details">
              <div className="conv-header-row">
                <span className="conv-title">{conv.displayTitle}</span>
                <span className="conv-time">
                  {formatTimestamp(conv.lastMessage?.timestamp || conv.updatedAt)}
                </span>
              </div>

              <div className="conv-message-row">
                <span className="conv-last-text">
                  {conv.lastMessage?.text ? (
                    <>
                      {conv.lastMessage.senderUsername && conv.lastMessage.senderUsername !== user?.username && (
                        <strong>{conv.lastMessage.senderUsername}: </strong>
                      )}
                      {conv.lastMessage.text}
                    </>
                  ) : (
                    <em style={{ color: '#94a3b8' }}>No messages yet</em>
                  )}
                </span>

                {conv.unreadCount > 0 && (
                  <span className="conv-unread-pill">{conv.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;