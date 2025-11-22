export interface PasswordCriteria {
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: "Very Weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: "red" | "orange" | "yellow" | "blue" | "green";
}

export function validatePasswordCriteria(password: string): PasswordCriteria {
  return {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    hasMinLength: password.length >= 8,
  };
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Very Weak", color: "red" };
  }

  const criteria = validatePasswordCriteria(password);
  let score = 0;

  // Count criteria met
  if (criteria.hasLowercase) score++;
  if (criteria.hasUppercase) score++;
  if (criteria.hasNumber) score++;
  if (criteria.hasSpecialChar) score++;
  if (criteria.hasMinLength) score++;

  // Adjust score based on length
  if (password.length >= 12) score = Math.min(score + 1, 5);
  if (password.length >= 16) score = Math.min(score + 1, 5);

  // Cap at 4 for the label system
  score = Math.min(score, 4);

  const strengthMap: PasswordStrength[] = [
    { score: 0, label: "Very Weak", color: "red" },
    { score: 1, label: "Weak", color: "orange" },
    { score: 2, label: "Fair", color: "yellow" },
    { score: 3, label: "Good", color: "blue" },
    { score: 4, label: "Strong", color: "green" },
  ];

  return strengthMap[score] || strengthMap[0];
}

export function getPasswordCriteriaText(criteria: PasswordCriteria): string[] {
  const messages: string[] = [];
  
  if (!criteria.hasLowercase) {
    messages.push("At least one lowercase letter (a-z)");
  }
  if (!criteria.hasUppercase) {
    messages.push("At least one uppercase letter (A-Z)");
  }
  if (!criteria.hasNumber) {
    messages.push("At least one number (0-9)");
  }
  if (!criteria.hasSpecialChar) {
    messages.push("At least one special character (!@#$%^&*...)");
  }
  if (!criteria.hasMinLength) {
    messages.push("At least 8 characters long");
  }
  
  return messages;
}

