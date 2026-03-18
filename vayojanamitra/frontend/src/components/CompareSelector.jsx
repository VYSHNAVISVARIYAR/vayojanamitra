import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import axios from 'axios';

const CompareSelector = ({ onSchemesSelected, initialSchemes = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState(initialSchemes);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    setSelectedSchemes(initialSchemes);
  }, [initialSchemes]);

  useEffect(() => {
    if (searchQuery.trim()) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        searchSchemes();
      }, 400);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }

    return () => {
      clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const searchSchemes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8000/schemes/search?q=${encodeURIComponent(searchQuery)}&n=10`
      );
      
      // Filter out already selected schemes
      const filteredResults = response.data.filter(
        scheme => !selectedSchemes.includes(scheme._id)
      );
      
      setSearchResults(filteredResults);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching schemes:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addScheme = (scheme) => {
    if (selectedSchemes.length >= 3) {
      alert('You can compare maximum 3 schemes at a time');
      return;
    }
    
    const newSelection = [...selectedSchemes, scheme._id];
    setSelectedSchemes(newSelection);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    
    if (onSchemesSelected) {
      onSchemesSelected(newSelection);
    }
  };

  const removeScheme = (schemeId) => {
    const newSelection = selectedSchemes.filter(id => id !== schemeId);
    setSelectedSchemes(newSelection);
    
    if (onSchemesSelected) {
      onSchemesSelected(newSelection);
    }
  };

  const handleCompare = () => {
    if (selectedSchemes.length >= 2 && onSchemesSelected) {
      onSchemesSelected(selectedSchemes);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for schemes to compare..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onFocus={() => setShowDropdown(true)}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((scheme) => (
              <div
                key={scheme._id}
                onClick={() => addScheme(scheme)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{scheme.title}</h4>
                    <p className="text-sm text-gray-600">{scheme.category}</p>
                  </div>
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Schemes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Selected Schemes ({selectedSchemes.length}/3)
        </h3>
        
        {selectedSchemes.length === 0 ? (
          <p className="text-gray-500 text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            Search and add schemes to compare
          </p>
        ) : (
          <div className="space-y-3">
            {selectedSchemes.map((schemeId) => {
              const scheme = searchResults.find(s => s._id === schemeId) || 
                           { _id: schemeId, title: `Scheme ${schemeId}`, category: 'Unknown' };
              
              return (
                <div key={schemeId} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{scheme.title}</h4>
                    <p className="text-sm text-gray-600">{scheme.category}</p>
                  </div>
                  <button
                    onClick={() => removeScheme(schemeId)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compare Button */}
      <div className="text-center">
        <button
          onClick={handleCompare}
          disabled={selectedSchemes.length < 2}
          className={`px-8 py-3 rounded-lg font-medium ${
            selectedSchemes.length >= 2
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {selectedSchemes.length < 2 
            ? `Add ${2 - selectedSchemes.length} more scheme${2 - selectedSchemes.length > 1 ? 's' : ''}`
            : 'Compare Schemes'
          }
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How to Compare</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Search for schemes you want to compare</li>
          <li>• Select 2-3 schemes using the + button</li>
          <li>• Click "Compare Schemes" to see detailed analysis</li>
          <li>• AI will highlight key differences and recommend the best option</li>
        </ul>
      </div>
    </div>
  );
};

export default CompareSelector;
