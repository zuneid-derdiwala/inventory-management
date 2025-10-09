"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await resetPassword(email);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Failed to send reset email");
    }
    
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-green-600">Check Your Email</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              We've sent a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Alert>
              <AlertDescription>
                Please check your email and click the link to reset your password. 
                If you don't see the email, check your spam folder.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
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

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your email address and we'll send you a link to reset your password
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
              <Label htmlFor="email" className="text-sm sm:text-base font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="text-sm sm:text-base"
              />
            </div>
            
            <Button type="submit" className="w-full px-4 py-3 text-sm sm:text-base touch-manipulation" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
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

export default ForgotPassword;
