"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

const Index = () => {
  const { isLoadingData } = useData();
  const { user } = useAuth();

  // Track page navigation
  useEffect(() => {
    localStorage.setItem('lastVisitedPage', 'home');
  }, []);
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  
  // Set initial username from email as fallback
  useEffect(() => {
    if (user?.email && !username) {
      setUsername(user.email.split('@')[0] || 'User');
    }
  }, [user?.email, username]);
  
  // Fetch username from profiles table
  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        setIsLoadingUsername(true);
        try {
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
            } else {
              setUsername(usernameData?.username || '');
              setAvatarUrl(''); // No avatar_url column available
            }
          } else {
            setUsername(data?.username || '');
            setAvatarUrl(data?.avatar_url || '');
          }
        } catch (error) {
          console.error('Error fetching username:', error);
        } finally {
          setIsLoadingUsername(false);
        }
      } else {
      }
    };
    
    // Add a small delay to ensure user object is fully loaded
    const timeoutId = setTimeout(fetchUsername, 100);
    return () => clearTimeout(timeoutId);
  }, [user?.id]);

  const getUserInitials = () => {
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Personalized Welcome Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                  Welcome to Inventory Data
                </h2>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Manage your Stock with ease.
                </p>
              </div>
            </div>
            
            {/* Profile Photo and Greeting */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-blue-200 dark:border-blue-700">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
                ) : (
                  <AvatarFallback className="text-lg font-semibold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-lg font-medium text-blue-800 dark:text-blue-200">
                {isLoadingUsername ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading profile...</span>
                  </div>
                ) : username ? (
                  <>Hello, <span className="text-blue-600 dark:text-blue-400 font-semibold">{username}</span>! 👋</>
                ) : (
                  <>Hello, <span className="text-blue-600 dark:text-blue-400 font-semibold">User</span>! 👋</>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Card */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose what you'd like to do
            </CardDescription>
          </CardHeader>
        <CardContent className="grid gap-4">
          <Link to="/entry-form">
            <Button className="w-full">Go to Entry Form</Button>
          </Link>
          <Link to="/stock-data">
            <Button variant="outline" className="w-full">View Stock Data</Button>
          </Link>
          <Link to="/database">
            <Button variant="outline" className="w-full">Browse All Data</Button>
          </Link>
          <Link to="/profile-settings">
            <Button variant="secondary" className="w-full flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile Settings
            </Button>
          </Link>
          {/* <Link to="/manage-data">
            <Button variant="secondary" className="w-full">Manage Data</Button>
          </Link> */}
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;