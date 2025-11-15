"use client";

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

const EmailVerification = () => {
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "expired">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Supabase email verification uses hash fragments in the URL
        // Check for hash fragments first (e.g., #access_token=...&type=...)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        
        // Check for error parameters in hash (e.g., #error=access_denied&error_code=otp_expired)
        const error = hashParams.get("error");
        const errorCode = hashParams.get("error_code");
        const errorDescription = hashParams.get("error_description");
        
        // If we have tokens in hash, try to set the session first
        // This is the proper way to handle Supabase email verification
        if (accessToken && refreshToken) {
          // Set the session using the tokens from the hash
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            // Check if the error is due to expired token
            if (sessionError.message.includes("expired") || 
                sessionError.message.includes("invalid") || 
                errorCode === "otp_expired" ||
                errorCode === "expired_token") {
              setStatus("expired");
              setErrorMessage("This verification link has expired. Please request a new verification email.");
            } else {
              setStatus("error");
              setErrorMessage(sessionError.message || "Verification failed. Please try again.");
            }
            return;
          }

          // Check if email is now confirmed
          if (sessionData?.session?.user?.email_confirmed_at) {
            setStatus("success");
            showSuccess("Email verified successfully! You can now log in.");
            
            // Redirect to login after a short delay
            setTimeout(() => {
              navigate("/login");
            }, 2000);
            return;
          }

          // If session was set but email not confirmed yet, wait a bit and check
          checkIntervalRef.current = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user?.email_confirmed_at) {
              if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setStatus("success");
              showSuccess("Email verified successfully! You can now log in.");
              
              // Redirect to login after a short delay
              setTimeout(() => {
                navigate("/login");
              }, 2000);
            }
          }, 500);

          // Timeout after 10 seconds
          timeoutRef.current = setTimeout(() => {
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            setStatus((currentStatus) => {
              if (currentStatus === "verifying") {
                return "error";
              }
              return currentStatus;
            });
            setErrorMessage("Verification timed out. Please try clicking the link again or request a new verification email.");
          }, 10000);
          return;
        }
        
        // Handle error cases if no tokens found
        if (error || errorCode) {
          if (errorCode === "otp_expired" || errorCode === "expired_token") {
            setStatus("expired");
            setErrorMessage("This verification link has expired. Please request a new verification email.");
          } else if (error === "access_denied") {
            setStatus("expired");
            setErrorMessage("This verification link is invalid or has expired. Please request a new verification email.");
          } else {
            setStatus("error");
            setErrorMessage(errorDescription || error || "Verification failed. Please try again.");
          }
          return;
        }
        
        // Also check query parameters as fallback
        const token = searchParams.get("token");
        const verificationType = searchParams.get("type") || type;

        // If we have token and type in query params, use verifyOtp
        if (token && verificationType) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: verificationType as any,
          });

          if (error) {
            // Check if the error is due to expired token
            if (error.message.includes("expired") || error.message.includes("invalid") || error.message.includes("otp_expired")) {
              setStatus("expired");
              setErrorMessage("This verification link has expired. Please request a new verification email.");
            } else {
              setStatus("error");
              setErrorMessage(error.message || "Failed to verify email. Please try again.");
            }
            return;
          }

          if (data.user) {
            setStatus("success");
            showSuccess("Email verified successfully! You can now log in.");
            
            // Redirect to login after a short delay
            setTimeout(() => {
              navigate("/login");
            }, 2000);
          } else {
            setStatus("error");
            setErrorMessage("Verification failed. Please try again.");
          }
          return;
        }

        // No valid verification parameters found
        setStatus("error");
        setErrorMessage("Invalid verification link. Missing required parameters.");
      } catch (error) {
        console.error("Error verifying email:", error);
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    };

    verifyEmail();

    // Cleanup function
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [searchParams, navigate]);

  // Initialize email from URL or user session
  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) {
      setResendEmail(emailFromUrl);
    } else if (user?.email) {
      setResendEmail(user.email);
    }
  }, [searchParams, user]);

  // Also check if user becomes verified via AuthContext
  useEffect(() => {
    if (user?.email_confirmed_at && status === "verifying") {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setStatus("success");
      showSuccess("Email verified successfully! You can now log in.");
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  }, [user, status, navigate]);

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      
      // Try to get email from multiple sources
      let email = searchParams.get("email") || resendEmail.trim();
      
      // If not in URL or input, try to get from current session
      if (!email && user?.email) {
        email = user.email;
      }

      if (!email) {
        showError("Please enter your email address.");
        setIsResending(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError("Please enter a valid email address.");
        setIsResending(false);
        return;
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        showError(error.message || "Failed to resend verification email.");
      } else {
        showSuccess("Verification email sent! Please check your inbox.");
        setStatus("verifying");
        setResendEmail(""); // Clear the input
      }
    } catch (error) {
      console.error("Error resending verification:", error);
      showError("An unexpected error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            {status === "verifying" && "Verifying your email address..."}
            {status === "success" && "Your email has been verified!"}
            {status === "error" && "Verification failed"}
            {status === "expired" && "Verification link expired"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "verifying" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <Alert>
                <AlertDescription className="text-center">
                  Your email has been successfully verified! Redirecting to login...
                </AlertDescription>
              </Alert>
              <Link to="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          )}

          {(status === "error" || status === "expired") && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <Alert variant="destructive">
                <AlertDescription className="text-center">{errorMessage}</AlertDescription>
              </Alert>
              <div className="flex flex-col gap-4 w-full">
                {(!searchParams.get("email") && !user?.email) && (
                  <div className="space-y-2 w-full">
                    <Label htmlFor="resend-email">Email Address</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      disabled={isResending}
                    />
                  </div>
                )}
                <Button 
                  onClick={handleResendVerification} 
                  variant="outline" 
                  className="w-full"
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
                <Link to="/signup">
                  <Button variant="ghost" className="w-full">
                    Back to Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;

