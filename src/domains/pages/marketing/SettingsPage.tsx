import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/domains/core/components/ui/card";
import { Button } from "@/domains/core/components/ui/button";
import { Input } from "@/domains/core/components/ui/input";
import { Label } from "@/domains/core/components/ui/label";
import { Switch } from "@/domains/core/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/domains/core/components/ui/tabs";
import { useAuth } from "@/domains/app/providers/AuthContext";
import { toast } from "sonner";
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '@/config/config';
import { paths } from '@/lib/apiPaths';
import { ENABLE_CUSTOM_ATTRIBUTES, ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';
import { OrganizationSettingsForm } from '@/domains/settings/components/OrganizationSettingsForm';
import { FamilyListPage } from '@/domains/families/components/FamilyListPage';
import { config } from '@/config/config';

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
  // Get the tab from the URL query parameters
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Validate the tab parameter is one of the valid tabs
  const validTabs = config.settings.display.tabs.map(tab => tab.value);
  const defaultTab = validTabs.includes(tabParam || '') ? tabParam || validTabs[0] : validTabs[0];

  const { user, updateUserContext } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  
  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
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
      toast.success(config.settings.display.profile.successMessage);
    } catch (err: any) {
      console.error("Profile update error:", err);
      const errorMsg = err.response?.data?.detail || err.message || config.settings.errors.profileUpdate;
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
        toast.success(config.settings.display.security.successMessage);
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
             const errorMsg = err.response?.data?.detail || err.message || config.settings.errors.passwordChange;
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
    toast.success(config.settings.display.notifications.successMessage);
    setIsSavingNotifications(false);
  };

  // Function to fetch attributes (for testing API paths)
  const fetchAttributes = async () => {
    setLoadingAttributes(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(paths.attributes.root(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttributes(response.data);
      console.log('Attributes fetched successfully:', response.data);
      toast.success(`${response.data.length} attributes loaded`);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error('Failed to load attributes');
    } finally {
      setLoadingAttributes(false);
    }
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-enterprise-900">{config.settings.display.pageTitle}</h1>
        <p className="text-enterprise-600 mt-1">
          {config.settings.display.pageDescription}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 max-w-lg">
          {config.settings.display.tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{config.settings.display.profile.title}</CardTitle>
              <CardDescription>{config.settings.display.profile.description}</CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileSubmitHook(handleProfileUpdate)}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-name">{config.settings.display.profile.nameLabel}</Label>
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
                  <Label htmlFor="setting-email">{config.settings.display.profile.emailLabel}</Label>
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
                   {isSavingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {config.settings.display.profile.savingLabel}</> : config.settings.display.profile.updateButton}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{config.settings.display.security.title}</CardTitle>
              <CardDescription>{config.settings.display.security.description}</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordSubmitHook(handlePasswordChange)}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="setting-current-password">{config.settings.display.security.currentPasswordLabel}</Label>
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
                    <Label htmlFor="setting-new-password">{config.settings.display.security.newPasswordLabel}</Label>
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
                    <Label htmlFor="setting-confirm-password">{config.settings.display.security.confirmPasswordLabel}</Label>
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
                   {isSavingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {config.settings.display.security.savingLabel}</> : config.settings.display.security.updateButton}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{config.settings.display.notifications.title}</CardTitle>
              <CardDescription>{config.settings.display.notifications.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                   <p className="text-sm font-medium">{config.settings.display.notifications.emailNotificationsTitle}</p>
                   <p className="text-xs text-enterprise-500">{config.settings.display.notifications.emailNotificationsDescription}</p>
                </div>
                <Switch 
                   id="notification-email" 
                   checked={emailNotifications} 
                   onCheckedChange={setEmailNotifications} 
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {config.settings.display.notifications.savingLabel}
                      </>
                    ) : (
                      config.settings.display.notifications.updateButton
                    )}
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <OrganizationSettingsForm />
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api">
           <Card>
            <CardHeader>
              <CardTitle>{config.settings.display.api.title}</CardTitle>
              <CardDescription>{config.settings.display.api.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-enterprise-600 mb-4">
                {config.settings.display.api.placeholderText}
              </p>
              <div className="p-4 border rounded-md bg-enterprise-50 text-center text-enterprise-500">
                {config.settings.display.api.comingSoonText}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
               <Button variant="outline" disabled className="mt-4">{config.settings.display.api.generateButton}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes">
          <Card>
            <CardHeader>
              <CardTitle>{config.settings.display.attributes.title}</CardTitle>
              <CardDescription>{config.settings.display.attributes.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {ENABLE_CUSTOM_ATTRIBUTES ? (
                <>
                  <p className="text-sm text-enterprise-600 mb-4">
                    {config.settings.display.attributes.placeholderText}
                  </p>
                  
                  <div className="flex flex-col space-y-4">
                    <Button asChild className="w-full md:w-auto">
                      <Link to="/app/settings/attributes" className="flex items-center">
                        {config.settings.display.attributes.manageAttributesButton}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    
                    {ENABLE_ATTRIBUTE_GROUPS && (
                      <Button asChild className="w-full md:w-auto">
                        <Link to="/app/settings/attribute-groups" className="flex items-center">
                          {config.settings.display.attributes.manageAttributeGroupsButton}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    
                    <div className="text-sm text-enterprise-500">
                      {config.settings.display.attributes.attributeDescription}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <Button 
                    onClick={fetchAttributes}
                    disabled={loadingAttributes}
                  >
                    {loadingAttributes ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {config.settings.display.attributes.loadingLabel}
                      </>
                    ) : (
                      config.settings.display.attributes.loadAttributesButton
                    )}
                  </Button>
                </div>
              )}
              
              {!ENABLE_CUSTOM_ATTRIBUTES && attributes.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attributes.map((attr) => (
                        <tr key={attr.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attr.code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attr.label}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attr.data_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {!ENABLE_CUSTOM_ATTRIBUTES && attributes.length === 0 && !loadingAttributes && (
                <div className="p-4 border rounded-md bg-enterprise-50 text-center text-enterprise-500">
                  {config.settings.display.attributes.noAttributesText}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Families Tab */}
        <TabsContent value="families">
          <Card>
            <CardHeader>
              <CardTitle>{config.settings.display.families.title}</CardTitle>
              <CardDescription>{config.settings.display.families.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <FamilyListPage isEmbedded={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
