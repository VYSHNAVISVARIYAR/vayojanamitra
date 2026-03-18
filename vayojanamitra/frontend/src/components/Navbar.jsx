import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Home, 
  Search, 
  MessageCircle, 
  User, 
  ChevronDown, 
  Settings, 
  Sparkles 
} from 'lucide-react';
import AlertBadge from './AlertBadge';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { translate } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isAdmin = user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase().includes('test');

  const navItems = [
    { path: '/home', label: translate('Home'), icon: Home },
    { path: '/schemes', label: translate('Explore Schemes'), icon: Search },
    { path: '/chat', label: translate('Mitra'), icon: MessageCircle },
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center"
            >
              <Link to="/home" className="flex items-center group">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-3xl mr-3"
                >
                  🌿
                </motion.div>
                <div>
                  <motion.div 
                    className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent"
                    whileHover={{ scale: 1.05 }}
                  >
                    VayoJanaMitra
                  </motion.div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Welfare for All
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Navigation Links - Moved to Right Side */}
            <div className="flex-1"></div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        isActive 
                          ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-teal-50 hover:shadow-md'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm lg:text-base">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-all duration-300 hover:shadow-md transform hover:scale-105 border border-gray-200"
                >
                  <div className="w-9 h-9 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-gray-800">
                      {user?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">Account</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
                </button>

                <AnimatePresence>
                {userMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {/* Alerts moved here */}
                    <Link
                      to="/alerts"
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-emerald-50 transition-all duration-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <AlertBadge />
                      <span>My Alerts</span>
                    </Link>
                    
                    <hr className="my-2 border-gray-200" />
                    
                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-emerald-50 transition-all duration-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-5 w-5 text-gray-600" />
                      <span>My Profile</span>
                    </Link>
                    
                    {isAdmin && (
                      <>
                        <Link
                          to="/admin"
                          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 transition-all duration-200"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-5 w-5 text-gray-600" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </>
                    )}
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-200"
                    >
                      <X className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <nav className="md:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/home" className="flex items-center">
              <span className="text-xl mr-2">🌿</span>
              <div>
                <div className="text-lg font-bold text-gray-900">VayoJanaMitra</div>
                <div className="text-xs text-gray-500">Welfare for All</div>
              </div>
            </Link>

            {/* Right Side */}
            <div className="flex items-center space-x-3">

              {/* Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl hover:bg-teal-50 transition-colors border border-gray-200"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-teal-100 text-teal-700'
                        : 'text-gray-700 hover:bg-teal-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Profile in mobile menu */}
              <Link
                to="/profile"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/profile')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-5 w-5" />
                <span className="font-medium">{translate('Profile')}</span>
              </Link>
              
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/admin')
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Admin</span>
                </Link>
              )}
              
              <hr className="my-2" />
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 w-full"
              >
                <X className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>


      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 z-40 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 ${
                  isActive(item.path)
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Profile and Alerts in mobile bottom nav */}
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 ${
              isActive('/profile')
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <User className="h-5 w-5" />
            </motion.div>
            <span className="text-xs mt-1 font-medium">{translate('Profile')}</span>
          </Link>
          <Link
            to="/alerts"
            className={`flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 ${
              isActive('/alerts')
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <AlertBadge />
            </motion.div>
            <span className="text-xs mt-1 font-medium">{translate('Alerts')}</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Bottom Padding */}
      <div className="md:hidden h-16"></div>
    </>
  );
};

export default Navbar;
