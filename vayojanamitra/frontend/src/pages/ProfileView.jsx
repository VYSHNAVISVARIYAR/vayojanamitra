import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Edit3, Save, X, User, MapPin, Briefcase, Heart, DollarSign, Calendar } from 'lucide-react';
import axios from 'axios';

const ProfileView = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    location: '',
    income_annual: 50000,
    occupation: '',
    health_conditions: []
  });
  const [originalData, setOriginalData] = useState({});

  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch existing profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:8000/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data) {
          const data = {
            age: response.data.age || '',
            gender: response.data.gender || '',
            location: response.data.location || '',
            income_annual: response.data.income_annual || 50000,
            occupation: response.data.occupation || '',
            health_conditions: response.data.health_conditions || []
          };
          setFormData(data);
          setOriginalData(data);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();
  }, []);

  const keralaDistricts = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur',
    'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad',
    'Kannur', 'Kasaragod'
  ];

  const occupations = [
    'Retired', 'Farmer', 'Daily Wage Worker', 'Self Employed',
    'Unemployed', 'Other'
  ];

  const healthOptions = [
    'None', 'Diabetes', 'Disability', 'Heart Disease',
    'Cancer', 'Vision Impairment'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (value === 'None') {
        setFormData({
          ...formData,
          health_conditions: checked ? ['None'] : []
        });
      } else {
        const conditions = [...formData.health_conditions];
        if (checked) {
          if (!conditions.includes(value)) {
            conditions.push(value);
          }
          // Remove 'None' if other conditions are selected
          const noneIndex = conditions.indexOf('None');
          if (noneIndex > -1) {
            conditions.splice(noneIndex, 1);
          }
        } else {
          const index = conditions.indexOf(value);
          if (index > -1) {
            conditions.splice(index, 1);
          }
        }
        setFormData({
          ...formData,
          health_conditions: conditions
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(originalData);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8000/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setOriginalData(formData);
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile Summary</h1>
                <p className="text-gray-600">Complete welfare profile information</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PDF-like Profile Document */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Document Header */}
          <div className="border-b-4 border-blue-600 bg-gray-50 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">VAYOJANAMITRA</h2>
                <p className="text-gray-600">Kerala Senior Citizens Welfare Profile</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Profile ID: {user?.email?.split('@')[0]?.toUpperCase() || 'N/A'}</p>
                <p>Date: {formatDate()}</p>
              </div>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Personal Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4 pb-2 border-b-2 border-gray-200">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Age</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                      min="18"
                      max="120"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{formData.age || 'Not specified'} years</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Gender</label>
                  {isEditing ? (
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 font-medium capitalize">{formData.gender || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">District</label>
                  {isEditing ? (
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">Select district</option>
                      {keralaDistricts.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 font-medium">{formData.location || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4 pb-2 border-b-2 border-gray-200">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Annual Income</label>
                  {isEditing ? (
                    <div>
                      <input
                        type="range"
                        name="income_annual"
                        value={formData.income_annual}
                        onChange={handleChange}
                        className="w-full mb-2"
                        min="0"
                        max="500000"
                        step="10000"
                      />
                      <p className="text-sm text-gray-900 font-medium">₹{formData.income_annual.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-gray-900 font-medium">₹{formData.income_annual.toLocaleString()}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Occupation</label>
                  {isEditing ? (
                    <select
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">Select occupation</option>
                      {occupations.map(occupation => (
                        <option key={occupation} value={occupation}>{occupation}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 font-medium">{formData.occupation || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Health Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4 pb-2 border-b-2 border-gray-200">
                <Heart className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Health Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-3">Health Conditions</label>
                {isEditing ? (
                  <div className="space-y-2">
                    {healthOptions.map(condition => (
                      <label key={condition} className="flex items-center">
                        <input
                          type="checkbox"
                          name="health_conditions"
                          value={condition}
                          checked={formData.health_conditions.includes(condition)}
                          onChange={handleChange}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-900">{condition}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.health_conditions.length > 0 ? (
                      formData.health_conditions.map(condition => (
                        <span key={condition} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {condition}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No health conditions specified</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-4 pb-2 border-b-2 border-gray-200">
                <MapPin className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                  <p className="text-gray-900 font-medium">{user?.email || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Account Status</label>
                  <p className="text-green-600 font-medium">Active</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t-2 border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <p>Generated by Vayojanamitra Welfare System</p>
                <p>Page 1 of 1</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
