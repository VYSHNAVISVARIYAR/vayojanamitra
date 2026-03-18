import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/ChatInput';
import axios from 'axios';

const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add welcome message when component mounts
  React.useEffect(() => {
    const welcomeMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `Hello ${user?.full_name || 'there'}! I'm Mitra, your AI assistant for government welfare schemes. I can help you:\n\n• Find schemes that match your profile\n• Check eligibility for specific schemes\n• Explain application processes\n• Answer questions about benefits\n\nHow can I help you today?`,
      timestamp: new Date(),
      scheme_cards: [],
      eligibility_result: null
    };
    setMessages([welcomeMessage]);
  }, [user]);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      scheme_cards: [],
      eligibility_result: null
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      console.log('Sending message to chatbot:', messageText);
      console.log('Token available:', !!token);
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(
        'http://localhost:8000/chatbot/message',
        { 
          message: messageText,
          session_id: 'default-session' // You might want to generate or manage session IDs
        },
        { headers }
      );

      console.log('Chatbot response:', response.data);

      // Handle different response formats from the backend
      let botResponse = 'Sorry, I could not process your request.';
      
      if (response.data) {
        // The backend returns: { response: string, scheme_cards: [], eligibility_result: {}, ... }
        if (response.data.response) {
          botResponse = response.data.response;
        } else if (response.data.message) {
          botResponse = response.data.message;
        } else if (response.data.answer) {
          botResponse = response.data.answer;
        } else if (response.data.text) {
          botResponse = response.data.text;
        } else if (typeof response.data === 'string') {
          botResponse = response.data;
        } else {
          // If it's an object with unknown structure, try to extract meaningful content
          const possibleContent = Object.values(response.data).find(val => 
            typeof val === 'string' && val.length > 10
          );
          if (possibleContent) {
            botResponse = possibleContent;
          } else {
            // As a last resort, provide a helpful message
            botResponse = 'I received your message, but I had trouble processing it. Please try again.';
            console.warn('Unexpected response format:', response.data);
          }
        }
      }

      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: botResponse,
        timestamp: new Date(),
        // Pass additional data from backend if available
        scheme_cards: response.data.scheme_cards || [],
        eligibility_result: response.data.eligibility_result || null
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        if (error.response.status === 401) {
          errorMessage = 'Please log in to use the chatbot.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'Network error. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        errorMessage = 'Failed to send message. Please try again.';
      }

      const errorBotMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        scheme_cards: [],
        eligibility_result: null
      };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Ask Mitra</h1>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Loading chat...</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  scheme_cards={message.scheme_cards}
                  eligibility_result={message.eligibility_result}
                />
              ))
            )}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Mitra is thinking...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
