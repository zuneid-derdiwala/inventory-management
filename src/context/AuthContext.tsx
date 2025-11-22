"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { validateEmail } from "@/utils/emailValidation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  signUp: (email: string, password: string, username: string, mobile?: string, countryCode?: string, captchaToken?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (usernameOrEmail: string, password: string, captchaToken?: string) => Promise<{ success: boolean; error?: string; email?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>('user'); // Default to 'user'
  const loginTimeRef = useRef<number | null>(null);
  const timeoutCheckRef = useRef<NodeJS.Timeout | null>(null);
  const userRef = useRef<User | null>(null);
  
  // 12 hours in milliseconds
  const SESSION_TIMEOUT = 12 * 60 * 60 * 1000;

  // Ensure profile exists for the user
  // Note: The database trigger should create the profile automatically
  // This function waits for the trigger and updates username if needed
  const ensureProfileExists = async (userId: string, email?: string): Promise<boolean> => {
    try {
      // Wait for the trigger to create the profile (retry up to 3 times)
      let existingProfile = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!existingProfile && attempts < maxAttempts) {
        // Wait progressively longer on each attempt
        await new Promise(resolve => setTimeout(resolve, 500 * (attempts + 1)));
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is expected if profile doesn't exist
          console.error('Error checking profile:', error);
          break;
        }

        if (data) {
          existingProfile = data;
          break;
        }

        attempts++;
      }

      if (!existingProfile) {
        // Profile still doesn't exist after waiting
        // The trigger should have created it, but if not, we can't insert due to RLS
        // This is okay - the profile will be created when the user verifies email and logs in
        // Or the trigger will create it eventually
        console.debug('Profile not found after waiting for trigger. It may be created later.');
        return false;
      }

      // Profile exists, update username if it's missing
      if (!existingProfile.username && email) {
        const username = email.split('@')[0];
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ username: username })
          .eq('id', userId);

        if (updateError) {
          // If update fails due to RLS, that's okay - username can be set later
          console.debug('Could not update profile username (may be RLS):', updateError.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      return false;
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() to handle missing profiles

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user'); // Default to 'user' if error
        setIsAdmin(false);
        return;
      }

      const role = data?.role || 'user';
      setUserRole(role);
      setIsAdmin(role === 'admin');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user'); // Default to 'user' on error
      setIsAdmin(false);
    }
  };

  // Sign out function (defined early so it can be used in timeout check)
  const handleSignOut = async () => {
    try {
      setLoading(true);
      loginTimeRef.current = null; // Clear login time on logout
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
      const { error } = await supabase.auth.signOut();
      if (error) {
        showError("Error signing out: " + error.message);
      } else {
        showSuccess("Signed out successfully");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      showError("An error occurred while signing out");
    } finally {
      setLoading(false);
    }
  };

  // Update user ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Check if session has expired (12 hours)
  const checkSessionTimeout = useCallback(async () => {
    if (!loginTimeRef.current || !userRef.current) return;
    
    const now = Date.now();
    const timeSinceLogin = now - loginTimeRef.current;
    
    if (timeSinceLogin >= SESSION_TIMEOUT) {
      // Session expired, logout user
      console.log("Session expired after 12 hours, logging out...");
      loginTimeRef.current = null;
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
      try {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
        setIsAdmin(false);
        showError("Your session has expired after 12 hours. Please log in again.");
      } catch (error) {
        console.error("Error signing out on timeout:", error);
      }
    }
  }, []); // No dependencies needed since we use refs

  useEffect(() => {
    // Check if this is a password recovery session on initial load
    const checkPasswordRecovery = async () => {
      // Check for hash fragments indicating password recovery
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get("type");
        if (type === "recovery") {
          console.log("Password recovery detected in hash on initial load");
          // Redirect to reset password page
          window.location.href = `/reset-password${hash}`;
          return;
        }
      }
      
      // Also check if we have a session but we're on homepage - might be password recovery
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && window.location.pathname === "/" && !session.user.email_confirmed_at) {
        // Check if this might be a password recovery session
        // Password recovery sessions are temporary and unverified
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get("type") === "recovery" || session.user.recovery_sent_at) {
          console.log("Password recovery session detected, redirecting to reset-password");
          window.location.href = `/reset-password${window.location.hash || ""}`;
          return;
        }
      }
    };
    
    checkPasswordRecovery();

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      } else {
        // Check if this is a password recovery session
        const hash = window.location.hash;
        const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;
        const isPasswordRecovery = hashParams?.get("type") === "recovery";
        const currentPath = window.location.pathname;
        
        // IMPORTANT: Check if email is verified before setting the session
        // BUT allow password recovery sessions (they are temporary and unverified)
        if (session?.user && !session.user.email_confirmed_at && !isPasswordRecovery) {
          // Only allow unverified users on signup or verification pages
          // Sign them out if they're trying to access other pages (including login)
          if (currentPath !== '/verify-email' && currentPath !== '/signup' && currentPath !== '/reset-password') {
            console.log("Signing out unverified user on initial load - email not confirmed");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
            setIsAdmin(false);
            loginTimeRef.current = null;
            setLoading(false);
            return;
          }
        }
        
        // If password recovery and on homepage, redirect to reset-password
        if (isPasswordRecovery && currentPath === "/") {
          console.log("Password recovery detected, redirecting to reset-password");
          window.location.href = `/reset-password${hash}`;
          return;
        }

        // Only set session if email is verified (or user is on signup/verification/reset-password pages)
        // Allow password recovery sessions (they are temporary)
        if (session?.user && !session.user.email_confirmed_at && !isPasswordRecovery) {
          const currentPath = window.location.pathname;
          // Don't set session for unverified users unless on signup/verification/reset-password pages
          if (currentPath !== '/verify-email' && currentPath !== '/signup' && currentPath !== '/reset-password') {
            setLoading(false);
            return;
          }
        }

        // Set session (including password recovery sessions)
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Only proceed if email is verified OR it's a password recovery session
          if (!session.user.email_confirmed_at && !isPasswordRecovery) {
            const currentPath = window.location.pathname;
            if (currentPath !== '/verify-email' && currentPath !== '/signup' && currentPath !== '/reset-password') {
              setLoading(false);
              return;
            }
          }
          
          // Store login time when session is established
          loginTimeRef.current = Date.now();
          
          // Ensure profile exists for the user
          ensureProfileExists(session.user.id, session.user.email).then(() => {
            // Fetch role in background after ensuring profile exists
            fetchUserRole(session.user.id).catch(error => {
              console.error("Error fetching user role:", error);
              setUserRole('user');
              setIsAdmin(false);
            });
          }).catch(error => {
            console.error("Error ensuring profile exists:", error);
            // Still try to fetch role
            fetchUserRole(session.user.id).catch(error => {
              console.error("Error fetching user role:", error);
              setUserRole('user');
              setIsAdmin(false);
            });
          });
        } else {
          loginTimeRef.current = null;
        }
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentPath = window.location.pathname;
        const isVerificationPage = currentPath === '/verify-email';
        const isSignupPage = currentPath === '/signup';
        const isResetPasswordPage = currentPath === '/reset-password';
        
        // Handle password recovery event - allow session for password reset
        if (event === 'PASSWORD_RECOVERY' && session?.user) {
          console.log("Password recovery event detected");
          // Allow session to be set for password recovery
          setSession(session);
          setUser(session.user);
          setLoading(false);
          // Redirect to reset password page if not already there
          if (!isResetPasswordPage) {
            window.location.href = `/reset-password${window.location.hash}`;
          }
          return;
        }
        
        // During email verification, allow the session to be set even if not verified yet
        // The verification page will handle the verification process
        if (isVerificationPage && event === 'SIGNED_IN') {
          // Allow session to be set during verification
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            loginTimeRef.current = Date.now();
            // Ensure profile exists
            ensureProfileExists(session.user.id, session.user.email).then(() => {
              fetchUserRole(session.user.id).catch(() => {
                setUserRole('user');
                setIsAdmin(false);
              });
            });
          }
          setLoading(false);
          return;
        }
        
        // IMPORTANT: Check if email is verified before setting the session
        // Always sign out users with unverified emails (except during email verification flow and password recovery)
        if (session?.user && !session.user.email_confirmed_at) {
          // Only allow unverified users on signup, verification, or reset password pages
          // Sign them out if they're trying to access other pages (including login)
          if (!isVerificationPage && !isSignupPage && !isResetPasswordPage) {
            console.log("Signing out unverified user - email not confirmed");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
            setIsAdmin(false);
            loginTimeRef.current = null;
            setLoading(false);
            
            // If they were trying to login, show an error message
            if (currentPath === '/login') {
              showError("Please verify your email address before signing in. Check your inbox for the verification link.");
            }
            return;
          }
        }

        // Only set session if email is verified (or user is on signup/verification pages)
        if (session?.user && !session.user.email_confirmed_at) {
          // Don't set session for unverified users unless on signup/verification pages
          if (!isVerificationPage && !isSignupPage) {
            setLoading(false);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Only proceed if email is verified (or on signup/verification pages)
          if (!session.user.email_confirmed_at) {
            if (!isVerificationPage && !isSignupPage) {
              setLoading(false);
              return;
            }
          }
          
          // Store login time when new session is established
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            loginTimeRef.current = Date.now();
          }
          
          // Ensure profile exists for the user
          ensureProfileExists(session.user.id, session.user.email).then(() => {
            // Fetch role in background after ensuring profile exists
            fetchUserRole(session.user.id).catch(error => {
              console.error("Error fetching user role:", error);
              setUserRole('user');
              setIsAdmin(false);
            });
          }).catch(error => {
            console.error("Error ensuring profile exists:", error);
            // Still try to fetch role
            fetchUserRole(session.user.id).catch(error => {
              console.error("Error fetching user role:", error);
              setUserRole('user');
              setIsAdmin(false);
            });
          });
        } else {
          setUserRole(null);
          setIsAdmin(false);
          loginTimeRef.current = null;
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Only run once on mount

  // Set up interval to check session timeout every 5 minutes
  useEffect(() => {
    // Only set up if user is logged in
    if (user) {
      // Clear any existing interval first
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
      }
      // Check immediately on mount/change
      checkSessionTimeout();
      // Then check every 5 minutes
      timeoutCheckRef.current = setInterval(() => {
        checkSessionTimeout();
      }, 5 * 60 * 1000); // Check every 5 minutes
    } else {
      // Clear interval if user is not logged in
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
    }

    return () => {
      if (timeoutCheckRef.current) {
        clearInterval(timeoutCheckRef.current);
        timeoutCheckRef.current = null;
      }
    };
  }, [user, checkSessionTimeout]); // Re-run when user changes

  // Also check timeout when user returns to the page (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current && loginTimeRef.current) {
        // Check timeout immediately when user returns to the page
        checkSessionTimeout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkSessionTimeout]);

  const signUp = async (email: string, password: string, username: string, mobile?: string, countryCode?: string, captchaToken?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Validate email format and check for dummy emails
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }
      
      // First, sign up the user with email confirmation required
      const signUpOptions: any = {
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            username: username.trim(),
          },
        },
      };
      
      // Add captcha token if provided
      if (captchaToken) {
        signUpOptions.options.captchaToken = captchaToken;
      }
      
      const { data, error } = await supabase.auth.signUp(signUpOptions);

      if (error) {
        // Check if the error is about captcha
        if (error.message.includes('captcha') || error.message.includes('Captcha') || 
            error.code === 'captcha_failed' || error.message.includes('sitekey-secret-mismatch')) {
          return { 
            success: false, 
            error: "Captcha verification failed. Please complete the captcha again and try signing up." 
          };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        // The database trigger should create the profile automatically
        // We just need to update it with the username and mobile
        // Wait a moment for the trigger to run
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Prepare update data
        const updateData: any = { 
          username: username.trim(),
          role: 'user'
        };

        // Add mobile and country_code if provided
        if (mobile && mobile.trim() && countryCode) {
          updateData.mobile = mobile.trim();
          updateData.country_code = countryCode;
        }
        
        // Try to update the profile with username and mobile
        // The trigger creates it with just id and email, so we update it
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', data.user.id);

        if (updateError) {
          // If update fails, the profile might not exist yet or RLS is blocking
          // Try to insert it (will fail if RLS blocks, but that's okay - trigger will handle it)
          console.log("Profile update failed, trigger should create it:", updateError.message);
          
          // Don't fail signup - the trigger will create the profile
          // Username and mobile can be set later when user verifies email and logs in
        }

        // IMPORTANT: Sign out the user immediately if email is not verified
        // This prevents users from accessing the app without email verification
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
        }
      }

      // Don't show success toast here - let the Signup page handle the UI
      return { success: true };
    } catch (error) {
      console.error("Error during sign up:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (usernameOrEmail: string, password: string, captchaToken?: string): Promise<{ success: boolean; error?: string; email?: string }> => {
    try {
      setLoading(true);
      
      // Trim the input
      const trimmedInput = usernameOrEmail.trim();
      
      if (!trimmedInput) {
        return { success: false, error: "Please enter your username or email" };
      }
      
      // Check if input is an email (contains @) or username
      let email = trimmedInput;
      let isEmail = trimmedInput.includes('@');
      
      if (!isEmail) {
        // It's a username, look up the email using RPC function (bypasses RLS)
        try {
          const { data: emailFromRPC, error: rpcError } = await supabase.rpc('get_email_by_username', {
            username_input: trimmedInput
          });

          if (rpcError) {
            console.error('Error looking up username via RPC:', rpcError);
            // Fallback to direct query if RPC function doesn't exist
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', trimmedInput)
              .maybeSingle();

            if (profileError) {
              // Check if it's an RLS error
              if (profileError.code === '42501' || profileError.message.includes('row-level security')) {
                return { 
                  success: false, 
                  error: "Username lookup is blocked. Please run 'supabase_username_lookup_function.sql' in your Supabase dashboard, or use your email address to sign in." 
                };
              }
              return { 
                success: false, 
                error: `Unable to look up username: ${profileError.message}. Please try logging in with your email address.` 
              };
            } else if (profileData?.email) {
              email = profileData.email;
            } else {
              return { 
                success: false, 
                error: "Username not found. Please check your username or try logging in with your email address." 
              };
            }
          } else if (emailFromRPC) {
            email = emailFromRPC;
          } else {
            return { 
              success: false, 
              error: "Username not found. Please check your username or try logging in with your email address." 
            };
          }
        } catch (error) {
          console.error('Error in username lookup:', error);
          return { 
            success: false, 
            error: "Error looking up username. Please try logging in with your email address." 
          };
        }
      }
      
      const signInOptions: any = {
        email,
        password,
      };
      
      // Add captcha token if provided
      if (captchaToken) {
        signInOptions.options = {
          captchaToken,
        };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword(signInOptions);

      if (error) {
        // Check if the error is about captcha
        if (error.message.includes('captcha') || error.message.includes('Captcha') || 
            error.code === 'captcha_failed' || error.message.includes('sitekey-secret-mismatch')) {
          return { 
            success: false, 
            error: "Captcha verification failed. Please complete the captcha again and try logging in." 
          };
        }
        
        // Check if the error is about email verification
        if (error.message.includes('Email not confirmed') || 
            error.message.toLowerCase().includes('email not confirmed') ||
            error.message.toLowerCase().includes('email verification')) {
          return { 
            success: false, 
            error: "Please verify your email address before signing in. Check your inbox for the verification link.",
            email: email // Return the email so Login component can use it for resending verification
          };
        }
        
        // Provide more user-friendly error messages for other errors
        if (error.message.includes('Invalid login credentials')) {
          if (!isEmail) {
            return { success: false, error: "Invalid username or password. Please check your credentials." };
          }
          return { success: false, error: "Invalid email or password. Please check your credentials." };
        }
        return { success: false, error: error.message };
      }

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        // Sign out the user since email is not verified
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: "Please verify your email address before signing in. Check your inbox for the verification link.",
          email: email // Return the email so Login component can use it for resending verification
        };
      }

      // Ensure profile exists for the user
      if (data.user) {
        await ensureProfileExists(data.user.id, data.user.email);
      }

      showSuccess("Welcome back!");
      const result = { success: true };
      return result;
    } catch (error) {
      console.error("Error during sign in:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = handleSignOut;

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate email format
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }

      const trimmedEmail = email.trim();
      
      // Check if email exists in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (profileError) {
        console.error("Error checking profile:", profileError);
        // If there's an RLS error, we might still try to send the reset email
        // as the email might exist in auth.users even if we can't check profiles
      }

      // If profile doesn't exist, tell user to sign up
      if (!profileData || !profileData.email) {
        return { 
          success: false, 
          error: "No account found with this email address. Please sign up to create an account." 
        };
      }

      const redirectUrl = `${window.location.origin}/reset-password`;

      console.log("Sending password reset email to:", trimmedEmail);
      console.log("Redirect URL:", redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Password reset error:", error);
        
        // Provide more helpful error messages
        if (error.message?.includes("rate limit") || error.message?.includes("too many")) {
          return { success: false, error: "Too many requests. Please wait a few minutes before trying again." };
        }
        
        return { success: false, error: error.message || "Failed to send password reset email. Please check your Supabase email configuration." };
      }

      // Even if there's no error, Supabase might not send email if:
      // 1. Email sending is not configured
      // 2. Redirect URL is not whitelisted
      
      console.log("Password reset email sent successfully");
      showSuccess("Password reset email sent! Please check your inbox (and spam folder).");
      return { success: true };
    } catch (error) {
      console.error("Error during password reset:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Validate email format
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        return { success: false, error: error.message || "Failed to resend verification email." };
      }

      showSuccess("Verification email sent! Please check your inbox (and spam folder).");
      return { success: true };
    } catch (error) {
      console.error("Error resending verification email:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        userRole,
        signUp,
        signIn,
        signOut,
        resetPassword,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
