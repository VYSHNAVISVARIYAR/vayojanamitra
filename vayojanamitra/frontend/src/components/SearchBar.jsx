import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MessageCircle } from 'lucide-react';
import axios from 'axios';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Handle click outside to close results
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 3) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 400);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  const performSearch = async (searchQuery) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data);
      setShowResults(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (results.length + 1)); // +1 for "Ask Mitra"
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? results.length : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === results.length) {
          // "Ask Mitra" option
          handleAskMitra();
        } else if (selectedIndex >= 0) {
          // Scheme result
          const scheme = results[selectedIndex];
          navigate(`/schemes/${scheme._id}`);
          setShowResults(false);
          setQuery('');
        } else {
          // Regular search
          navigate(`/schemes?q=${encodeURIComponent(query)}`);
          setShowResults(false);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleAskMitra = () => {
    navigate(`/chat?query=${encodeURIComponent(query)}`);
    setShowResults(false);
    setQuery('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/schemes?q=${encodeURIComponent(query)}`);
      setShowResults(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const getSchemeIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'pension': return '🧓';
      case 'healthcare': return '🏥';
      case 'housing': return '🏠';
      case 'disability': return '♿';
      case 'agriculture': return '🌾';
      case 'education': return '📚';
      default: return '🌐';
    }
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search schemes, benefits, eligibility..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.length >= 3 && results.length > 0) {
                setShowResults(true);
              }
            }}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length === 0 && query.length >= 3 ? (
            <div className="p-4 text-center text-gray-500">
              No schemes found
            </div>
          ) : (
            <>
              {/* Scheme Results */}
              {results.map((scheme, index) => (
                <div
                  key={scheme._id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    navigate(`/schemes/${scheme._id}`);
                    setShowResults(false);
                    setQuery('');
                  }}
                >
                  <div className="flex items-start">
                    <div className="text-lg mr-3 flex-shrink-0">
                      {getSchemeIcon(scheme.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {scheme.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {scheme.category}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-1">
                        {scheme.description?.substring(0, 50)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* "Ask Mitra" Option */}
              {query.length >= 3 && (
                <div
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-200 ${
                    selectedIndex === results.length ? 'bg-blue-50' : ''
                  }`}
                  onClick={handleAskMitra}
                >
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-3 text-blue-600" />
                    <span className="text-blue-600 font-medium">
                      Ask Mitra about "{query}"
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
