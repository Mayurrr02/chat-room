import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import {
  X,
  Users,
  Shield,
  UserPlus,
  LogOut,
  Trash2,
  Calendar,
  Sparkles,
} from 'lucide-react';

const ConversationDetailsSidebar = ({ isOpen, onClose }) => {
  const { activeConversation, refreshConversations, selectConversation } = useChat();
  const { user } = useAuth();
  const { presenceMap } = useSocket();

  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !activeConversation) return null;

  const isGroup = activeConversation.type === 'GROUP';
  const isAI = activeConversation.type === 'AI';
  const members = activeConversation.members || [];
  const myRole = activeConversation.myRole || 'MEMBER';
  const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(myRole);

  const handleOpenAddMember = async () => {
    setShowAddMember(true);
    setLoadingFriends(true);
    try {
      const res = await api.getFriends();
      if (res.success && Array.isArray(res.friends)) {
        // Filter out existing members
        const currentMemberUserIds = members.map((m) => (m.userId?._id || m.userId).toString());
        const available = res.friends.filter(
          (f) => !currentMemberUserIds.includes(f._id.toString())
        );
        setFriends(available);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedFriendIds.length === 0) return;
    setSubmitting(true);
    try {
      await api.addGroupMembers(activeConversation._id, selectedFriendIds);
      const updated = await api.getConversation(activeConversation._id);
      if (updated.success) selectConversation(updated.conversation);
      setShowAddMember(false);
      setSelectedFriendIds([]);
    } catch (err) {
      alert(err.message || 'Failed to add members');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      await api.removeGroupMember(activeConversation._id, targetUserId);
      const updated = await api.getConversation(activeConversation._id);
      if (updated.success) selectConversation(updated.conversation);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.leaveGroup(activeConversation._id);
      await refreshConversations();
      selectConversation(null);
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="conv-details-drawer">
      {/* Header */}
      <div className="drawer-header">
        <h4>{isGroup ? 'Group Information' : isAI ? 'AI Assistant' : 'Contact Details'}</h4>
        <button className="icon-button" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="drawer-content">
        {/* Profile Card */}
        <div className="drawer-profile-card">
          <Avatar
            name={activeConversation.displayTitle}
            src={activeConversation.displayAvatar}
            size={72}
          />
          <h3 className="drawer-title">{activeConversation.displayTitle}</h3>
          <span className="drawer-subtitle">
            {isGroup
              ? `${members.length} participants`
              : isAI
              ? 'Gemini-Powered AI Copilot'
              : `@${activeConversation.peerUser?.username || 'user'}`}
          </span>
        </div>

        {/* Info Items */}
        <div className="drawer-section">
          <div className="drawer-info-row">
            <Calendar size={16} color="#64748b" />
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Created on {new Date(activeConversation.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Members Section for Groups */}
        {isGroup && (
          <div className="drawer-section">
            <div className="drawer-section-header">
              <span>MEMBERS ({members.length})</span>
              {isAdminOrOwner && (
                <button className="drawer-link-btn" onClick={handleOpenAddMember}>
                  <UserPlus size={14} /> Add
                </button>
              )}
            </div>

            <div className="drawer-member-list">
              {members.map((m) => {
                const memUser = m.userId;
                if (!memUser) return null;

                let userStatus = memUser.status || 'OFFLINE';
                if (presenceMap[memUser._id]) {
                  userStatus = presenceMap[memUser._id].status;
                }

                const isMe = memUser._id.toString() === user?._id?.toString();

                return (
                  <div key={m._id} className="drawer-member-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar
                        name={memUser.displayName || memUser.username}
                        src={memUser.avatarUrl}
                        size={32}
                        status={userStatus}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {memUser.displayName || memUser.username} {isMe && '(You)'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          @{memUser.username}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.role === 'OWNER' && <span className="badge-role owner">Owner</span>}
                      {m.role === 'ADMIN' && <span className="badge-role admin">Admin</span>}

                      {isAdminOrOwner && !isMe && m.role !== 'OWNER' && (
                        <button
                          className="btn-icon-xs-danger"
                          onClick={() => handleRemoveMember(memUser._id)}
                          title="Remove member"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Group Actions */}
        {isGroup && (
          <div className="drawer-section">
            <button className="drawer-danger-btn" onClick={handleLeaveGroup}>
              <LogOut size={16} /> Leave Group
            </button>
          </div>
        )}
      </div>

      {/* Add Members Sub-Modal */}
      {showAddMember && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add Members to Group</h3>
              <button className="icon-button" onClick={() => setShowAddMember(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingFriends ? (
                <p>Loading friends...</p>
              ) : friends.length === 0 ? (
                <p className="helper-text">All your friends are already in this group.</p>
              ) : (
                <div className="member-picker-list">
                  {friends.map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend._id);
                    return (
                      <div
                        key={friend._id}
                        className={`member-picker-item ${isSelected ? 'selected' : ''}`}
                        onClick={() =>
                          setSelectedFriendIds((prev) =>
                            prev.includes(friend._id)
                              ? prev.filter((id) => id !== friend._id)
                              : [...prev, friend._id]
                          )
                        }
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar name={friend.displayName || friend.username} src={friend.avatarUrl} size={30} status={friend.status} />
                          <span>{friend.displayName || friend.username}</span>
                        </div>
                        <input type="checkbox" checked={isSelected} readOnly />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowAddMember(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAddMembersSubmit}
                  disabled={submitting || selectedFriendIds.length === 0}
                >
                  {submitting ? 'Adding...' : 'Add Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationDetailsSidebar;
