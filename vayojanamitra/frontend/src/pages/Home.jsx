import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Bookmark, Bell, Users, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import SchemeCard from '../components/SchemeCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import AlertBadge from '../components/AlertBadge';
import axios from 'axios';

const Home = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [stats, setStats] = useState({
    totalSchemes: 0,
    bookmarkCount: 0,
    unreadAlerts: 0,
    eligibilityChecks: 0
  });
  const [recommendations, setRecommendations] = useState([]);
  const [recentSchemes, setRecentSchemes] = useState([]);
  const [bookmarkedSchemes, setBookmarkedSchemes] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      const token = localStorage.getItem('token');
      const requests = [
        axios.get('http://localhost:8000/schemes/stats').catch(() => ({ data: { total_schemes: 0 } })),
        axios.get('http://localhost:8000/schemes/?limit=6&sort=latest').catch(() => ({ data: { items: [] } }))
      ];
      
      // Add authenticated requests if token exists
      if (token) {
        requests.push(
          axios.get('http://localhost:8000/recommendations/', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] })),
          axios.get('http://localhost:8000/users/bookmarks', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] })),
          axios.get('http://localhost:8000/alerts/unread', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] }))
        );
      }
      
      const responses = await Promise.allSettled(requests);
      
      // Handle stats
      if (responses[0].status === 'fulfilled') {
        setStats(prev => ({
          ...prev,
          totalSchemes: responses[0].value.data.total_schemes || 0
        }));
      }
      
      // Handle recent schemes
      if (responses[1].status === 'fulfilled') {
        const recentSchemesData = responses[1].value.data.items || responses[1].value.data || [];
        setRecentSchemes(recentSchemesData);
      }
      
      // Handle authenticated requests
      if (token && responses.length > 2) {
        // Recommendations
        if (responses[2].status === 'fulfilled') {
          setRecommendations(responses[2].value.data || []);
        }
        
        // Bookmarks
        if (responses[3].status === 'fulfilled') {
          const bookmarks = responses[3].value.data || [];
          setBookmarkedSchemes(bookmarks.slice(0, 3)); // Show only first 3
          setBookmarkedIds(new Set(bookmarks.map(b => b._id)));
          setStats(prev => ({ ...prev, bookmarkCount: bookmarks.length }));
        }
        
        // Unread alerts
        if (responses[4].status === 'fulfilled') {
          const unreadCount = responses[4].value.data.length || 0;
          setStats(prev => ({ ...prev, unreadAlerts: unreadCount }));
        }
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setFetchError('Failed to load dashboard data');
      showError('Unable to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkChange = async (schemeId, isBookmarked) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) {
        next.add(schemeId);
      } else {
        next.delete(schemeId);
      }
      return next;
    });

    // Update bookmark count in stats
    setStats(prev => ({
      ...prev,
      bookmarkCount: isBookmarked ? prev.bookmarkCount + 1 : prev.bookmarkCount - 1
    }));

    // Update bookmarked schemes array
    if (isBookmarked) {
      // When bookmarking, we need to add the scheme to the array
      // Find the scheme from recommendations or recent schemes
      const schemeToAdd = [...recommendations, ...recentSchemes].find(
        scheme => (scheme._id || scheme.scheme_id) === schemeId
      );
      
      if (schemeToAdd) {
        setBookmarkedSchemes(prev => {
          // Check if already in the list
          const exists = prev.find(s => (s._id || s.scheme_id) === schemeId);
          if (!exists && prev.length < 5) {
            return [...prev, schemeToAdd];
          }
          return prev;
        });
      }
    } else {
      // When unbookmarking, remove from the array
      setBookmarkedSchemes(prev => 
        prev.filter(scheme => (scheme._id || scheme.scheme_id) !== schemeId)
      );
    }
  };

  const categories = [
    { name: 'Pension', icon: '🧓', color: 'bg-teal-100 text-teal-800', count: 0 },
    { name: 'Healthcare', icon: '🏥', color: 'bg-emerald-100 text-emerald-800', count: 0 },
    { name: 'Housing', icon: '🏠', color: 'bg-orange-100 text-orange-800', count: 0 },
    { name: 'Disability', icon: '♿', color: 'bg-purple-100 text-purple-800', count: 0 },
    { name: 'Agriculture', icon: '🌾', color: 'bg-yellow-100 text-yellow-800', count: 0 },
    { name: 'Education', icon: '📚', color: 'bg-indigo-100 text-indigo-800', count: 0 },
    { name: 'General', icon: '🌐', color: 'bg-gray-100 text-gray-800', count: 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading Skeletons */}
          <div className="space-y-8">
            {/* Welcome Banner Skeleton */}
            <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-2xl">
              <div className="space-y-4">
                <div className="h-8 bg-white/20 rounded w-1/3 animate-pulse"></div>
                <div className="h-6 bg-white/20 rounded w-1/2 animate-pulse"></div>
                <div className="flex space-x-3">
                  <div className="h-8 bg-white/20 rounded-full w-32 animate-pulse"></div>
                  <div className="h-8 bg-white/20 rounded-full w-24 animate-pulse"></div>
                  <div className="h-8 bg-white/20 rounded-full w-40 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Stats Skeleton */}
            <LoadingSkeleton type="stats" count={4} />

            {/* Recommendations Skeleton */}
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <LoadingSkeleton type="grid" count={3} />
            </div>

            {/* Recent Schemes Skeleton */}
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <LoadingSkeleton type="grid" count={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load dashboard</h2>
          <p className="text-gray-600 mb-6">{fetchError}</p>
          <button
            onClick={() => {
              setFetchError(null);
              fetchDashboardData();
            }}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-2xl p-8 mb-8 text-white shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-emerald-600/20 animate-pulse"></div>
          <div className="relative z-10">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-3xl font-bold mb-3"
            >
              Welcome back, {user?.full_name?.split(' ')[0] || 'Friend'} 👋
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-blue-100 mb-6 text-lg"
            >
              Here are schemes matched for you today
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center gap-3"
            >
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                📍 {user?.location || 'Kerala'}
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                🎂 Age: {user?.age || 'Not specified'}
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                💰 Income: {user?.income_annual ? `Rs ${user.income_annual}/year` : 'Not specified'}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="enhanced-card p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Schemes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSchemes}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="enhanced-card p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Bookmarked</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.bookmarkCount}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Bookmark className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="enhanced-card p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Unread Alerts</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.unreadAlerts}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="enhanced-card p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Eligibility Checks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.eligibilityChecks}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Personalized Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Recommended for You</h3>
              <Link to="/schemes?recommended=true" className="text-blue-600 hover:text-blue-700 flex items-center">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {recommendations.map((scheme) => (
                <div key={scheme._id} className="flex-shrink-0 w-80">
                  <SchemeCard 
                    scheme={scheme} 
                    showWhyRecommended={true} 
                    isBookmarked={bookmarkedIds.has(scheme._id)}
                    onBookmarkChange={handleBookmarkChange}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse by Category */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/schemes?category=${category.name.toLowerCase()}`}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow text-center"
              >
                <div className="text-3xl mb-2">{category.icon}</div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
                  {category.name}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recently Updated Schemes */}
        {recentSchemes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recently Updated Schemes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSchemes.map((scheme) => (
                <SchemeCard 
                  key={scheme._id} 
                  scheme={scheme} 
                  isBookmarked={bookmarkedIds.has(scheme._id)}
                  onBookmarkChange={handleBookmarkChange}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
