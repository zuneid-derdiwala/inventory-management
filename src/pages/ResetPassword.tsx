"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if there's a valid session for password reset
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          setError("Invalid or expired reset link. Please request a new password reset.");
          setIsValidSession(false);
        } else if (session?.user) {
          setIsValidSession(true);
        } else {
          setError("Invalid or expired reset link. Please request a new password reset.");
          setIsValidSession(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setError("Invalid or expired reset link. Please request a new password reset.");
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6 sm:p-8">
            <div className="flex items-center space-x-2 text-sm sm:text-base">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying reset link...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-red-600">Invalid Reset Link</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Alert variant="destructive">
              <AlertDescription>
                {error || "The password reset link is invalid or has expired. Please request a new password reset."}
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
              <Link to="/forgot-password">
                <Button className="w-full px-4 py-3 text-sm sm:text-base touch-manipulation">
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="w-full px-4 py-3 text-sm sm:text-base touch-manipulation">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              Password Reset Successfully
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your password has been updated successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Alert>
              <AlertDescription>
                You can now log in with your new password.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
              <Link to="/login">
                <Button className="w-full px-4 py-3 text-sm sm:text-base touch-manipulation">
                  Go to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base font-medium">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="text-sm sm:text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="text-sm sm:text-base"
              />
            </div>
            
            <Button type="submit" className="w-full px-4 py-3 text-sm sm:text-base touch-manipulation" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <Link 
              to="/login" 
              className="text-primary hover:underline"
            >
              <ArrowLeft className="inline mr-1 h-3 w-3" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
