"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { User, Camera, Save, ArrowLeft, Phone, Check, ChevronsUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const ProfileSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("+1");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [mobileError, setMobileError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          // Try to get username, avatar_url, mobile, and country_code
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, mobile, country_code')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching profile:', { code: error.code, message: error.message });
            // If some columns don't exist, try with fewer fields
            const { data: usernameData, error: usernameError } = await supabase
              .from('profiles')
              .select('username, mobile, country_code')
              .eq('id', user.id)
              .maybeSingle();

            if (usernameError) {
              console.error('Error fetching username:', { code: usernameError.code, message: usernameError.message });
              // Last resort: try just username
              const { data: basicData, error: basicError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .maybeSingle();

              if (basicError) {
                console.error('Error fetching basic profile:', { code: basicError.code, message: basicError.message });
                showError('Failed to load profile data. Please run the database setup script.');
              } else {
                setUsername(basicData?.username || '');
                setAvatarUrl('');
                setMobile('');
                setCountryCode('+1');
              }
            } else {
              setUsername(usernameData?.username || '');
              setAvatarUrl('');
              setMobile(usernameData?.mobile || '');
              setCountryCode(usernameData?.country_code || '+1');
            }
          } else {
            setUsername(data?.username || '');
            setAvatarUrl(data?.avatar_url || '');
            setMobile(data?.mobile || '');
            setCountryCode(data?.country_code || '+1');
          }
        } catch (error) {
          console.error('Error fetching profile:', error instanceof Error ? error.message : 'Unknown error');
          showError('Failed to load profile data');
        } finally {
          setIsLoading(false);
        }
      }
      
      if (user?.email) {
        setEmail(user.email);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    setMobile(value);
    
    // Clear error when user starts typing
    if (mobileError) {
      setMobileError("");
    }
    
    // Real-time validation if mobile number is provided
    if (value.trim()) {
      const phoneValidation = validatePhoneNumber(value, countryCode);
      if (!phoneValidation.valid) {
        setMobileError(phoneValidation.error || 'Invalid mobile number');
      } else {
        setMobileError("");
      }
    } else {
      setMobileError("");
    }
  };

  const handleCountryCodeChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    
    // Re-validate mobile number when country code changes
    if (mobile.trim()) {
      const phoneValidation = validatePhoneNumber(mobile, newCountryCode);
      if (!phoneValidation.valid) {
        setMobileError(phoneValidation.error || 'Invalid mobile number');
      } else {
        setMobileError("");
      }
    }
  };

  const formatMobileNumber = (mobile: string, countryCode: string): string => {
    if (!mobile) return '';
    return `${countryCode}${mobile}`;
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      showError('User not authenticated');
      return;
    }

    if (!username.trim()) {
      showError('Username is required');
      return;
    }

    // Validate mobile number if provided
    if (mobile.trim()) {
      const phoneValidation = validatePhoneNumber(mobile, countryCode);
      if (!phoneValidation.valid) {
        showError(phoneValidation.error || 'Invalid mobile number');
        return;
      }
    }

    setIsSaving(true);
    const loadingToastId = showLoading('Updating profile...');

    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      let error;
      
      if (existingProfile) {
        // Profile exists, use update
        let updateData: any = {
          username: username.trim(),
        };

        // Only include avatar_url if it exists
        if (avatarUrl) {
          updateData.avatar_url = avatarUrl;
        }

        // Always include mobile and country_code in update (even if empty, to clear them)
        // This ensures mobile number can always be updated or cleared
        updateData.mobile = mobile.trim() || null;
        updateData.country_code = mobile.trim() ? countryCode : null;

        const updateResponse = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);
        
        error = updateResponse.error;
      } else {
        // Profile doesn't exist, use insert
        let insertData: any = {
          id: user.id,
          username: username.trim(),
          email: user.email
        };

        // Only include avatar_url if it exists
        if (avatarUrl) {
          insertData.avatar_url = avatarUrl;
        }

        // Include mobile and country_code if mobile is provided
        if (mobile.trim()) {
          insertData.mobile = mobile.trim();
          insertData.country_code = countryCode;
        } else {
          // Set to null if not provided (allows clearing later)
          insertData.mobile = null;
          insertData.country_code = null;
        }

        const insertResponse = await supabase
          .from('profiles')
          .insert(insertData);
        
        error = insertResponse.error;
      }

      if (error) {
        console.error('Error updating profile:', { code: error.code, message: error.message });
        
        // Handle specific error cases
        if (error.code === '23505') {
          showError('Username already exists. Please choose a different username.');
        } else if (error.code === '42501') {
          showError('Permission denied. Please run "supabase_fix_profiles_rls.sql" in your Supabase SQL Editor to fix RLS policies.');
        } else if (error.message?.includes('mobile') || error.message?.includes('country_code')) {
          // If mobile/country_code columns don't exist, try without them
          if (existingProfile) {
            let fallbackData: any = {
              username: username.trim(),
            };
            if (avatarUrl) {
              fallbackData.avatar_url = avatarUrl;
            }
            const { error: fallbackError } = await supabase
              .from('profiles')
              .update(fallbackData)
              .eq('id', user.id);

            if (fallbackError) {
              if (fallbackError.code === '23505') {
                showError('Username already exists. Please choose a different username.');
              } else {
                showError('Failed to update profile. Please run "supabase_add_mobile_to_profiles.sql" to add mobile number support.');
              }
            } else {
              showSuccess('Profile updated successfully! (Mobile number not available - please run database setup)');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          }
          return;
        } else if (error.message?.includes('avatar_url')) {
          // If avatar_url column doesn't exist, try without it
          if (existingProfile) {
            const { error: usernameError } = await supabase
              .from('profiles')
              .update({ username: username.trim() })
              .eq('id', user.id);

            if (usernameError) {
              if (usernameError.code === '23505') {
                showError('Username already exists. Please choose a different username.');
              } else {
                showError('Failed to update profile. Please run the database setup script.');
              }
            } else {
              showSuccess('Profile updated successfully! (Avatar upload not available - please run database setup)');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          } else {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: username.trim(),
                email: user.email
              });

            if (insertError) {
              if (insertError.code === '23505') {
                showError('Username already exists. Please choose a different username.');
              } else {
                showError('Failed to create profile. Please run the database setup script.');
              }
            } else {
              showSuccess('Profile created successfully! (Avatar upload not available - please run database setup)');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          }
        } else {
          showError(`Failed to update profile: ${error.message || 'Unknown error'}`);
        }
      } else {
        showSuccess('Profile updated successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating profile:', error instanceof Error ? error.message : 'Unknown error');
      showError('Failed to update profile');
    } finally {
      dismissToast(loadingToastId);
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    const loadingToastId = showLoading('Uploading avatar...');

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true // Replace existing file if user uploads again
        });

      if (uploadError) {
        console.error('Error uploading avatar:', { message: uploadError.message });
        
        // Check if it's a bucket not found error
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
          showError('Avatar storage not configured. Please run the database setup script to create the avatars bucket.');
        } else {
          showError('Failed to upload avatar. Please check your storage configuration.');
        }
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      showSuccess('Avatar uploaded successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error instanceof Error ? error.message : 'Unknown error');
      showError('Failed to upload avatar. Please run the database setup script.');
    } finally {
      dismissToast(loadingToastId);
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Back Button */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt="Profile" />
                <AvatarFallback className="text-lg">
                  {getInitials(username || email)}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new avatar
              </p>
              {isUploading && (
                <p className="text-xs text-blue-600 mt-1">Uploading...</p>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed in the welcome message and can be used for login
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mobile Number
              </Label>
              <div className="flex gap-2">
                <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryCodeOpen}
                      className="w-[180px] justify-between"
                      disabled={isSaving}
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
                                handleCountryCodeChange(item.code);
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
                  onChange={handleMobileChange}
                  placeholder="1234567890"
                  disabled={isSaving}
                  className={cn("flex-1", mobileError && "border-red-500 focus-visible:ring-red-500")}
                />
              </div>
              {mobileError && (
                <p className="text-xs text-red-500">
                  {mobileError}
                </p>
              )}
              {mobile && !mobileError && (
                <p className="text-xs text-muted-foreground">
                  Full number: {formatMobileNumber(mobile, countryCode)}
                </p>
              )}
              {!mobileError && (
                <p className="text-xs text-muted-foreground">
                  Enter your mobile number (digits only, without country code)
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving || !username.trim() || !!mobileError}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
