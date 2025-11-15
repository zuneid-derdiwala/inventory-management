/**
 * Email validation utility to detect and block dummy/invalid emails
 */

// Common dummy email domains and patterns
const DUMMY_EMAIL_DOMAINS = [
  'example.com',
  'test.com',
  'test.test',
  'dummy.com',
  'fake.com',
  'invalid.com',
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'mohmal.com',
  'sharklasers.com',
  'trashmail.com',
];

// Common dummy email patterns
const DUMMY_EMAIL_PATTERNS = [
  /^test@/i,
  /^dummy@/i,
  /^fake@/i,
  /^invalid@/i,
  /^temp@/i,
  /^tmp@/i,
  /^123@/i,
  /^abc@/i,
  /^xyz@/i,
  /@test\./i,
  /@dummy\./i,
  /@fake\./i,
];

/**
 * Validates if an email is a valid format
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if an email is a dummy/invalid email
 */
export function isDummyEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return true;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email format is valid
  if (!isValidEmailFormat(normalizedEmail)) {
    return true;
  }

  // Extract domain
  const domain = normalizedEmail.split('@')[1];
  if (!domain) {
    return true;
  }

  // Check against known dummy domains
  if (DUMMY_EMAIL_DOMAINS.some(dummyDomain => domain === dummyDomain || domain.endsWith(`.${dummyDomain}`))) {
    return true;
  }

  // Check against dummy email patterns
  if (DUMMY_EMAIL_PATTERNS.some(pattern => pattern.test(normalizedEmail))) {
    return true;
  }

  // Check for common invalid patterns
  if (
    normalizedEmail.includes('..') ||
    normalizedEmail.startsWith('.') ||
    normalizedEmail.startsWith('@') ||
    normalizedEmail.endsWith('.') ||
    normalizedEmail.endsWith('@')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates email and returns error message if invalid
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  if (!isValidEmailFormat(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  if (isDummyEmail(email)) {
    return { valid: false, error: 'Please use a real email address. Dummy or test emails are not allowed.' };
  }

  return { valid: true };
}


