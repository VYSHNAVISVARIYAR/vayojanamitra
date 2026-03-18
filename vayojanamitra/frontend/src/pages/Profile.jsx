import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    location: '',
    income_annual: 50000,
    occupation: '',
    health_conditions: []
  });

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
          setFormData({
            age: response.data.age || '',
            gender: response.data.gender || '',
            location: response.data.location || '',
            income_annual: response.data.income_annual || 50000,
            occupation: response.data.occupation || '',
            health_conditions: response.data.health_conditions || []
          });
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

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
      setError('');
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.age || !formData.gender || !formData.location) {
          setError('Please fill all personal information fields');
          return false;
        }
        if (formData.age < 18 || formData.age > 120) {
          setError('Please enter a valid age');
          return false;
        }
        return true;
      case 2:
        if (!formData.occupation) {
          setError('Please select your occupation');
          return false;
        }
        return true;
      case 3:
        if (formData.health_conditions.length === 0) {
          setError('Please select at least one health condition');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        navigate('/home');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your age"
                min="18"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">District</label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select your district</option>
                {keralaDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Annual Income: ₹{formData.income_annual.toLocaleString()}
              </label>
              <input
                type="range"
                name="income_annual"
                value={formData.income_annual}
                onChange={handleChange}
                className="mt-1 block w-full"
                min="0"
                max="500000"
                step="10000"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>₹0</span>
                <span>₹5,00,000</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Occupation</label>
              <select
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select occupation</option>
                {occupations.map(occupation => (
                  <option key={occupation} value={occupation}>{occupation}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Health Information</h3>
            <p className="text-sm text-gray-600">Select all that apply to you</p>
            
            <div className="space-y-3">
              {healthOptions.map(condition => (
                <label key={condition} className="flex items-center">
                  <input
                    type="checkbox"
                    name="health_conditions"
                    value={condition}
                    checked={formData.health_conditions.includes(condition)}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{condition}</span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Edit Your Profile
            </h2>
            <p className="text-gray-600 mb-6">
              Update your information to get better scheme recommendations
            </p>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {['Personal', 'Financial', 'Health'].map((label, index) => (
                    <div key={label} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index + 1 <= step
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      {index < 2 && (
                        <div
                          className={`w-16 h-1 ${
                            index + 1 < step ? 'bg-indigo-600' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Personal Info</span>
                <span>Financial Info</span>
                <span>Health Info</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
              {renderStep()}

              <div className="flex justify-between mt-8">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}
                
                <div className="ml-auto">
                  {step < 3 ? (
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
