import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin, ExternalLink, Clock } from 'lucide-react';
import axios from 'axios';

const SchemeCard = ({ scheme, showWhyRecommended = false, onBookmark }) => {
  const [bookmarked, setBookmarked] = useState(false);
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
      if (onBookmark) onBookmark(scheme._id, !bookmarked);
      
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
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow min-h-[220px] flex flex-col">
      {/* Category Badge */}
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(scheme.category)}`}>
          {scheme.category || 'General'}
        </span>
        
        {/* Bookmark Button */}
        <button
          onClick={handleBookmark}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title={bookmarked ? 'Remove bookmark' : 'Bookmark scheme'}
        >
          <Bookmark 
            className={`h-4 w-4 ${bookmarked ? 'fill-blue-600 text-blue-600' : 'text-gray-400'}`} 
          />
        {scheme.documents_required && scheme.documents_required.length > 0 && !scheme.documents_required.includes('Not specified') && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Required Documents</h4>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {scheme.documents_required.map((doc, index) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
        <span className="text-xs text-gray-500">Source: Kerala Government</span>
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
};

export default SchemeCard;
