"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Mail, CheckCircle2, Phone, Check, ChevronsUpDown, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { validatePasswordCriteria, calculatePasswordStrength, getPasswordCriteriaText } from "@/utils/passwordValidation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { validatePhoneNumber } from "@/utils/phoneValidation";
import HCaptcha from "@hcaptcha/react-hcaptcha";

// Common country codes for mobile numbers
const COUNTRY_CODES = [
  { code: "+1", country: "US/Canada" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "India" },
  { code: "+86", country: "China" },
  { code: "+81", country: "Japan" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+39", country: "Italy" },
  { code: "+34", country: "Spain" },
  { code: "+61", country: "Australia" },
  { code: "+27", country: "South Africa" },
  { code: "+55", country: "Brazil" },
  { code: "+52", country: "Mexico" },
  { code: "+92", country: "Pakistan" },
  { code: "+971", country: "UAE" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+65", country: "Singapore" },
  { code: "+60", country: "Malaysia" },
  { code: "+62", country: "Indonesia" },
  { code: "+84", country: "Vietnam" },
  { code: "+66", country: "Thailand" },
  { code: "+63", country: "Philippines" },
  { code: "+82", country: "South Korea" },
  { code: "+7", country: "Russia/Kazakhstan" },
  { code: "+90", country: "Turkey" },
  { code: "+20", country: "Egypt" },
  { code: "+234", country: "Nigeria" },
  { code: "+254", country: "Kenya" },
  { code: "+212", country: "Morocco" },
  { code: "+351", country: "Portugal" },
  { code: "+31", country: "Netherlands" },
  { code: "+32", country: "Belgium" },
  { code: "+41", country: "Switzerland" },
  { code: "+46", country: "Sweden" },
  { code: "+47", country: "Norway" },
  { code: "+45", country: "Denmark" },
  { code: "+358", country: "Finland" },
  { code: "+48", country: "Poland" },
  { code: "+36", country: "Hungary" },
  { code: "+40", country: "Romania" },
  { code: "+30", country: "Greece" },
];

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  // Password validation state
  const passwordCriteria = validatePasswordCriteria(password);
  const passwordStrength = calculatePasswordStrength(password);
  
  // hCaptcha state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = React.useRef<any>(null);
  const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "";
  
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSignupSuccess(false);

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const criteria = validatePasswordCriteria(password);
    const missingCriteria = getPasswordCriteriaText(criteria);
    
    if (missingCriteria.length > 0) {
      setError(`Password must meet all requirements: ${missingCriteria.join(", ")}`);
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    // Validate mobile number if provided
    if (mobile.trim()) {
      const phoneValidation = validatePhoneNumber(mobile, countryCode);
      if (!phoneValidation.valid) {
        setError(phoneValidation.error || "Invalid mobile number");
        return;
      }
    }

    // Check if captcha is verified (only if site key is configured)
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError("Please complete the captcha verification");
      return;
    }

    setIsLoading(true);

    const result = await signUp(email, password, username, mobile.trim() || undefined, countryCode, captchaToken || undefined);
    
    if (result.success) {
      // Reset captcha after successful signup
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
        setCaptchaToken(null);
      }
      setSignupSuccess(true);
    } else {
      // Reset captcha on error so user can try again
      if (captchaRef.current && result.error?.toLowerCase().includes('captcha')) {
        captchaRef.current.resetCaptcha();
        setCaptchaToken(null);
      }
      setError(result.error || "Signup failed");
    }
    
    setIsLoading(false);
  };

  // Show success message after signup
  if (signupSuccess) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="Stockkeyper" 
                className="max-h-48 h-auto w-auto object-contain"
                style={{ minHeight: '120px', maxWidth: '100%' }}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Mail className="h-16 w-16 text-primary" />
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Account created successfully!</strong>
                  <br />
                  Please check your email ({email}) and click the verification link to activate your account.
                  <br />
                  <br />
                  If you don't see the email, check your spam folder.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setSignupSuccess(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setUsername("");
                  setMobile("");
                  setCountryCode("+1");
                }}
                variant="outline"
                className="w-full"
              >
                Sign Up Another Account
              </Button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
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
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Stockkeyper" 
              className="max-h-32 h-auto w-auto object-contain"
              style={{ minHeight: '80px' }}
            />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Sign up to start managing your inventory data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mobile Number <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <div className="flex gap-2">
                <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryCodeOpen}
                      className="w-[180px] justify-between"
                      disabled={isLoading}
                    >
                      {countryCode
                        ? `${countryCode} (${COUNTRY_CODES.find((item) => item.code === countryCode)?.country || ""})`
                        : "Select country..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search country or code..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {COUNTRY_CODES.map((item) => (
                            <CommandItem
                              key={item.code}
                              value={`${item.code} ${item.country}`}
                              onSelect={() => {
                                setCountryCode(item.code);
                                setCountryCodeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  countryCode === item.code
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="font-medium">{item.code}</span>
                              <span className="ml-2 text-muted-foreground">
                                {item.country}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, "");
                    setMobile(value);
                  }}
                  placeholder="1234567890"
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>
              {mobile && (
                <p className="text-xs text-muted-foreground">
                  Full number: {countryCode}{mobile}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter your mobile number (digits only, without country code)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={cn(
                    password && passwordStrength.score < 2 && "border-orange-500",
                    password && passwordStrength.score >= 2 && passwordStrength.score < 4 && "border-yellow-500",
                    password && passwordStrength.score === 4 && "border-green-500"
                  )}
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
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Strength:</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          passwordStrength.color === "red" && "bg-red-500",
                          passwordStrength.color === "orange" && "bg-orange-500",
                          passwordStrength.color === "yellow" && "bg-yellow-500",
                          passwordStrength.color === "blue" && "bg-blue-500",
                          passwordStrength.color === "green" && "bg-green-500"
                        )}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-semibold",
                      passwordStrength.color === "red" && "text-red-500",
                      passwordStrength.color === "orange" && "text-orange-500",
                      passwordStrength.color === "yellow" && "text-yellow-500",
                      passwordStrength.color === "blue" && "text-blue-500",
                      passwordStrength.color === "green" && "text-green-500"
                    )}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  
                  {/* Password Criteria */}
                  <div className="space-y-1 text-xs">
                    <div className={cn("flex items-center gap-2", passwordCriteria.hasLowercase ? "text-green-600" : "text-gray-500")}>
                      {passwordCriteria.hasLowercase ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>Lowercase letter (a-z)</span>
                    </div>
                    <div className={cn("flex items-center gap-2", passwordCriteria.hasUppercase ? "text-green-600" : "text-gray-500")}>
                      {passwordCriteria.hasUppercase ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>Uppercase letter (A-Z)</span>
                    </div>
                    <div className={cn("flex items-center gap-2", passwordCriteria.hasNumber ? "text-green-600" : "text-gray-500")}>
                      {passwordCriteria.hasNumber ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>Number (0-9)</span>
                    </div>
                    <div className={cn("flex items-center gap-2", passwordCriteria.hasSpecialChar ? "text-green-600" : "text-gray-500")}>
                      {passwordCriteria.hasSpecialChar ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>Special character (!@#$%...)</span>
                    </div>
                    <div className={cn("flex items-center gap-2", passwordCriteria.hasMinLength ? "text-green-600" : "text-gray-500")}>
                      {passwordCriteria.hasMinLength ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      <span>At least 8 characters</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={cn(
                    confirmPassword && password !== confirmPassword && "border-red-500",
                    confirmPassword && password === confirmPassword && "border-green-500"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-2 text-xs">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* hCaptcha */}
            {HCAPTCHA_SITE_KEY && (
              <div className="flex justify-center items-center py-4 w-full">
                <div className="w-full max-w-[400px] flex justify-center">
                  <div className="transform scale-110 origin-center">
                    <HCaptcha
                      ref={captchaRef}
                      sitekey={HCAPTCHA_SITE_KEY}
                      size="normal"
                      theme="light"
                      onVerify={(token: string) => setCaptchaToken(token)}
                      onError={() => {
                        setError("Captcha verification failed. Please try again.");
                        setCaptchaToken(null);
                      }}
                      onExpire={() => {
                        setCaptchaToken(null);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading || (HCAPTCHA_SITE_KEY && !captchaToken)}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
