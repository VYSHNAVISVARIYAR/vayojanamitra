import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Calendar, Briefcase, Heart, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import axios from 'axios';

const ProfileSetup = () => {
  const { user, updateUser } = useAuth();
  const { translate, isMalayalam } = useTranslation();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isRegistrationFlow, setIsRegistrationFlow] = useState(false);
  
  // Initialize form data
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    age: user?.age || '',
    location: user?.location || '',
    occupation: user?.occupation || '',
    income_range: user?.income_range || '',
    disabilities: user?.disabilities || [],
    family_size: user?.family_size || '',
    health_conditions: user?.health_conditions || []
  });

  const totalSteps = 4;

  useEffect(() => {
    // Check if this is registration flow
    const registrationEmail = localStorage.getItem('registrationEmail');
    const registrationName = localStorage.getItem('registrationName');
    
    if (registrationEmail && registrationName) {
      setIsRegistrationFlow(true);
      setFormData(prev => ({
        ...prev,
        full_name: registrationName
      }));
    } else if (user?.full_name && user?.age && user?.location) {
      // If user is already fully set up, redirect to profile
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const currentValues = prev[field] || [];
      if (currentValues.includes(value)) {
        return {
          ...prev,
          [field]: currentValues.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [field]: [...currentValues, value]
        };
      }
    });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep < totalSteps) {
      nextStep();
      return;
    }

    // Final submission
    setLoading(true);
    try {
      if (isRegistrationFlow) {
        // Use temporary token for profile setup
        const tempToken = localStorage.getItem('tempToken');
        
        // Convert frontend data to backend format
        const backendData = {
          age: parseInt(formData.age),
          income_annual: convertIncomeRangeToAnnual(formData.income_range),
          location: formData.location,
          occupation: formData.occupation,
          health_conditions: formData.health_conditions,
          gender: formData.gender || 'other' // Default to 'other' if not selected
        };
        
        const response = await axios.put(
          'http://localhost:8000/users/profile',
          backendData,
          { headers: { 'Authorization': `Bearer ${tempToken}` } }
        );
        
        // Clear registration data
        localStorage.removeItem('tempToken');
        localStorage.removeItem('registrationEmail');
        localStorage.removeItem('registrationName');
        
        // Redirect to login with success message
        navigate('/login', { state: { message: 'Profile setup complete! Please login to continue.' } });
      } else {
        // Regular profile update flow
        const token = localStorage.getItem('token');
        
        // Convert frontend data to backend format
        const backendData = {
          age: parseInt(formData.age),
          income_annual: convertIncomeRangeToAnnual(formData.income_range),
          location: formData.location,
          occupation: formData.occupation,
          health_conditions: formData.health_conditions,
          gender: formData.gender || 'other'
        };
        
        const response = await axios.put(
          'http://localhost:8000/users/profile',
          backendData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        updateUser(response.data);
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert income range to annual amount
  const convertIncomeRangeToAnnual = (range) => {
    const incomeMap = {
      'Below 10,000': 90000,
      '10,000 - 25,000': 180000,
      '25,000 - 50,000': 360000,
      '50,000 - 1,00,000': 720000,
      'Above 1,00,000': 1200000
    };
    return incomeMap[range] || 360000; // Default to middle range
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.full_name && formData.age;
      case 2:
        return formData.location && formData.occupation;
      case 3:
        return formData.income_range && formData.family_size;
      case 4:
        return true; // Optional fields
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {translate('Personal Information')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translate('Full Name')}
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={translate('Enter your full name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translate('Age')}
                  </label>
                  <select
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate('Select age')}</option>
                    {[...Array(80)].map((_, i) => i + 40).map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {translate('Location & Occupation')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    {translate('District')}
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate('Select your district')}</option>
                    {[
                      'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
                      'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
                      'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
                    ].map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="h-4 w-4 inline mr-2" />
                    {translate('Occupation')}
                  </label>
                  <select
                    value={formData.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate('Select occupation')}</option>
                    {[
                      'Government Employee', 'Private Sector', 'Self-Employed',
                      'Agriculture', 'Retired', 'Homemaker', 'Student', 'Other'
                    ].map(occupation => (
                      <option key={occupation} value={occupation}>{occupation}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {translate('Family & Financial Information')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translate('Monthly Income Range')}
                  </label>
                  <select
                    value={formData.income_range}
                    onChange={(e) => handleInputChange('income_range', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate('Select income range')}</option>
                    {[
                      'Below 10,000', '10,000 - 25,000', '25,000 - 50,000',
                      '50,000 - 1,00,000', 'Above 1,00,000'
                    ].map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translate('Family Size')}
                  </label>
                  <select
                    value={formData.family_size}
                    onChange={(e) => handleInputChange('family_size', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate('Select family size')}</option>
                    {[1, 2, 3, 4, 5, 6, '7+'].map(size => (
                      <option key={size} value={size}>{size} {size === 1 ? 'person' : 'people'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {translate('Health & Accessibility')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {translate('This information helps us find relevant schemes for you (optional)')}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translate('Gender')}
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{translate('Select gender')}</option>
                    <option value="male">{translate('Male')}</option>
                    <option value="female">{translate('Female')}</option>
                    <option value="other">{translate('Other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Heart className="h-4 w-4 inline mr-2" />
                    {translate('Health Conditions')}
                  </label>
                  <div className="space-y-2">
                    {[
                      'Diabetes', 'Hypertension', 'Heart Disease', 'Arthritis',
                      'Vision Impairment', 'Hearing Impairment', 'Mobility Issues', 'None'
                    ].map(condition => (
                      <label key={condition} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.health_conditions?.includes(condition)}
                          onChange={() => handleMultiSelect('health_conditions', condition)}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translate('Disabilities')}
                  </label>
                  <div className="space-y-2">
                    {[
                      'Physical Disability', 'Visual Impairment', 'Hearing Impairment',
                      'Speech Impairment', 'Mental Disability', 'None'
                    ].map(disability => (
                      <label key={disability} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.disabilities?.includes(disability)}
                          onChange={() => handleMultiSelect('disabilities', disability)}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{disability}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {translate('Complete Your Profile')}
            </h1>
            <span className="text-sm text-gray-500">
              {translate('Step')} {currentStep} {translate('of')} {totalSteps}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit}>
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-4 w-4 inline mr-2" />
                {translate('Previous')}
              </button>

              <button
                type="submit"
                disabled={!canProceed() || loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {translate('Saving...')}
                  </div>
                ) : currentStep === totalSteps ? (
                  <>
                    {translate('Complete Setup')}
                    <Check className="h-4 w-4 inline ml-2" />
                  </>
                ) : (
                  <>
                    {translate('Next')}
                    <ArrowRight className="h-4 w-4 inline ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
