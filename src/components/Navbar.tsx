"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Loader2, LogOut, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "./ThemeToggle";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const isMobile = useIsMobile();
  const { isLoadingData } = useData();
  const { user, signOut, isAdmin } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle() to handle missing profiles

          if (error) {
            console.error('Error fetching profile:', error);
            // Set fallback username from email
            if (user?.email) {
              setUsername(user.email.split('@')[0] || 'User');
            }
            setAvatarUrl('');
            return;
          }

          if (data) {
            setUsername(data.username || '');
            setAvatarUrl(data.avatar_url || '');
          } else {
            // Profile doesn't exist, use email as fallback
            if (user?.email) {
              setUsername(user.email.split('@')[0] || 'User');
            }
            setAvatarUrl('');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Set fallback username from email
          if (user?.email) {
            setUsername(user.email.split('@')[0] || 'User');
          }
        }
      }
      
      // Set fallback username from email if still not set
      if (user?.email && !username) {
        setUsername(user.email.split('@')[0] || 'User');
      }
    };

    fetchProfile();
  }, [user?.id, user?.email]);

  const navLinks = [
    { name: "Entry Form", path: "/entry-form" },
    { name: "Stock Data", path: "/stock-data" },
    { name: "Manage Data", path: "/manage-data" },
    { name: "Manage Booking Persons", path: "/manage-booking-persons" },
    ...(isAdmin ? [
      { name: "Database", path: "/database" },
      { name: "Users", path: "/manage-users" }
    ] : []),
  ];

  const renderNavLinks = (closeSheet = false) => (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.name}
          to={link.path}
          onClick={() => closeSheet && setIsSheetOpen(false)}
          className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.name}
        </Link>
      ))}
    </>
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link 
              to="/" 
              onClick={() => setIsSheetOpen(false)}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <img 
                src="/logo.png" 
                alt="Stockkeyper" 
                className="h-20 w-auto object-contain"
                style={{ minHeight: '60px', maxHeight: '80px' }}
              />
            </Link>
            {renderNavLinks(true)}
            <div className="mt-4 flex flex-col gap-2">
              <ThemeToggle />
              {user && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {getUserInitials()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{username || user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/profile-settings" onClick={() => setIsSheetOpen(false)}>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleSignOut();
                        setIsSheetOpen(false);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <img 
            src="/logo.png" 
            alt="Stockkeyper" 
            className="h-20 w-auto object-contain"
            style={{ minHeight: '60px', maxHeight: '80px' }}
          />
        </Link>
        {renderNavLinks()}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {isLoadingData && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        <ThemeToggle />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{username || user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile-settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Navbar;