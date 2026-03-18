import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, AlertTriangle, X, ChevronUp } from 'lucide-react';

const SOSButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const emergencyContacts = [
    { name: 'Elderline Helpline', number: '14567', icon: Phone, color: 'bg-red-500' },
    { name: 'Kerala Health Helpline', number: '104', icon: Phone, color: 'bg-green-500' },
    { name: 'Police', number: '100', icon: Phone, color: 'bg-blue-500' },
    { name: 'Ambulance', number: '108', icon: Phone, color: 'bg-orange-500' }
  ];

  const handleCall = (number) => {
    window.open(`tel:${number}`);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl p-4 min-w-[280px] border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Emergency Contacts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-2">
              {emergencyContacts.map((contact, index) => {
                const Icon = contact.icon;
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleCall(contact.number)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg ${contact.color} text-white hover:opacity-90 transition-all transform hover:scale-105 shadow-md`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${contact.color === 'bg-white' ? 'bg-gray-800' : 'bg-white/20'} rounded-full`}>
                        <Icon className={`w-4 h-4 ${contact.color === 'bg-white' ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-sm">{contact.name}</div>
                        <div className="text-xs opacity-90">{contact.number}</div>
                      </div>
                    </div>
                    <Phone className="w-4 h-4" />
                  </motion.button>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Important:</strong> These are emergency helpline numbers. Use only in genuine emergencies.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMenu}
        className={`relative w-16 h-16 rounded-full shadow-2xl transition-all transform ${
          isOpen 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-red-600 hover:bg-red-700 animate-pulse'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-red-600 opacity-75 animate-ping" />
        
        <div className="relative z-10 flex items-center justify-center">
          {isOpen ? (
            <X className="w-8 h-8 text-white" />
          ) : (
            <div className="flex flex-col items-center">
              <AlertTriangle className="w-6 h-6 text-white mb-1" />
              <span className="text-white font-bold text-xs">SOS</span>
            </div>
          )}
        </div>
        
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <ChevronUp className="w-2 h-2 text-red-600" />
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default SOSButton;
