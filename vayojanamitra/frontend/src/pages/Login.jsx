import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  CheckCircle,
  Heart,
  Shield,
  Users
} from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Check for success message from profile setup
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      if (result.user.is_profile_complete) {
        navigate('/home');
      } else {
        navigate('/profile/setup');
      }
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
            <h2 className="text-3xl font-semibold">Why Choose Us?</h2>
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
              "A comprehensive platform connecting senior citizens with government welfare schemes"
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
        <div className="absolute bottom-10 left-10 w-56 h-56 bg-white opacity-5 rounded-full"></div>
      </div>

      {/* Right Panel - Login Form */}
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
                Welcome Back
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                Sign in to access your welfare schemes dashboard
              </p>
            </div>
            
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Success Message */}
              {successMessage && (
                <div className="flex items-center p-5 bg-green-50 border-2 border-green-200 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-4" />
                  <p className="text-green-700 text-base font-medium">{successMessage}</p>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="flex items-center p-5 bg-red-50 border-2 border-red-200 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-600 mr-4" />
                  <p className="text-red-700 text-base font-medium">{error}</p>
                </div>
              )}
              
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
                    autoComplete="current-password"
                    required
                    className={`block w-full pl-12 pr-14 py-4 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      focusedField === 'password' 
                        ? 'border-teal-500 ring-teal-500 bg-teal-50' 
                        : 'border-gray-300 focus:border-teal-500 bg-white'
                    }`}
                    placeholder="Enter your password"
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
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link to="/forgot-password" className="text-base text-teal-600 hover:text-teal-700 font-medium">
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 border-2 border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-3 border-white mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-3" />
                    Sign in
                  </>
                )}
              </button>

              {/* Register Link */}
              <div className="text-center pt-6 border-t-2 border-gray-200">
                <span className="text-base text-gray-700">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700">
                    Create one here
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

export default Login;
