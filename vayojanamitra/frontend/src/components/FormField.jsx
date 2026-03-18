import React from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  helperText,
  showPasswordToggle = false,
  options = [], // For select/checkbox/radio
  multiple = false, // For select
  rows = 4, // For textarea
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasError = error && touched;
  
  const baseClasses = `
    w-full px-4 py-3 rounded-lg border transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-red-500 bg-red-50' 
      : isFocused 
        ? 'border-blue-500 bg-white' 
        : 'border-gray-300 bg-white hover:border-gray-400'
    }
    ${className}
  `;
  
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={baseClasses}
            {...props}
          />
        );
        
      case 'select':
        return (
          <select
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={() => setIsFocused(true)}
            required={required}
            disabled={disabled}
            multiple={multiple}
            className={`${baseClasses} ${multiple ? 'py-2' : ''}`}
            {...props}
          >
            <option value="" disabled>{placeholder || `Select ${label.toLowerCase()}`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name={name}
              checked={value}
              onChange={onChange}
              onBlur={onBlur}
              required={required}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              {...props}
            />
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={onChange}
                  onBlur={onBlur}
                  required={required}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  {...props}
                />
                <label className="text-sm font-medium text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );
        
      default:
        return (
          <div className="relative">
            <input
              type={inputType}
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              onFocus={() => setIsFocused(true)}
              placeholder={placeholder}
              required={required}
              disabled={disabled}
              className={baseClasses}
              {...props}
            />
            {type === 'password' && showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className={`space-y-1 ${className}`}>
        {renderInput()}
        {helperText && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
        {hasError && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && type !== 'radio' && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {renderInput()}
      
      {helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      
      {hasError && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
