// import React, { useState, useEffect, useRef } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { useLocation, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import ChatBubble from '../components/ChatBubble';
// import ChatInput from '../components/ChatInput';

// const Chatbot = () => {
//   const { user } = useAuth();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [sessionId, setSessionId] = useState('');
//   const [messages, setMessages] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [suggestedPrompts, setSuggestedPrompts] = useState([]);
//   const messagesEndRef = useRef(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     initializeChat();
//   }, []);

//   useEffect(() => {
//     // Check for scheme context from navigation state
//     if (location.state?.scheme_title && sessionId) {
//       const initialMessage = location.state.initial_message || 
//         `Tell me about ${location.state.scheme_title} and check if I'm eligible`;
//       sendMessage(initialMessage);
//       // Clear the state to prevent re-sending
//       navigate(location.pathname, { replace: true, state: {} });
//     }
//   }, [location.state, sessionId]);

//   const initializeChat = async () => {
//     try {
//       // Create new session
//       const response = await axios.post('http://localhost:8000/chat/new-session');
//       setSessionId(response.data.session_id);
      
//       // Generate suggested prompts based on user profile
//       const prompts = generateSuggestedPrompts();
//       setSuggestedPrompts(prompts);
      
//       // Add welcome message
//       setMessages([{
//         role: 'assistant',
//         content: 'Hello! I\'m Mitra, your welfare scheme assistant. How can I help you find the right Kerala government schemes today?',
//         timestamp: new Date()
//       }]);
//     } catch (error) {
//       console.error('Error initializing chat:', error);
//     }
//   };

//   const generateSuggestedPrompts = () => {
//     const prompts = [
//       "What pension schemes am I eligible for?",
//       "Show me healthcare schemes in Kerala",
//       "What documents do I need for old age pension?",
//       "Am I eligible for any disability schemes?"
//     ];

//     // Add profile-specific prompts
//     if (user) {
//       if (user.age > 60) {
//         prompts.push("What old age pension am I eligible for?");
//       }
//       if (user.health_conditions?.includes('disability')) {
//         prompts.push("Show disability schemes");
//       }
//       if (user.occupation === 'Farmer') {
//         prompts.push("What agricultural welfare schemes exist?");
//       }
//       if (user.income_annual < 100000) {
//         prompts.push("Show schemes for low income families");
//       }
//     }

//     return prompts.slice(0, 6); // Show max 6 prompts
//   };

//   const sendMessage = async (message) => {
//     if (!message.trim() || !sessionId) return;

//     setIsLoading(true);
    
//     // Add user message
//     const userMessage = {
//       role: 'user',
//       content: message,
//       timestamp: new Date()
//     };
//     setMessages(prev => [...prev, userMessage]);

//     try {
//       const response = await axios.post(
//         'http://localhost:8000/chat/message',
//         {
//           session_id: sessionId,
//           message: message
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${localStorage.getItem('token')}`
//           }
//         }
//       );
//     }
//     catch(error){
//       console.error(error);
//     }

//       // Add assistant response
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center py-6">
//             <MessageCircle className="h-8 w-8 text-blue-600 mr-3" />
//             <h1 className="text-2xl font-bold text-gray-900">AI Assistant - Mitra</h1>
//           </div>
//         </div>
//       </header>

//       {/* Chat Interface */}
//       <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="bg-white rounded-lg shadow-lg h-[600px]">
//           <VoiceChatbot />
//         </div>
//       </main>
//     </div>
//   );
// };
// export default Chatbot;


import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import ChatBubble from "../components/ChatBubble";
import ChatInput from "../components/ChatInput";
import { MessageCircle } from "lucide-react";
import VoiceChatbot from "../components/VoiceChatbot";

const Chatbot = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (location.state?.scheme_title && sessionId) {
      const initialMessage =
        location.state.initial_message ||
        `Tell me about ${location.state.scheme_title} and check if I'm eligible`;

      sendMessage(initialMessage);

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, sessionId]);

  const initializeChat = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8000/chatbot/new-session"
      );

      setSessionId(response.data.session_id);

      const prompts = generateSuggestedPrompts();
      setSuggestedPrompts(prompts);

      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I'm Mitra, your welfare scheme assistant. How can I help you find the right Kerala government schemes today?",
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const generateSuggestedPrompts = () => {
    const prompts = [
      "What pension schemes am I eligible for?",
      "Show me healthcare schemes in Kerala",
      "What documents do I need for old age pension?",
      "Am I eligible for any disability schemes?"
    ];

    if (user) {
      if (user.age > 60) {
        prompts.push("What old age pension am I eligible for?");
      }

      if (user.health_conditions?.includes("disability")) {
        prompts.push("Show disability schemes");
      }

      if (user.occupation === "Farmer") {
        prompts.push("What agricultural welfare schemes exist?");
      }

      if (user.income_annual < 100000) {
        prompts.push("Show schemes for low income families");
      }
    }

    return prompts.slice(0, 6);
  };

  const sendMessage = async (message) => {
    if (!message.trim() || !sessionId) return;

    setIsLoading(true);

    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await axios.post(
        "http://localhost:8000/chatbot/message",
        {
          session_id: sessionId,
          message: message
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      const assistantMessage = {
        role: "assistant",
        content: response.data.reply,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <MessageCircle className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              AI Assistant - Mitra
            </h1>
          </div>
        </div>
      </header>

      {/* Chat Interface */}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">

          {/* Messages */}

          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <ChatBubble key={index} message={msg} />
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}

          {messages.length === 1 && (
            <div className="p-4 border-t">
              <p className="text-sm text-gray-500 mb-2">
                Suggested questions:
              </p>

              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(prompt)}
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}

          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>

        {/* Voice bot */}

        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <VoiceChatbot />
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
