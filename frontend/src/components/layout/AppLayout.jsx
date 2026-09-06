import React from 'react';
import Sidebar from '../sidebar/Sidebar';
import ChatWindow from '../chat/ChatWindow';

const AppLayout = () => {
  return (
    <div className="app-shell-container">
      <Sidebar />
      <main className="app-main-content">
        <ChatWindow />
      </main>
    </div>
  );
};

export default AppLayout;
