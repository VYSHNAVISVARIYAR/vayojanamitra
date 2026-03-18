import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, X, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import CompareSelector from '../components/CompareSelector';
import SchemeCard from '../components/SchemeCard';
import EligibilityCard from '../components/EligibilityCard';
import { useAuth } from '../context/AuthContext';

const SchemeCompare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Need to import useAuth
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [schemesData, setSchemesData] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [eligibilityResults, setEligibilityResults] = useState({});

  useEffect(() => {
    // Check if schemes were passed via navigation state
    if (location.state?.schemeIds) {
      setSelectedSchemes(location.state.schemeIds);
      setShowComparison(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedSchemes.length > 0) {
      fetchSchemesData();
    }
  }, [selectedSchemes]);

  const fetchSchemesData = async () => {
    try {
      setLoading(true);
      const promises = selectedSchemes.map(id => 
        axios.get(`http://localhost:8000/schemes/${id}`)
      );
      const responses = await Promise.all(promises);
      setSchemesData(responses.map(res => res.data));
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemesSelected = (schemeIds) => {
    setSelectedSchemes(schemeIds);
    setShowComparison(false);
    setComparisonResult(null);
  };

  const performComparison = async () => {
    if (selectedSchemes.length < 2) return;
    
    try {
      setLoading(true);
      const response = await axios.post(
        'http://localhost:8000/documents/compare',
        selectedSchemes
      );
      setComparisonResult(response.data);
      setShowComparison(true);
    } catch (error) {
      console.error('Error comparing schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeScheme = (schemeId) => {
    const newSchemes = selectedSchemes.filter(id => id !== schemeId);
    setSelectedSchemes(newSchemes);
    if (newSchemes.length < 2) {
      setShowComparison(false);
      setComparisonResult(null);
    }
  };

  const handleEligibilityCheck = async (scheme) => {
    if (!user) {
      alert('Please login to check eligibility');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build user profile from user data
      const userProfile = {
        age: user.age || 69, // Default from the image
        income_annual: user.income_annual || 'Not specified',
        location: user.location || 'Kottayam',
        occupation: user.occupation || 'Not specified',
        health_conditions: user.health_conditions || [],
        gender: user.gender || 'Not specified'
      };

      const response = await axios.post(
        `http://localhost:8000/chatbot/eligibility/${scheme._id}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Store eligibility result
      setEligibilityResults(prev => ({
        ...prev,
        [scheme._id]: response.data
      }));

    } catch (error) {
      console.error('Error checking eligibility:', error);
      alert('Failed to check eligibility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderComparisonTable = () => {
    if (!comparisonResult || !comparisonResult.comparison_table) return null;

    const { comparison_table, schemes } = comparisonResult;
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              {schemes.map((scheme, index) => (
                <th key={scheme._id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>
                    <div className="font-semibold text-gray-900">{scheme.title}</div>
                    <div className="text-xs text-gray-500">{scheme.category}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comparison_table.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.field}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {row.scheme1 || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {row.scheme2 || '-'}
                </td>
                {schemes.length > 2 && (
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {row.scheme3 || '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!showComparison) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Compare Schemes</h1>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CompareSelector 
            onSchemesSelected={handleSchemesSelected}
            initialSchemes={selectedSchemes}
          />
          
          {selectedSchemes.length >= 2 && (
            <div className="mt-8 text-center">
              <button
                onClick={performComparison}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Comparing...' : 'Compare Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Scheme Comparison</h1>
            </div>
            <button
              onClick={() => setShowComparison(false)}
              className="text-blue-600 hover:text-blue-700"
            >
              Add More Schemes
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selected Schemes */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {schemesData.map((scheme) => (
              <div key={scheme._id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center">
                <span className="text-sm font-medium text-gray-900">{scheme.title}</span>
                <button
                  onClick={() => removeScheme(scheme._id)}
                  className="ml-2 p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Summary */}
        {comparisonResult?.summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">AI Analysis</h3>
                <p className="text-blue-800 mb-2">{comparisonResult.summary}</p>
                {comparisonResult.winner_for_elderly && (
                  <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800 font-medium">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      Best for elderly citizens: {comparisonResult.winner_for_elderly}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Analyzing schemes...</p>
            </div>
          </div>
        ) : (
          renderComparisonTable()
        )}

        {/* Scheme Actions */}
        {schemesData.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemesData.map((scheme) => (
              <div key={scheme._id} className="bg-white rounded-lg shadow-sm p-4">
                <SchemeCard scheme={scheme} compact={true} />
                
                {/* Eligibility Result */}
                {eligibilityResults[scheme._id] && (
                  <div className="mt-4">
                    <EligibilityCard result={eligibilityResults[scheme._id]} />
                  </div>
                )}
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/schemes/${scheme._id}`)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => handleEligibilityCheck(scheme)}
                    disabled={loading}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Checking...' : 'Check Eligibility'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemeCompare;
