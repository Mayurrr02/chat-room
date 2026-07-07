import React from 'react';
import useGetConversations from '../../hooks/useGetConversations';
import Conversation from './Conversation';

const ConversationList = () => {
  // Grab the logged-in username from local storage (or your auth state)
  // Ensure you set this during your login function: localStorage.setItem("chat-username", user.username);
  const loggedInUsername = localStorage.getItem("chat-username"); 
  
  const { loading, conversations } = useGetConversations(loggedInUsername);

  return (
    <div className='py-2 flex flex-col'>
      {conversations.map((user) => (
        <Conversation
          key={user._id}
          user={user}
        />
      ))}

      {loading ? <p className='text-center text-gray-500 mt-4'>Loading...</p> : null}
      {!loading && conversations.length === 0 && (
         <p className='text-center text-gray-500 text-sm mt-4'>No active conversations yet.</p>
      )}
    </div>
  );
};

export default ConversationList;