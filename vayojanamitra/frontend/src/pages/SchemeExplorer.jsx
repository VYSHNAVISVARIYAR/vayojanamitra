import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, X, ChevronDown, ChevronUp, Grid, List } from 'lucide-react';
import SchemeCard from '../components/SchemeCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const SchemeExplorer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  
  // Sort options
  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'category', label: 'Category' }
  ];
  
  // Filter states
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'latest');
  const [showFilters, setShowFilters] = useState(false);
  
  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchSchemes();
    fetchBookmarks();
    fetchCategories();
  }, [page, category, debouncedSearchQuery, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:8000/schemes/categories');
      const categoryData = response.data;
      
      // Transform categories into the format expected by the select
      const formattedCategories = [
        { value: 'all', label: 'All Categories' },
        ...categoryData.map(cat => ({
          value: cat,
          label: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')
        }))
      ];
      
      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback categories
      setCategories([
        { value: 'all', label: 'All Categories' },
        { value: 'pension', label: 'Pension' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'housing', label: 'Housing' },
        { value: 'disability', label: 'Disability' },
        { value: 'education', label: 'Education' },
        { value: 'general', label: 'General' }
      ]);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('http://localhost:8000/users/bookmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const ids = response.data.map(b => b._id || b.scheme_id);
      setBookmarkedIds(new Set(ids));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (searchQuery) params.set('q', searchQuery);
    if (sortBy) params.set('sort', sortBy);
    if (page > 1) params.set('page', page.toString());
    
    setSearchParams(params);
  }, [category, searchQuery, sortBy, page]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      
      if (category !== 'all') params.set('category', category);
      if (searchQuery) params.set('q', searchQuery);
      if (sortBy) params.set('sort', sortBy);
      
      const response = await axios.get(`http://localhost:8000/schemes/?${params}`);
      
      setSchemes(response.data.items || response.data);
      setTotal(response.data.total || response.data.length);
      
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSchemes();
  };

  const clearFilters = () => {
    setCategory('all');
    setSearchQuery('');
    setSortBy('latest');
    setPage(1);
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

    // Optionally refresh bookmarks to keep in sync
    if (!isBookmarked) {
      fetchBookmarks();
    }
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Showing {schemes.length} schemes
            {total > 0 && <span className="text-gray-500 font-normal"> of {total}</span>}
          </h2>
          
          {/* Active Filters */}
          <div className="flex items-center space-x-2">
            {category !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {categories.find(c => c.value === category)?.label}
                <button
                  onClick={() => {
                    setCategory('all');
                    setPage(1);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3 inline" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                "{searchQuery}"
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3 inline" />
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} type={viewMode} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && schemes.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schemes found</h3>
            <p className="text-gray-500 mb-4">Try different filters or search terms</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {!loading && schemes.length > 0 && (
          <>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
              {schemes.map((scheme) => (
                <SchemeCard 
                  key={scheme._id} 
                  scheme={scheme} 
                  isBookmarked={bookmarkedIds.has(scheme._id)}
                  onBookmarkChange={handleBookmarkChange}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 rounded-lg ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SchemeExplorer;
