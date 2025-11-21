// Phone number validation rules by country code
export interface PhoneValidationRule {
  minLength: number;
  maxLength: number;
  pattern?: RegExp;
}

export const PHONE_VALIDATION_RULES: Record<string, PhoneValidationRule> = {
  "+1": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // US/Canada
  "+44": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // UK
  "+91": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // India
  "+86": { minLength: 11, maxLength: 11, pattern: /^[0-9]{11}$/ }, // China
  "+81": { minLength: 10, maxLength: 11, pattern: /^[0-9]{10,11}$/ }, // Japan
  "+49": { minLength: 10, maxLength: 11, pattern: /^[0-9]{10,11}$/ }, // Germany
  "+33": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // France
  "+39": { minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ }, // Italy
  "+34": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Spain
  "+61": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Australia
  "+27": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // South Africa
  "+55": { minLength: 10, maxLength: 11, pattern: /^[0-9]{10,11}$/ }, // Brazil
  "+52": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Mexico
  "+92": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Pakistan
  "+971": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // UAE
  "+966": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Saudi Arabia
  "+65": { minLength: 8, maxLength: 8, pattern: /^[0-9]{8}$/ }, // Singapore
  "+60": { minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ }, // Malaysia
  "+62": { minLength: 9, maxLength: 11, pattern: /^[0-9]{9,11}$/ }, // Indonesia
  "+84": { minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ }, // Vietnam
  "+66": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Thailand
  "+63": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Philippines
  "+82": { minLength: 9, maxLength: 11, pattern: /^[0-9]{9,11}$/ }, // South Korea
  "+7": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Russia/Kazakhstan
  "+90": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Turkey
  "+20": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Egypt
  "+234": { minLength: 10, maxLength: 11, pattern: /^[0-9]{10,11}$/ }, // Nigeria
  "+254": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Kenya
  "+212": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Morocco
  "+351": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Portugal
  "+31": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Netherlands
  "+32": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Belgium
  "+41": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Switzerland
  "+46": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Sweden
  "+47": { minLength: 8, maxLength: 8, pattern: /^[0-9]{8}$/ }, // Norway
  "+45": { minLength: 8, maxLength: 8, pattern: /^[0-9]{8}$/ }, // Denmark
  "+358": { minLength: 9, maxLength: 10, pattern: /^[0-9]{9,10}$/ }, // Finland
  "+48": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Poland
  "+36": { minLength: 9, maxLength: 9, pattern: /^[0-9]{9}$/ }, // Hungary
  "+40": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Romania
  "+30": { minLength: 10, maxLength: 10, pattern: /^[0-9]{10}$/ }, // Greece
};

export function validatePhoneNumber(mobile: string, countryCode: string): { valid: boolean; error?: string } {
  if (!mobile || !mobile.trim()) {
    return { valid: false, error: "Mobile number is required" };
  }

  // Remove any non-digit characters
  const digitsOnly = mobile.replace(/\D/g, "");

  if (!digitsOnly) {
    return { valid: false, error: "Mobile number must contain digits" };
  }

  const rule = PHONE_VALIDATION_RULES[countryCode];
  
  if (!rule) {
    // Default validation if country code not found
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { valid: false, error: "Mobile number must be between 7 and 15 digits" };
    }
    return { valid: true };
  }

  // Check length
  if (digitsOnly.length < rule.minLength) {
    return { 
      valid: false, 
      error: `Mobile number must be at least ${rule.minLength} digits for ${countryCode}` 
    };
  }

  if (digitsOnly.length > rule.maxLength) {
    return { 
      valid: false, 
      error: `Mobile number must be at most ${rule.maxLength} digits for ${countryCode}` 
    };
  }

  // Check pattern if provided
  if (rule.pattern && !rule.pattern.test(digitsOnly)) {
    return { 
      valid: false, 
      error: `Invalid mobile number format for ${countryCode}` 
    };
  }

  return { valid: true };
}

