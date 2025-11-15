"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { showError } from "@/utils/toast";

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  const { signIn, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a verification message from ProtectedRoute
    if (location.state?.message) {
      setVerificationMessage(location.state.message);
      setShowVerificationAlert(true);
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowVerificationAlert(false);
    setIsLoading(true);

    const result = await signIn(usernameOrEmail, password);
    
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Login failed");
      
      // Check if the error is about email verification
      if (result.error?.toLowerCase().includes("verify") || 
          result.error?.toLowerCase().includes("verification") ||
          result.error?.toLowerCase().includes("email")) {
        setShowVerificationAlert(true);
        // Try to extract email from the input
        const email = usernameOrEmail.includes('@') ? usernameOrEmail : '';
        setUserEmail(email);
      }
    }
    
    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    if (!userEmail && !usernameOrEmail.includes('@')) {
      showError("Please enter your email address to resend verification email.");
      return;
    }

    setIsResendingVerification(true);
    try {
      const email = userEmail || (usernameOrEmail.includes('@') ? usernameOrEmail : '');
      
      if (!email) {
        showError("Please enter your email address.");
        setIsResendingVerification(false);
        return;
      }

      const result = await resendVerificationEmail(email);
      
      if (result.success) {
        setShowVerificationAlert(false);
      } else {
        setError(result.error || "Failed to resend verification email.");
      }
    } catch (error) {
      console.error("Error resending verification:", error);
      showError("An unexpected error occurred. Please try again.");
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to access your inventory data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {showVerificationAlert && (
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <div className="space-y-3">
                    <p className="font-semibold">Email Verification Required</p>
                    <p className="text-sm">
                      {verificationMessage || "Please verify your email address before signing in. Check your inbox for the verification link."}
                    </p>
                    <div className="flex flex-col gap-2">
                      {!userEmail && !usernameOrEmail.includes('@') && (
                        <div className="space-y-2">
                          <Label htmlFor="verification-email" className="text-sm text-orange-700 dark:text-orange-300">
                            Enter your email to resend verification:
                          </Label>
                          <Input
                            id="verification-email"
                            type="email"
                            placeholder="your@email.com"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            disabled={isResendingVerification}
                            className="bg-white dark:bg-gray-900"
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={isResendingVerification || isLoading}
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                      >
                        {isResendingVerification ? (
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
                      <Link to="/verify-email" className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-sm text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                        >
                          Go to Verification Page
                        </Button>
                      </Link>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {error && !showVerificationAlert && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail">Username or Email</Label>
              <Input
                id="usernameOrEmail"
                type="text"
                placeholder="Enter username or email address"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <Link 
              to="/forgot-password" 
              className="text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link 
              to="/signup" 
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
