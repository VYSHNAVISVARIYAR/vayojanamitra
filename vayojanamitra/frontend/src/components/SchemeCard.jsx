import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, MapPin, ExternalLink, Clock, Star, TrendingUp } from 'lucide-react';
import axios from 'axios';

const SchemeCard = ({ scheme, showWhyRecommended = false, isBookmarked = false, onBookmarkChange }) => {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [loading, setLoading] = useState(false);

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'pension':
        return 'bg-blue-100 text-blue-800';
      case 'healthcare':
        return 'bg-green-100 text-green-800';
      case 'housing':
        return 'bg-orange-100 text-orange-800';
      case 'disability':
        return 'bg-purple-100 text-purple-800';
      case 'agriculture':
        return 'bg-yellow-100 text-yellow-800';
      case 'education':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (bookmarked) {
        await axios.delete(
          `http://localhost:8000/users/bookmarks/${scheme._id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:8000/users/bookmarks',
          { scheme_id: scheme._id },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
      
      setBookmarked(!bookmarked);
      if (onBookmarkChange) onBookmarkChange(scheme._id, !bookmarked);
      
    } catch (error) {
      console.error('Error bookmarking scheme:', error);
    } finally {
      setLoading(false);
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="enhanced-card p-6 min-h-[240px] flex flex-col relative overflow-hidden group"
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      
      {/* Category Badge */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <motion.span 
          whileHover={{ scale: 1.1 }}
          className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(scheme.category)} shadow-sm`}
        >
          {scheme.category || 'General'}
        </motion.span>
        
        {/* Bookmark Button */}
        <motion.button
          whileHover={{ scale: 1.2, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleBookmark}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50 relative z-10"
          title={bookmarked ? 'Remove bookmark' : 'Bookmark scheme'}
        >
          <motion.div
            animate={bookmarked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Bookmark 
              className={`h-4 w-4 ${bookmarked ? 'fill-blue-600 text-blue-600' : 'text-gray-400'}`} 
            />
          </motion.div>
        </motion.button>
      </div>

      {/* Title */}
      <motion.h3 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3rem] text-lg relative z-10"
      >
        {scheme.title}
      </motion.h3>

      {/* Description */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow relative z-10"
      >
        {truncateText(scheme.description, 120)}
      </motion.p>

      {/* Benefits Preview */}
      {scheme.benefits && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mb-4 border border-blue-100 relative z-10"
        >
          <p className="text-sm text-blue-800 font-medium line-clamp-2 flex items-center">
            <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
            {truncateText(scheme.benefits, 80)}
          </p>
        </motion.div>
      )}

      {/* Why Recommended (if shown) */}
      {showWhyRecommended && scheme.why_recommended && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg mb-4 relative z-10"
        >
          <p className="text-sm text-green-800 flex items-center">
            <Star className="h-3 w-3 mr-1 flex-shrink-0" />
            {scheme.why_recommended}
          </p>
        </motion.div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          {/* State Badge */}
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {scheme.state || 'Kerala'}
          </span>
          
          {/* Updated Time */}
          {scheme.last_updated && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimeAgo(scheme.last_updated)}
            </div>
          )}
        </div>

        {/* View Details Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to={`/schemes/${scheme._id}`}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View Details
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SchemeCard;
