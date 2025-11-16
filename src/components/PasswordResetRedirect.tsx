"use client";

import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Component that handles password reset redirects
 * When Supabase redirects to homepage with password reset hash fragments,
 * this component redirects to the reset-password page
 */
const PasswordResetRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    const checkAndRedirect = () => {
      // Check for password reset hash fragments in the URL
      const hash = window.location.hash;
      if (!hash) return false;
      
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      
      console.log("PasswordResetRedirect - Checking hash:", { 
        type, 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        pathname: location.pathname,
        fullHash: hash.substring(0, 50) + "..."
      });
      
      // If we're not already on the reset-password page and we have recovery tokens
      if (type === "recovery" && accessToken && refreshToken && location.pathname !== "/reset-password") {
        console.log("PasswordResetRedirect - Redirecting to /reset-password with hash");
        hasRedirected.current = true;
        // Use window.location for immediate redirect to preserve hash
        window.location.href = `/reset-password${hash}`;
        return true; // Indicates redirect happened
      }
      return false;
    };

    // Check immediately on mount
    const redirected = checkAndRedirect();
    if (redirected) return;

    // Also check after a short delay (in case hash is added after initial render)
    const timeoutId = setTimeout(() => {
      if (!hasRedirected.current) {
        checkAndRedirect();
      }
    }, 100);

    // Also listen for hash changes
    const handleHashChange = () => {
      if (!hasRedirected.current) {
        checkAndRedirect();
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [navigate, location.pathname]);

  return null; // This component doesn't render anything
};

export default PasswordResetRedirect;

