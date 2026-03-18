import React from 'react';
import SchemeCard from './SchemeCard';
import EligibilityCard from './EligibilityCard';

const ChatBubble = ({ role, content, scheme_cards, eligibility_result, timestamp }) => {
  const isUser = role === 'user';
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} space-x-2`}>
          {!isUser && (
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">M</span>
            </div>
          )}
          
          <div className={`px-4 py-3 rounded-2xl ${
            isUser 
              ? 'bg-indigo-600 text-white ml-auto' 
              : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-line">{content}</p>
            
            {/* Scheme Cards */}
            {scheme_cards && scheme_cards.length > 0 && (
              <div className="mt-3 space-y-2">
                {scheme_cards.map((scheme, index) => (
                  <SchemeCard key={index} scheme={scheme} compact={true} />
                ))}
              </div>
            )}
            
            {/* Eligibility Result */}
            {eligibility_result && (
              <div className="mt-3">
                <EligibilityCard result={eligibility_result} />
              </div>
            )}
          </div>
          
          {isUser && (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 font-semibold text-sm">U</span>
            </div>
          )}
        </div>
        
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mt-1 px-2`}>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
