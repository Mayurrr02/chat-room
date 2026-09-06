import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';
import { X, Users, Check } from 'lucide-react';

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { createGroup } = useChat();
  const [title, setTitle] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setSelectedUserIds([]);
    setErrorMsg('');

    const loadFriends = async () => {
      setLoadingFriends(true);
      try {
        const res = await api.getFriends();
        if (res.success && Array.isArray(res.friends)) {
          setFriends(res.friends);
        }
      } catch (err) {
        console.error('Failed to load friends:', err);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a group title');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await createGroup({
        title: title.trim(),
        memberIds: selectedUserIds,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#4F46E5" />
            <h3>Create New Group</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              placeholder="e.g. AI Engineering Team"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Select Members ({selectedUserIds.length} selected)</label>
            <div className="member-picker-list">
              {loadingFriends ? (
                <p className="helper-text">Loading friends list...</p>
              ) : friends.length === 0 ? (
                <p className="helper-text">No friends added yet. You can create the group now and invite people later!</p>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedUserIds.includes(friend._id);
                  return (
                    <div
                      key={friend._id}
                      className={`member-picker-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleUserSelection(friend._id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={friend.displayName || friend.username} src={friend.avatarUrl} size={32} status={friend.status} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                            {friend.displayName || friend.username}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>@{friend.username}</div>
                        </div>
                      </div>

                      <div className={`checkbox-pill ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} color="#fff" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
