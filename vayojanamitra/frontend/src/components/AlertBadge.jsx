import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';

const AlertBadge = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
    
    // Update count every 5 minutes
    const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setCount(0);
        setLoading(false);
        return;
      }
      
      const response = await axios.get(
        'http://localhost:8000/alerts/unread',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setCount(response.data.length);
      
    } catch (error) {
      console.error('Error fetching unread alerts:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Bell className="h-5 w-5 text-gray-600 hover:text-gray-800 transition-colors" />
      
      {/* Badge - Only show when there are unread alerts */}
      {!loading && count > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-pulse">
          {count > 9 ? '9+' : count}
        </div>
      )}
    </div>
  );
};

export default AlertBadge;
