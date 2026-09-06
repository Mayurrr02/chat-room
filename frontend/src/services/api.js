const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

class ApiService {
  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  getToken() {
    return localStorage.getItem('chat_token');
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(options.headers);

    const config = {
      ...options,
      headers,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(
          data.error?.message || data.error || `Request failed with status ${response.status}`
        );
        error.status = response.status;
        error.code = data.error?.code || 'API_ERROR';
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API] Error on ${options.method || 'GET'} ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth endpoints
  async register(data) {
    return this.request('/api/auth/register', { method: 'POST', body: data });
  }

  async login(data) {
    return this.request('/api/auth/login', { method: 'POST', body: data });
  }

  async legacyAuth(data) {
    return this.request('/api/auth', { method: 'POST', body: data });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  // User endpoints
  async updateProfile(data) {
    return this.request('/api/users/profile', { method: 'PUT', body: data });
  }

  async searchUsers(query) {
    return this.request(`/api/users/search?query=${encodeURIComponent(query)}`);
  }

  async getUser(id) {
    return this.request(`/api/users/${id}`);
  }

  // Friend endpoints
  async getFriends() {
    return this.request('/api/friends');
  }

  async getPendingFriendRequests() {
    return this.request('/api/friends/pending');
  }

  async sendFriendRequest(recipientId) {
    return this.request('/api/friends/request', { method: 'POST', body: { recipientId } });
  }

  async acceptFriendRequest(requestId) {
    return this.request(`/api/friends/request/${requestId}/accept`, { method: 'PUT' });
  }

  async rejectFriendRequest(requestId) {
    return this.request(`/api/friends/request/${requestId}/reject`, { method: 'PUT' });
  }

  async removeFriend(friendId) {
    return this.request(`/api/friends/${friendId}`, { method: 'DELETE' });
  }

  // Conversation endpoints
  async getConversations() {
    return this.request('/api/conversations');
  }

  async getOrCreateDM(targetUserId) {
    return this.request('/api/conversations/dm', { method: 'POST', body: { targetUserId } });
  }

  async createGroup(data) {
    return this.request('/api/conversations/group', { method: 'POST', body: data });
  }

  async getConversation(id) {
    return this.request(`/api/conversations/${id}`);
  }

  async updateGroupInfo(id, data) {
    return this.request(`/api/conversations/${id}/group-info`, { method: 'PUT', body: data });
  }

  async addGroupMembers(id, memberIds) {
    return this.request(`/api/conversations/${id}/members`, { method: 'POST', body: { memberIds } });
  }

  async removeGroupMember(id, userId) {
    return this.request(`/api/conversations/${id}/members/${userId}`, { method: 'DELETE' });
  }

  async leaveGroup(id) {
    return this.request(`/api/conversations/${id}/leave`, { method: 'POST' });
  }

  // Message endpoints
  async getMessages(conversationId, { cursor, limit = 40 } = {}) {
    let query = `?limit=${limit}`;
    if (cursor) query += `&cursor=${encodeURIComponent(cursor)}`;
    return this.request(`/api/messages/conversation/${conversationId}${query}`);
  }

  async sendMessage(data) {
    return this.request('/api/messages', { method: 'POST', body: data });
  }

  async editMessage(id, content) {
    return this.request(`/api/messages/${id}`, { method: 'PUT', body: { content } });
  }

  async deleteMessage(id) {
    return this.request(`/api/messages/${id}`, { method: 'DELETE' });
  }

  async toggleReaction(id, emoji) {
    return this.request(`/api/messages/${id}/reaction`, { method: 'POST', body: { emoji } });
  }

  async markAsRead(conversationId) {
    return this.request(`/api/messages/conversation/${conversationId}/read`, { method: 'POST' });
  }
}

export const api = new ApiService();
export default api;
