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
import { User, Camera, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfileSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          // First try to get username and avatar_url
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();

          if (error) {
            
            // If avatar_url column doesn't exist, try just username
            const { data: usernameData, error: usernameError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', user.id)
              .single();

            if (usernameError) {
              console.error('Error fetching username:', usernameError);
              showError('Failed to load profile data. Please run the database setup script.');
            } else {
              setUsername(usernameData?.username || '');
              setAvatarUrl(''); // No avatar_url column available
            }
          } else {
            setUsername(data?.username || '');
            setAvatarUrl(data?.avatar_url || '');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
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

  const handleSaveProfile = async () => {
    if (!user?.id) {
      showError('User not authenticated');
      return;
    }

    if (!username.trim()) {
      showError('Username is required');
      return;
    }

    setIsSaving(true);
    const loadingToastId = showLoading('Updating profile...');

    try {
      // Try to update with avatar_url first
      let updateData: any = {
        id: user.id,
        username: username.trim(),
        email: user.email
      };

      // Only include avatar_url if it exists
      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updateData);

      if (error) {
        console.error('Error updating profile:', error);
        
        // If avatar_url column doesn't exist, try without it
        if (error.message.includes('avatar_url')) {
          const { error: usernameError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              username: username.trim(),
              email: user.email
            });

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
        } else if (error.code === '23505') {
          showError('Username already exists. Please choose a different username.');
        } else {
          showError('Failed to update profile');
        }
      } else {
        showSuccess('Profile updated successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        
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
      console.error('Error uploading avatar:', error);
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
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving || !username.trim()}
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
