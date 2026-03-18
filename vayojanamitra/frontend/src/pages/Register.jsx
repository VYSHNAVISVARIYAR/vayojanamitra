import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  AlertCircle,
  CheckCircle,
  Heart,
  Shield,
  Users,
  Check,
  X
} from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Calculate password strength
    if (name === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const result = await register(formData.email, formData.fullName, formData.password);
    
    if (result.success) {
      // Store registration info for profile setup
      localStorage.setItem('registrationEmail', formData.email);
      localStorage.setItem('registrationName', formData.fullName);
      navigate('/profile/setup');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const features = [
    { icon: Heart, text: "Senior Citizen Welfare" },
    { icon: Shield, text: "Government Schemes" },
    { icon: Users, text: "Community Support" }
  ];

  const passwordRequirements = [
    { text: "At least 6 characters", met: formData.password.length >= 6 },
    { text: "Contains uppercase & lowercase", met: /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) },
    { text: "Contains numbers", met: /\d/.test(formData.password) },
    { text: "Contains special characters", met: /[^a-zA-Z\d]/.test(formData.password) }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-6 flex items-center">
              <Heart className="mr-4 h-12 w-12" />
              VayoJanaMitra
            </h1>
            <p className="text-2xl text-teal-100 leading-relaxed">
              Empowering Kerala's Senior Citizens with Welfare Schemes
            </p>
          </div>
          
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Join Our Community</h2>
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  <feature.icon className="h-8 w-8 text-teal-200" />
                </div>
                <p className="text-xl leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-teal-100">
            <p className="text-lg leading-relaxed">
              "Create your account today and unlock access to exclusive welfare schemes and benefits"
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
        <div className="absolute bottom-10 left-10 w-56 h-56 bg-white opacity-5 rounded-full"></div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center">
              <Heart className="mr-3 h-10 w-10 text-teal-600" />
              VayoJanaMitra
            </h1>
            <p className="text-lg text-gray-600 mt-3">Senior Citizen Welfare Portal</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Create Account
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                Join us to access Kerala welfare schemes
              </p>
            </div>
            
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <div className="flex items-center p-5 bg-red-50 border-2 border-red-200 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-600 mr-4" />
                  <p className="text-red-700 text-base font-medium">{error}</p>
                </div>
              )}
              
              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="block text-lg font-semibold text-gray-800 mb-3">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className={`h-6 w-6 transition-colors ${
                      focusedField === 'fullName' ? 'text-teal-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className={`block w-full pl-12 pr-4 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      focusedField === 'fullName' 
                        ? 'border-teal-500 ring-teal-500 bg-teal-50' 
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                    }`}
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField('')}
                  />
                </div>
              </div>
              
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-lg font-semibold text-gray-800 mb-3">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className={`h-6 w-6 transition-colors ${
                      focusedField === 'email' ? 'text-teal-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`block w-full pl-12 pr-4 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      focusedField === 'email' 
                        ? 'border-teal-500 ring-teal-500 bg-teal-50' 
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                    }`}
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField('')}
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-lg font-semibold text-gray-800 mb-3">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-6 w-6 transition-colors ${
                      focusedField === 'password' ? 'text-teal-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={`block w-full pl-12 pr-14 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      focusedField === 'password' 
                        ? 'border-teal-500 ring-teal-500 bg-teal-50' 
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                    }`}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                    ) : (
                      <Eye className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-medium text-gray-700">Password strength</span>
                      <span className={`text-base font-bold ${
                        passwordStrength <= 2 ? 'text-red-600' : 
                        passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-lg font-semibold text-gray-800 mb-3">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-6 w-6 transition-colors ${
                      focusedField === 'confirmPassword' ? 'text-teal-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`block w-full pl-12 pr-14 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      focusedField === 'confirmPassword' 
                        ? 'border-teal-500 ring-teal-500 bg-teal-50' 
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                    }`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField('')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                    ) : (
                      <Eye className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2">
                    {formData.password === formData.confirmPassword ? (
                      <div className="flex items-center text-green-600 text-base font-medium">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Passwords match
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 text-base font-medium">
                        <X className="h-4 w-4 mr-2" />
                        Passwords do not match
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="bg-teal-50 rounded-xl p-4 border-2 border-teal-200">
                  <p className="text-base font-semibold text-gray-800 mb-3">Password requirements:</p>
                  <div className="space-y-2">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center text-base">
                        {req.met ? (
                          <Check className="h-4 w-4 text-green-600 mr-3" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 mr-3" />
                        )}
                        <span className={`font-medium ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || formData.password !== formData.confirmPassword || formData.password.length < 6}
                className="w-full flex justify-center items-center py-4 px-6 border-2 border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-3 border-white mr-3"></div>
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-3" />
                    Create account
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-6 border-t-2 border-gray-200">
                <span className="text-base text-gray-700">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-teal-600 hover:text-teal-700">
                    Sign in here
                  </Link>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
