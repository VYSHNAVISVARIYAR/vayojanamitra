// Production-ready form validation utilities

export const validationRules = {
  required: (value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Minimum ${min} characters required`;
    }
    return null;
  },
  
  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Maximum ${max} characters allowed`;
    }
    return null;
  },
  
  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(value.replace(/[\s-]/g, ''))) {
      return 'Please enter a valid 10-digit phone number';
    }
    return null;
  },
  
  age: (value) => {
    if (!value) return null;
    const age = parseInt(value);
    if (isNaN(age) || age < 0 || age > 120) {
      return 'Please enter a valid age (0-120)';
    }
    return null;
  },
  
  income: (value) => {
    if (!value) return null;
    const income = parseFloat(value);
    if (isNaN(income) || income < 0) {
      return 'Please enter a valid income amount';
    }
    return null;
  },
  
  aadhaar: (value) => {
    if (!value) return null;
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(value.replace(/[\s-]/g, ''))) {
      return 'Please enter a valid 12-digit Aadhaar number';
    }
    return null;
  },
  
  pincode: (value) => {
    if (!value) return null;
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(value)) {
      return 'Please enter a valid 6-digit pincode';
    }
    return null;
  }
};

export const validateField = (value, rules) => {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
};

export const validateForm = (formData, schema) => {
  const errors = {};
  const isValid = true;
  
  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(formData[field], rules);
    if (error) {
      errors[field] = error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Common validation schemas
export const commonSchemas = {
  login: {
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.minLength(6)]
  },
  
  register: {
    full_name: [validationRules.required, validationRules.minLength(2)],
    email: [validationRules.required, validationRules.email],
    phone: [validationRules.required, validationRules.phone],
    password: [validationRules.required, validationRules.minLength(6)],
    confirm_password: [
      validationRules.required,
      (value) => {
        // This will be handled in the component to compare with password
        return null;
      }
    ]
  },
  
  profile: {
    full_name: [validationRules.required, validationRules.minLength(2)],
    age: [validationRules.required, validationRules.age],
    phone: [validationRules.required, validationRules.phone],
    income_annual: [validationRules.required, validationRules.income],
    district: [validationRules.required],
    address: [validationRules.required, validationRules.minLength(10)]
  }
};

export default {
  validationRules,
  validateField,
  validateForm,
  commonSchemas
};
