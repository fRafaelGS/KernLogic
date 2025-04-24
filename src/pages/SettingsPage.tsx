import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/config';

// --- Zod Schemas ---
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"], // path of error
});
type PasswordFormData = z.infer<typeof passwordSchema>;

// --- Settings Page Component ---
const SettingsPage: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  // Notification preferences state
  const [lowStockAlerts, setLowStockAlerts] = useState(false);
  const [uploadSummaries, setUploadSummaries] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // --- React Hook Form Instances ---
  const { 
    register: registerProfile, 
    handleSubmit: handleProfileSubmitHook,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    }
  });

  const { 
    register: registerPassword, 
    handleSubmit: handlePasswordSubmitHook,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
    setError: setPasswordError,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // --- Update Default Values on User Change ---
  useEffect(() => {
    if (user) {
      resetProfileForm({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, resetProfileForm]);

  // --- Handlers ---
  const handleProfileUpdate = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.put(`${API_URL}/auth/user/`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUserContext(response.data); // Update context state
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error("Profile update error:", err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update profile';
      toast.error(errorMsg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    setIsSavingPassword(true);
    try {
        const token = localStorage.getItem('access_token');
        await axios.post(`${API_URL}/auth/password/change/`, {
            old_password: data.currentPassword,
            new_password1: data.newPassword,
            new_password2: data.confirmPassword,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Password changed successfully!');
        resetPasswordForm(); // Clear fields on success
    } catch (err: any) {
        console.error("Password change error:", err.response?.data || err);
        // Map potential backend errors to form fields
        if (err.response?.data?.old_password) {
            setPasswordError("currentPassword", { type: "server", message: err.response.data.old_password[0] });
        } else if (err.response?.data?.new_password2) {
            setPasswordError("newPassword", { type: "server", message: err.response.data.new_password2[0] });
            setPasswordError("confirmPassword", { type: "server", message: err.response.data.new_password2[0] });
        } else {
             const errorMsg = err.response?.data?.detail || err.message || 'Failed to change password';
             toast.error(errorMsg);
        }
    } finally {
        setIsSavingPassword(false);
    }
  };
  
  // Simulated save for notifications (Ensure it's defined before return)
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Notification preferences saved (simulated)!");
    setIsSavingNotifications(false);
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-enterprise-900">Settings</h1>
        <p className="text-enterprise-600 mt-1">
          Manage your account, security, and notification preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileSubmitHook(handleProfileUpdate)}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-name">Full Name</Label>
                  <Input 
                    id="setting-name" 
                    {...registerProfile("name")} 
                    placeholder="Your Name" 
                    disabled={isSavingProfile}
                    className={profileErrors.name ? 'border-danger-500' : ''}
                  />
                  {profileErrors.name && <p className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{profileErrors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="setting-email">Email Address</Label>
                  <Input 
                    id="setting-email" 
                    type="email" 
                    {...registerProfile("email")} 
                    placeholder="your@email.com" 
                    disabled={isSavingProfile} 
                    className={profileErrors.email ? 'border-danger-500' : ''}
                  />
                   {profileErrors.email && <p className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{profileErrors.email.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" variant="primary" disabled={isSavingProfile}>
                   {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Update Profile'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password Management</CardTitle>
              <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordSubmitHook(handlePasswordChange)}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-current-password">Current Password</Label>
                  <Input 
                    id="setting-current-password" 
                    type="password" 
                    {...registerPassword("currentPassword")} 
                    placeholder="Enter current password" 
                    disabled={isSavingPassword}
                    className={passwordErrors.currentPassword ? 'border-danger-500' : ''}
                  />
                   {passwordErrors.currentPassword && <p className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{passwordErrors.currentPassword.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="setting-new-password">New Password</Label>
                    <Input 
                      id="setting-new-password" 
                      type="password" 
                      {...registerPassword("newPassword")} 
                      placeholder="Enter new password" 
                      disabled={isSavingPassword}
                      className={passwordErrors.newPassword ? 'border-danger-500' : ''}
                    />
                     {passwordErrors.newPassword && <p className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{passwordErrors.newPassword.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="setting-confirm-password">Confirm New Password</Label>
                    <Input 
                      id="setting-confirm-password" 
                      type="password" 
                      {...registerPassword("confirmPassword")} 
                      placeholder="Confirm new password" 
                      disabled={isSavingPassword}
                      className={passwordErrors.confirmPassword ? 'border-danger-500' : ''}
                    />
                     {passwordErrors.confirmPassword && <p className="text-sm text-danger-600 flex items-center mt-1"><AlertCircle className="h-4 w-4 mr-1" />{passwordErrors.confirmPassword.message}</p>}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                 <Button type="submit" variant="primary" disabled={isSavingPassword}>
                   {isSavingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Change Password'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                   <p className="text-sm font-medium">Low Stock Alerts</p>
                   <p className="text-xs text-enterprise-500">Receive an email when product stock drops below threshold.</p>
                </div>
                <Switch 
                   id="notification-low-stock" 
                   checked={lowStockAlerts} 
                   onCheckedChange={setLowStockAlerts} 
                   disabled={isSavingNotifications}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                   <p className="text-sm font-medium">Upload Summaries</p>
                   <p className="text-xs text-enterprise-500">Get notified after a bulk data upload is complete.</p>
                </div>
                <Switch 
                   id="notification-upload" 
                   checked={uploadSummaries} 
                   onCheckedChange={setUploadSummaries}
                   disabled={isSavingNotifications}
                />
              </div>
            </CardContent>
             <CardFooter className="border-t px-6 py-4">
                 <Button 
                   variant="primary" 
                   onClick={handleSaveNotifications} 
                   disabled={isSavingNotifications}
                  >
                    {isSavingNotifications ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      'Save Preferences'
                    )}
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api">
           <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for integrations. (Placeholder)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-enterprise-600 mb-4">
                Generate and manage API keys to connect KernLogic with other applications.
              </p>
              <div className="p-4 border rounded-md bg-enterprise-50 text-center text-enterprise-500">
                API Key management coming soon.
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
               <Button variant="outline" disabled className="mt-4">Generate New Key</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
