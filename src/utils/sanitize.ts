import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed by default
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes plain text by escaping HTML entities
 * This is safer for user-generated content that should be displayed as plain text
 * @param text - The text to sanitize
 * @returns Sanitized text safe for rendering
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Escape HTML entities
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitizes a URL to prevent javascript: and data: protocol attacks
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Only allow http, https, and relative URLs
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' || parsedUrl.protocol === '') {
      return url;
    }
    return '';
  } catch {
    // If URL parsing fails, check if it's a relative URL
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }
    return '';
  }
}

/**
 * Sanitizes user input for safe display
 * Removes potentially dangerous characters and escapes HTML
 * @param input - The user input to sanitize
 * @returns Sanitized input safe for display
 */
export function sanitizeUserInput(input: string | null | undefined): string {
  if (!input) return '';
  return sanitizeText(input).trim();
}
