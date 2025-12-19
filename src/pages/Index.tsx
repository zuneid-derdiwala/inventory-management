"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, User, Smartphone, ShoppingCart, TrendingUp, Package, Users, BarChart3, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sanitizeUrl, sanitizeUserInput } from "@/utils/sanitize";

const Index = () => {
  const { isLoadingData } = useData();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Check for password recovery session and redirect
  useEffect(() => {
    // Check for password recovery hash fragments
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get("type");
      if (type === "recovery") {
        navigate(`/reset-password${hash}`, { replace: true });
        return;
      }
    }
    
    // Check if user has unverified email and might be password recovery
    if (user && !user.email_confirmed_at) {
      const hash = window.location.hash;
      const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;
      if (hashParams?.get("type") === "recovery") {
        navigate(`/reset-password${hash}`, { replace: true });
        return;
      }
    }
  }, [user, navigate]);

  // Track page navigation
  useEffect(() => {
    localStorage.setItem('lastVisitedPage', 'home');
  }, []);
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalBooked: 0,
    totalInStock: 0,
    totalSold: 0,
    totalRevenue: 0,
    totalInvestment: 0,
    recentEntries: 0,
    topBookingPersons: [] as { name: string; count: number }[],
    topBrands: [] as { name: string; count: number }[],
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  
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
            .maybeSingle(); // Use maybeSingle() to handle missing profiles
          
          if (error) {
            console.error('Error fetching profile:', { code: error.code, message: error.message });
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
          console.error('Error fetching username:', error instanceof Error ? error.message : 'Unknown error');
          // Set fallback username from email
          if (user?.email) {
            setUsername(user.email.split('@')[0] || 'User');
          }
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

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) {
        setIsLoadingAnalytics(false);
        return;
      }

      try {
        setIsLoadingAnalytics(true);
        
        // Build base query - only fetch columns needed for analytics
        let entriesQuery = supabase
          .from("entries")
          .select(`
            booking_person_id,
            booking_persons:booking_person_id(name),
            brand_id,
            brands:brand_id(name),
            outward_date,
            outward_amount,
            inward_amount,
            inward_date
          `);

        // Filter by user_id if not admin
        if (!isAdmin) {
          entriesQuery = entriesQuery.eq('user_id', user.id);
        }

        // Filter out soft-deleted entries
        entriesQuery = entriesQuery.eq('is_deleted', false);

        const { data: entries, error } = await entriesQuery;

        if (error) {
          console.error('Error fetching analytics:', { code: error.code, message: error.message });
          setIsLoadingAnalytics(false);
          return;
        }

        if (!entries || entries.length === 0) {
          setAnalytics({
            totalBooked: 0,
            totalInStock: 0,
            totalSold: 0,
            totalRevenue: 0,
            totalInvestment: 0,
            recentEntries: 0,
            topBookingPersons: [],
            topBrands: [],
          });
          setIsLoadingAnalytics(false);
          return;
        }

        // Pre-calculate date threshold once
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Single pass through entries for all calculations
        let totalBooked = 0;
        let totalInStock = 0;
        let totalSold = 0;
        let totalRevenue = 0;
        let totalInvestment = 0;
        let recentEntries = 0;
        const bookingPersonMap = new Map<string, number>();
        const brandMap = new Map<string, number>();

        entries.forEach(e => {
          // Count booked
          if (e.booking_person_id || e.booking_persons?.name) {
            totalBooked++;
          }

          // Count in stock vs sold
          if (e.outward_date) {
            totalSold++;
          } else {
            totalInStock++;
          }

          // Sum revenue
          if (e.outward_amount) {
            const amount = parseFloat(e.outward_amount?.toString() || '0') || 0;
            totalRevenue += amount;
          }

          // Sum investment
          if (e.inward_amount) {
            const amount = parseFloat(e.inward_amount?.toString() || '0') || 0;
            totalInvestment += amount;
          }

          // Count recent entries
          if (e.inward_date) {
            const inwardDate = new Date(e.inward_date);
            inwardDate.setHours(0, 0, 0, 0);
            if (inwardDate >= sevenDaysAgo) {
              recentEntries++;
            }
          }

          // Track booking persons
          const bookingPersonName = e.booking_persons?.name || e.booking_person;
          if (bookingPersonName) {
            bookingPersonMap.set(bookingPersonName, (bookingPersonMap.get(bookingPersonName) || 0) + 1);
          }

          // Track brands
          const brandName = e.brands?.name || e.brand;
          if (brandName) {
            brandMap.set(brandName, (brandMap.get(brandName) || 0) + 1);
          }
        });

        // Get top booking persons
        const topBookingPersons = Array.from(bookingPersonMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Get top brands
        const topBrands = Array.from(brandMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setAnalytics({
          totalBooked,
          totalInStock,
          totalSold,
          totalRevenue,
          totalInvestment,
          recentEntries,
          topBookingPersons,
          topBrands,
        });
      } catch (error) {
        console.error('Error calculating analytics:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [user?.id, isAdmin]);

  const getUserInitials = () => {
    if (username) {
      const sanitized = sanitizeUserInput(username);
      return sanitized.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      const sanitized = sanitizeUserInput(user.email);
      return sanitized.substring(0, 2).toUpperCase();
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
    <div className="flex flex-1 p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Personalized Welcome Section */}
        <Card className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-800 border-0 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <CardContent className="p-4 sm:p-6 md:p-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 break-words">
                    Welcome to Inventory Data
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-white/90">
                    Manage your Stock with ease.
                  </p>
                </div>
              </div>
              
              {/* Profile Photo and Greeting */}
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 sm:border-4 border-white/30 shadow-xl flex-shrink-0">
                  {avatarUrl ? (
                    <AvatarImage src={sanitizeUrl(avatarUrl)} alt="Profile" className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-base sm:text-xl font-bold bg-white/20 text-white backdrop-blur-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-base sm:text-lg md:text-xl font-semibold text-white min-w-0 flex-1 sm:flex-none">
                  {isLoadingUsername ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white"></div>
                      <span className="text-sm sm:text-base">Loading...</span>
                    </div>
                  ) : username ? (
                    <>Hello, <span className="text-white font-bold break-words">{sanitizeUserInput(username)}</span>! 👋</>
                  ) : (
                    <>Hello, <span className="text-white font-bold">User</span>! 👋</>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Cards Grid */}
        {isLoadingAnalytics ? (
          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 md:grid-cols-3' : 'sm:grid-cols-2'} gap-3 sm:gap-4`}>
            {[...Array(isAdmin ? 3 : 2)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isAdmin ? (
          // Admin View - Full Analytics
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Total Booked Mobiles */}
              <Card className="border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Booked Mobiles</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalBooked}</div>
                  <p className="text-xs text-muted-foreground mt-1">Currently booked</p>
                </CardContent>
              </Card>

              {/* Total In Stock */}
              <Card className="border-2 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">In Stock</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{analytics.totalInStock}</div>
                  <p className="text-xs text-muted-foreground mt-1">Available for sale</p>
                </CardContent>
              </Card>

              {/* Total Sold */}
              <Card className="border-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Sold</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{analytics.totalSold}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total sold</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics Row for Admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Recent Entries */}
              <Card className="border-2 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all duration-300 hover:shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Recent Entries</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800 transition-colors">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400">{analytics.recentEntries}</div>
                  <p className="text-xs text-muted-foreground mt-1 break-words">Last 7 days (inward_date)</p>
                </CardContent>
              </Card>

              {/* Total Mobiles */}
              <Card className="border-2 hover:border-pink-300 dark:hover:border-pink-700 transition-all duration-300 hover:shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Mobiles</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-pink-100 dark:bg-pink-900 rounded-lg group-hover:bg-pink-200 dark:group-hover:bg-pink-800 transition-colors">
                    <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-pink-600 dark:text-pink-400">{analytics.totalInStock + analytics.totalSold}</div>
                  <p className="text-xs text-muted-foreground mt-1">All entries</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Booking Persons and Brands for Admin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Top Booking Persons */}
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-b p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                    <div className="p-1.5 sm:p-2 bg-indigo-500 rounded-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="break-words">Top Booking Persons</span>
                  </CardTitle>
                  <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">Most active booking persons</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  {analytics.topBookingPersons.length > 0 ? (
                    <div className="space-y-2 sm:space-y-4">
                      {analytics.topBookingPersons.map((person, index) => (
                        <div 
                          key={person.name} 
                          className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            // Set filter in localStorage and navigate to database
                            localStorage.setItem('database_selectedBookingPersons', JSON.stringify([person.name]));
                            navigate('/database');
                          }}
                        >
                          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white flex-shrink-0 ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                              index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                              'bg-gradient-to-br from-indigo-500 to-purple-600'
                            } shadow-md`}>
                              {index + 1}
                            </div>
                            <span className="font-semibold text-sm sm:text-base truncate text-primary hover:underline">{sanitizeUserInput(person.name)}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs sm:text-sm font-medium bg-primary/10 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">{person.count} mobiles</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">No booking data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Brands */}
              <Card className="border-2 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-b p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                    <div className="p-1.5 sm:p-2 bg-emerald-500 rounded-lg">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="break-words">Top Brands</span>
                  </CardTitle>
                  <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">Most popular brands</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  {analytics.topBrands.length > 0 ? (
                    <div className="space-y-2 sm:space-y-4">
                      {analytics.topBrands.map((brand, index) => (
                        <div 
                          key={brand.name} 
                          className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            // Set filter in localStorage and navigate to database
                            localStorage.setItem('database_selectedBrands', JSON.stringify([brand.name]));
                            navigate('/database');
                          }}
                        >
                          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white flex-shrink-0 ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                              index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                              'bg-gradient-to-br from-emerald-500 to-teal-600'
                            } shadow-md`}>
                              {index + 1}
                            </div>
                            <span className="font-semibold text-sm sm:text-base truncate text-primary hover:underline">{sanitizeUserInput(brand.name)}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs sm:text-sm font-medium bg-primary/10 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">{brand.count} mobiles</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-xs sm:text-sm text-muted-foreground">No brand data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          // User View - Simplified Analytics
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* Total Booked Mobiles by User */}
              <Card className="border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl group bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base font-semibold">My Booked Mobiles</CardTitle>
                  <div className="p-2 sm:p-3 bg-blue-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{analytics.totalBooked}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Mobiles booked by me</p>
                </CardContent>
              </Card>

              {/* Total Sold by User */}
              <Card className="border-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-xl group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base font-semibold">My Sold Mobiles</CardTitle>
                  <div className="p-2 sm:p-3 bg-purple-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">{analytics.totalSold}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Mobiles sold by me</p>
                </CardContent>
              </Card>
            </div>

            {/* Most Purchased Mobile for User */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-b p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                  <div className="p-1.5 sm:p-2 bg-emerald-500 rounded-lg">
                    <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="break-words">Most Purchased Mobile</span>
                </CardTitle>
                <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">My most purchased mobile brands</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                {analytics.topBrands.length > 0 ? (
                  <div className="space-y-2 sm:space-y-4">
                    {analytics.topBrands.map((brand, index) => (
                      <div key={brand.name} className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white flex-shrink-0 ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                            'bg-gradient-to-br from-emerald-500 to-teal-600'
                          } shadow-md`}>
                            {index + 1}
                          </div>
                          <span className="font-semibold text-sm sm:text-base truncate">{brand.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium bg-primary/10 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">{brand.count} mobiles</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-xs sm:text-sm text-muted-foreground">No purchase data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Quick Actions Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-primary rounded-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1 sm:mt-2 text-xs sm:text-sm">
              Choose what you'd like to do
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 p-4 sm:p-6">
            <Link to="/entry-form" className="group touch-manipulation">
              <Button className="w-full h-auto py-4 sm:py-5 md:py-6 flex flex-col items-center gap-2 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 sm:group-hover:scale-105">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className="font-semibold text-sm sm:text-base">Go to Entry Form</span>
              </Button>
            </Link>
            <Link to="/stock-data" className="group touch-manipulation">
              <Button variant="outline" className="w-full h-auto py-4 sm:py-5 md:py-6 flex flex-col items-center gap-2 border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-300 active:scale-95 sm:group-hover:scale-105">
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-sm sm:text-base">View Stock Data</span>
              </Button>
            </Link>
            <Link to="/database" className="group touch-manipulation">
              <Button variant="outline" className="w-full h-auto py-4 sm:py-5 md:py-6 flex flex-col items-center gap-2 border-2 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950 transition-all duration-300 active:scale-95 sm:group-hover:scale-105">
                <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-semibold text-sm sm:text-base">Browse All Data</span>
              </Button>
            </Link>
            <Link to="/profile-settings" className="group touch-manipulation">
              <Button variant="secondary" className="w-full h-auto py-4 sm:py-5 md:py-6 flex flex-col items-center gap-2 bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 hover:from-slate-200 hover:to-gray-200 dark:hover:from-slate-700 dark:hover:to-gray-700 transition-all duration-300 active:scale-95 sm:group-hover:scale-105">
                <div className="p-1.5 sm:p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                  <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="font-semibold text-sm sm:text-base">Profile Settings</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;