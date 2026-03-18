import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  User, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  BookOpen,
  Calendar,
  MapPin,
  Bookmark,
  AlertCircle,
  Plus,
  X,
  MessageCircle
} from 'lucide-react';
import SchemeCard from '../components/SchemeCard';

const SchemeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [bookmarked, setBookmarked] = useState(false);
  const [similarSchemes, setSimilarSchemes] = useState([]);
  const [simpleExplanation, setSimpleExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const fetchScheme = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/schemes/${id}`);
      setScheme(response.data);
    } catch (error) {
      console.error('Error fetching scheme:', error);
      setError('Failed to load scheme details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchScheme();
    }
  }, [id]);

  const fetchSimilarSchemes = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/schemes/${id}/similar`);
      setSimilarSchemes(response.data);
    } catch (error) {
      console.error('Error fetching similar schemes:', error);
    }
  }, [id]);

  const handleBookmarkToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      if (bookmarked) {
        await axios.delete(
          `http://localhost:8000/users/bookmarks/${id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `http://localhost:8000/users/bookmarks/${id}`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
      setBookmarked(!bookmarked);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const askMitraAboutScheme = () => {
    navigate('/chat', { 
      state: { 
        scheme_id: id, 
        scheme_title: scheme?.title,
        initial_message: `Tell me about ${scheme?.title} and check if I'm eligible`
      } 
    });
  };

  const fetchSimpleExplanation = async () => {
    try {
      setLoadingExplanation(true);
      const response = await axios.get(`http://localhost:8000/schemes/${id}/explain`);
      setSimpleExplanation(response.data.simple_explanation);
    } catch (error) {
      console.error('Error fetching simple explanation:', error);
    } finally {
      setLoadingExplanation(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'similar' && similarSchemes.length === 0) {
      fetchSimilarSchemes();
    }
  }, [activeTab, similarSchemes.length, fetchSimilarSchemes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading scheme details...</p>
        </div>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Scheme Not Found</h2>
          <p className="text-gray-500 mb-4">{error || 'The requested scheme could not be found.'}</p>
          <button
            onClick={() => navigate('/schemes')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schemes
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'similar', label: 'Similar Schemes', icon: Plus }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/schemes')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <BookOpen className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{scheme.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {scheme.category}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {scheme.state}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBookmarkToggle}
                className={`flex items-center px-3 py-2 rounded-lg border ${
                  bookmarked 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${bookmarked ? 'fill-current' : ''}`} />
                {bookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Description */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                    <p className="text-gray-700 leading-relaxed">{scheme.description}</p>
                    
                    {/* Explain Simply Button */}
                    <button
                      onClick={fetchSimpleExplanation}
                      disabled={loadingExplanation}
                      className="mt-4 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loadingExplanation ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Explaining...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Explain Simply
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Simple Explanation */}
                  {simpleExplanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Simple Explanation
                      </h3>
                      <p className="text-blue-800 leading-relaxed">{simpleExplanation}</p>
                    </div>
                  )}

                  {/* Benefits */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      Benefits
                    </h2>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {scheme.benefits}
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="h-5 w-5 text-blue-600 mr-2" />
                      Eligibility Criteria
                    </h2>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {scheme.eligibility}
                    </div>
                  </div>

                  {/* Application Process */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock className="h-5 w-5 text-purple-600 mr-2" />
                      Application Process
                    </h2>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {scheme.application_process}
                    </div>
                  </div>

                  {/* Official Link */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Official Information</h2>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Official Source:</p>
                        <a
                          href={scheme.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center"
                        >
                          Visit Official Website
                          <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          scheme.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {scheme.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {activeTab === 'similar' && (
                <div>
                  {similarSchemes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {similarSchemes.map((similarScheme) => (
                        <div key={similarScheme._id} className="bg-white rounded-lg shadow-sm p-4">
                          <SchemeCard scheme={similarScheme} compact={true} />
                          <div className="mt-4 flex space-x-2">
                            <button
                              onClick={() => navigate(`/schemes/${similarScheme._id}`)}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Finding similar schemes...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {/* Ask Mitra button removed */}
                <button
                  onClick={handleBookmarkToggle}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg border ${
                    bookmarked 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${bookmarked ? 'fill-current' : ''}`} />
                  {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>

              {/* Scheme Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Scheme Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{scheme.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">State:</span>
                    <span className="font-medium">{scheme.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      scheme.is_active ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {scheme.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemeDetail;
