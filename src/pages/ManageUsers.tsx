"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, KeyRound, Loader2, Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeUrl, sanitizeUserInput } from "@/utils/sanitize";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
  is_active: boolean | null;
}

// Helper to parse date safely
const parseDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

const ManageUsers = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Fetch all users (admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Try RPC function first (recommended for admin access)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_profiles');
      
      if (rpcError) {
        // If RPC function doesn't exist, try direct query
        if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, email, username, avatar_url, role, created_at, is_active')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching users (direct query):', { code: error.code, message: error.message });
            if (error.code === '42501' || error.message.includes('row-level security')) {
              showError('Unable to fetch users. Please run the SQL script "supabase_get_all_profiles_function.sql" in your Supabase dashboard to set up the admin function.');
            } else {
              showError('Failed to fetch users');
            }
            setUsers([]);
          } else {
            setUsers(data || []);
          }
        } else {
          console.error('Error fetching users (RPC):', { code: rpcError.code, message: rpcError.message });
          showError('Unable to fetch users');
          setUsers([]);
        }
      } else {
        setUsers(rpcData || []);
      }
    } catch (error) {
      console.error('Error fetching users (unexpected):', error instanceof Error ? error.message : 'Unknown error');
      showError('An unexpected error occurred while fetching users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleResetPassword = async (userEmail: string) => {
    setIsResettingPassword(userEmail);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Error resetting password:', { code: error.code, message: error.message });
        showError('Failed to send password reset email');
      } else {
        showSuccess(`Password reset email sent to ${userEmail}`);
      }
    } catch (error) {
      console.error('Error resetting password (unexpected):', error instanceof Error ? error.message : 'Unknown error');
      showError('An unexpected error occurred while resetting password');
    } finally {
      setIsResettingPassword(null);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setAvatarUrl(user.avatar_url || "");
    setSelectedRole(user.role || "user");
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
    setAvatarUrl("");
    setSelectedRole("user");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
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
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
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
      console.error('Error uploading avatar (unexpected):', error instanceof Error ? error.message : 'Unknown error');
      showError('Failed to upload avatar. Please run the database setup script.');
    } finally {
      dismissToast(loadingToastId);
      setIsUploading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    const loadingToastId = showLoading('Updating user...');
    
    try {
      // Try RPC function first (bypasses RLS)
      const { error: rpcError } = await supabase.rpc('update_user_profile', {
        target_user_id: editingUser.id,
        new_avatar_url: avatarUrl.trim() || null,
        new_role: selectedRole
      });

      if (rpcError) {
        // If RPC function doesn't exist, try direct update
        if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          const { error } = await supabase
            .from('profiles')
            .update({
              avatar_url: avatarUrl.trim() || null,
              role: selectedRole
            })
            .eq('id', editingUser.id);

          if (error) {
            console.error('Error updating user (direct update):', { code: error.code, message: error.message });
            if (error.code === '42501' || error.message.includes('row-level security')) {
              showError('Unable to update user. Please run "supabase_update_user_profile_function.sql" in your Supabase dashboard to set up admin update permissions.');
            } else {
              showError('Failed to update user');
            }
            return;
          }
        } else {
          console.error('Error updating user (RPC):', { code: rpcError.code, message: rpcError.message });
          showError('Failed to update user');
          return;
        }
      }

      showSuccess('User updated successfully');
      // Refetch users to get the latest data from database
      await fetchUsers();
      // Close dialog and reset state
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating user (unexpected):', error instanceof Error ? error.message : 'Unknown error');
      showError('An unexpected error occurred while updating user');
    } finally {
      dismissToast(loadingToastId);
      setIsSaving(false);
    }
  };

  const handleSoftDeleteUser = async (userId: string, userEmail: string) => {
    setDeletingUserId(userId);
    const loadingToastId = showLoading('Deactivating user...');
    
    try {
      // Try RPC function first (bypasses RLS)
      const { error: rpcError } = await supabase.rpc('update_user_status', {
        target_user_id: userId,
        new_status: false
      });

      if (rpcError) {
        // If RPC function doesn't exist, try direct update
        if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          const { error } = await supabase
            .from('profiles')
            .update({ is_active: false })
            .eq('id', userId);

          if (error) {
            console.error('Error deactivating user (direct update):', { code: error.code, message: error.message });
            if (error.code === '42501' || error.message.includes('row-level security')) {
              showError('Unable to deactivate user. Please run "supabase_update_user_status_function.sql" in your Supabase dashboard to set up admin update permissions.');
            } else if (error.code === '42703' || error.message?.includes('column "is_active" does not exist')) {
              showError('is_active column not found. Please run the database migration script to add it.');
            } else {
              showError('Failed to deactivate user');
            }
            return;
          }
        } else {
          console.error('Error deactivating user (RPC):', { code: rpcError.code, message: rpcError.message });
          showError('Failed to deactivate user');
          return;
        }
      }

      showSuccess(`User ${userEmail} has been deactivated. They can no longer log in, but their data is preserved.`);
      // Refetch users to get the latest data from database
      await fetchUsers();
    } catch (error) {
      console.error('Error deactivating user (unexpected):', error instanceof Error ? error.message : 'Unknown error');
      showError('An unexpected error occurred while deactivating user');
    } finally {
      dismissToast(loadingToastId);
      setDeletingUserId(null);
    }
  };

  const handleActivateUser = async (userId: string, userEmail: string) => {
    const loadingToastId = showLoading('Activating user...');
    
    try {
      // Try RPC function first (bypasses RLS)
      const { error: rpcError } = await supabase.rpc('update_user_status', {
        target_user_id: userId,
        new_status: true
      });

      if (rpcError) {
        // If RPC function doesn't exist, try direct update
        if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
          const { error } = await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', userId);

          if (error) {
            console.error('Error activating user (direct update):', { code: error.code, message: error.message });
            if (error.code === '42501' || error.message.includes('row-level security')) {
              showError('Unable to activate user. Please run "supabase_update_user_status_function.sql" in your Supabase dashboard to set up admin update permissions.');
            } else {
              showError('Failed to activate user');
            }
            return;
          }
        } else {
          console.error('Error activating user (RPC):', { code: rpcError.code, message: rpcError.message });
          showError('Failed to activate user');
          return;
        }
      }

      showSuccess(`User ${userEmail} has been activated.`);
      // Refetch users to get the latest data from database
      await fetchUsers();
    } catch (error) {
      console.error('Error activating user (unexpected):', error instanceof Error ? error.message : 'Unknown error');
      showError('An unexpected error occurred while activating user');
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const getUserInitials = (user: UserProfile) => {
    if (user.username) {
      // Sanitize username before extracting initials
      const sanitized = sanitizeUserInput(user.username);
      return sanitized.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      // Sanitize email before extracting initials
      const sanitized = sanitizeUserInput(user.email);
      return sanitized.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You don't have permission to access this page. Admin access required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center uppercase">Manage Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center uppercase">Manage Users</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {user.avatar_url ? (
                                <AvatarImage src={sanitizeUrl(user.avatar_url)} alt={sanitizeUserInput(user.username || user.email)} />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="font-medium">
                              {sanitizeUserInput(user.username || user.email.split('@')[0])}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{sanitizeUserInput(user.email)}</TableCell>
                        <TableCell>{sanitizeUserInput(user.username) || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {user.role || 'user'}
                            </span>
                            {user.is_active === false && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Inactive
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {parseDate(user.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {user.is_active !== false ? (
                              <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => {
                                if (!open) {
                                  handleCloseDialog();
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit Profile
                                  </Button>
                                </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Edit User Profile</DialogTitle>
                                  <DialogDescription>
                                    Update the profile avatar and role for {sanitizeUserInput(user.email)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  {/* Avatar Upload Section */}
                                  <div className="grid gap-2">
                                    <Label>Avatar</Label>
                                    <div className="flex items-center gap-4">
                                      <div className="relative">
                                        <Avatar className="h-24 w-24">
                                          <AvatarImage src={sanitizeUrl(avatarUrl)} alt="Preview" />
                                          <AvatarFallback>
                                            {getUserInitials(user)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <label
                                          htmlFor={`avatar-upload-${user.id}`}
                                          className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                                          title="Upload avatar"
                                        >
                                          <Camera className="h-4 w-4" />
                                          <input
                                            id={`avatar-upload-${user.id}`}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleAvatarUpload(e, user.id)}
                                            className="hidden"
                                            disabled={isUploading}
                                          />
                                        </label>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium mb-2">Upload Profile Picture</p>
                                        <p className="text-xs text-muted-foreground mb-2">
                                          Click the camera icon to upload a new profile picture
                                        </p>
                                        {isUploading && (
                                          <div className="flex items-center gap-2 text-xs text-blue-600">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Uploading...</span>
                                          </div>
                                        )}
                                        {avatarUrl && !isUploading && (
                                          <p className="text-xs text-green-600 mt-1">
                                            ✓ Avatar ready to save
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Role Selection */}
                                  <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                      value={selectedRole}
                                      onValueChange={setSelectedRole}
                                      disabled={isSaving}
                                    >
                                      <SelectTrigger id="role">
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      Select the user's role. Admins have full access to all features.
                                    </p>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <DialogClose asChild>
                                    <Button
                                      variant="outline"
                                      onClick={handleCloseDialog}
                                      disabled={isSaving || isUploading}
                                    >
                                      Cancel
                                    </Button>
                                  </DialogClose>
                                  <Button
                                    onClick={handleSaveUser}
                                    disabled={isSaving || isUploading}
                                  >
                                    {isSaving ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      'Save Changes'
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="Cannot edit inactive user profile"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Profile
                              </Button>
                            )}
                            {user.is_active !== false ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isResettingPassword === user.email}
                                  >
                                    {isResettingPassword === user.email ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <KeyRound className="h-4 w-4 mr-1" />
                                    )}
                                    Reset Password
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will send a password reset email to {sanitizeUserInput(user.email)}. 
                                      The user will need to click the link in the email to reset their password.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleResetPassword(user.email)}
                                    >
                                      Send Reset Email
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="Cannot reset password for inactive user"
                              >
                                <KeyRound className="h-4 w-4 mr-1" />
                                Reset Password
                              </Button>
                            )}
                            {user.is_active !== false ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingUserId === user.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {deletingUserId === user.id ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 mr-1" />
                                    )}
                                    Deactivate
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will deactivate {sanitizeUserInput(user.email)}. They will not be able to log in, but all their data will be preserved. You can reactivate them later.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleSoftDeleteUser(user.id, user.email)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Deactivate User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivateUser(user.id, user.email)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default ManageUsers;

