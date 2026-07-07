import React from 'react';

const Conversation = ({ user }) => {
  // Using a free UI avatar service to generate a picture based on their username
  const avatarUrl = `https://ui-avatars.com/api/?name=${user.username}&background=0D8ABC&color=fff&rounded=true`;

  return (
    <>
      <div className='flex gap-3 items-center hover:bg-gray-100 rounded p-2 py-3 cursor-pointer transition'>
        <div className='w-10 h-10'>
          <img src={avatarUrl} alt='user avatar' className='w-full h-full object-cover' />
        </div>

        <div className='flex flex-col flex-1'>
          <p className='font-bold text-gray-800'>{user.username}</p>
        </div>
      </div>
      <div className='border-b border-gray-100 w-full' />
    </>
  );
};

export default Conversation;