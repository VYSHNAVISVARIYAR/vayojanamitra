import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TranslationProvider } from './contexts/TranslationContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Profile from './pages/Profile';
import Chatbot from './pages/Chatbot';
import Alerts from './pages/Alerts';
import Home from './pages/Home';
import SchemeExplorer from './pages/SchemeExplorer';
import SchemeDetail from './pages/SchemeDetail';

// AuthRedirect component to handle root route
const AuthRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
};

function App() {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <TranslationProvider>
          <ToastProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <div className="app-container min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <ErrorBoundary>
                  <AnimatePresence mode="wait">
                    <Routes>
                {/* Public Routes */}
                <Route path="/login" element={
                  <motion.div
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <Login />
                  </motion.div>
                } />
                
                <Route path="/register" element={
                  <motion.div
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <Register />
                  </motion.div>
                } />

                {/* Semi-Protected Routes - accessible during registration */}
                <Route path="/profile/setup" element={
                  <motion.div
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <ProfileSetup />
                  </motion.div>
                } />
                
                {/* Protected Routes */}
                <Route path="/home" element={
                  <ProtectedRoute>
                    <motion.div
                      initial="initial"
                      animate="in"
                      exit="out"
                      variants={pageVariants}
                      transition={pageTransition}
                    >
                      <Navbar />
                      <Home />
                    </motion.div>
                  </ProtectedRoute>
                } />
                
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <motion.div
                      initial="initial"
                      animate="in"
                      exit="out"
                      variants={pageVariants}
                      transition={pageTransition}
                    >
                      <Navbar />
                      <Chatbot />
                    </motion.div>
                  </ProtectedRoute>
                } />
                
                <Route path="/schemes" element={
                  <ProtectedRoute>
                    <motion.div
                      initial="initial"
                      animate="in"
                      exit="out"
                      variants={pageVariants}
                      transition={pageTransition}
                    >
                      <Navbar />
                      <SchemeExplorer />
                    </motion.div>
                  </ProtectedRoute>
                } />
                
                <Route path="/schemes/:id" element={
                  <ProtectedRoute>
                    <motion.div
                      initial="initial"
                      animate="in"
                      exit="out"
                      variants={pageVariants}
                      transition={pageTransition}
                    >
                      <Navbar />
                      <SchemeDetail />
                    </motion.div>
                  </ProtectedRoute>
                } />
                
                <Route path="/alerts" element={
                  <ProtectedRoute>
                    <motion.div
                      initial="initial"
                      animate="in"
                      exit="out"
                      variants={pageVariants}
                      transition={pageTransition}
                    >
                      <Navbar />
                      <Alerts />
                    </motion.div>
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <motion.div
                      initial="initial"
                      animate="in"
                      exit="out"
                      variants={pageVariants}
                      transition={pageTransition}
                    >
                      <Navbar />
                      <Profile />
                    </motion.div>
                  </ProtectedRoute>
                } />
                
                {/* Redirect root based on auth status */}
                <Route path="/" element={<AuthRedirect />} />
              </Routes>
                  </AnimatePresence>
                </ErrorBoundary>
              </div>
            </Router>
          </ToastProvider>
        </TranslationProvider>
      </AuthProvider>
    </ErrorBoundary>
);
}

export default App;
