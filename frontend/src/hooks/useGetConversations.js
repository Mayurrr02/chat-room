import { useEffect, useState } from "react";

// 1. Add your backend URL logic here
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

const useGetConversations = (loggedInUsername) => {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!loggedInUsername) return;

    const getConversations = async () => {
      setLoading(true);
      try {
        // 2. Change the hardcoded URL to use BACKEND_URL
        const res = await fetch(`${BACKEND_URL}/api/conversations/${loggedInUsername}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations:", error.message);
      } finally {
        setLoading(false);
      }
    };

    getConversations();
  }, [loggedInUsername]); 

  return { loading, conversations };
};

export default useGetConversations;