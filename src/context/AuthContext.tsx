"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>('user'); // Default to 'user'

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        setIsAdmin(false);
        return;
      }

      const role = data?.role || 'user';
      setUserRole(role);
      setIsAdmin(role === 'admin');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch role in background without blocking
          fetchUserRole(session.user.id).catch(error => {
            console.error("Error fetching user role:", error);
            setUserRole('user');
            setIsAdmin(false);
          });
        }
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch role in background without blocking
          fetchUserRole(session.user.id).catch(error => {
            console.error("Error fetching user role:", error);
            setUserRole('user');
            setIsAdmin(false);
          });
        } else {
          setUserRole(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // First, sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Update the profile with username
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
          // Don't fail the signup if profile update fails
        }
      }

      showSuccess("Account created successfully! Please check your email to verify your account.");
      return { success: true };
    } catch (error) {
      console.error("Error during sign up:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Check if input is an email (contains @) or username
      let email = usernameOrEmail;
      
      if (!usernameOrEmail.includes('@')) {
        // It's a username, look up the email
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', usernameOrEmail)
          .single();

        if (profileError || !profileData?.email) {
          return { success: false, error: "Username not found" };
        }
        
        email = profileData.email;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });


      if (error) {
        return { success: false, error: error.message };
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

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
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

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      showSuccess("Password reset email sent! Check your inbox.");
      return { success: true };
    } catch (error) {
      console.error("Error during password reset:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      return { success: false, error: errorMessage };
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
