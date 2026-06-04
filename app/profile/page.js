"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/authStore";
import { applicationsStore } from "@/stores/applicationsStore";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Edit, Building2, MapPin, Users, Plus, Trash2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useSnapshot(authStore);
  

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: userProfile?.firstName || "",
    lastName: userProfile?.lastName || "",
    phone: userProfile?.phone || "",
    streetAddress: userProfile?.streetAddress || "",
    suburb: userProfile?.suburb || "",
    state: userProfile?.state || "",
    postcode: userProfile?.postcode || "",
    country: userProfile?.country || "Australia",
    dependencies: userProfile?.dependencies || [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState(null);
  
  // Update formData when userProfile changes (e.g., after fetching from Zoho)
  useEffect(() => {
    if (userProfile && !isEditing) {
      setFormData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        phone: userProfile.phone || "",
        streetAddress: userProfile.streetAddress || "",
        suburb: userProfile.suburb || "",
        state: userProfile.state || "",
        postcode: userProfile.postcode || "",
        country: userProfile.country || "Australia",
        dependencies: userProfile.dependencies || [],
      });
    }
  }, [userProfile, isEditing]);
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleDependencyChange = (index, field, value) => {
    const newDependencies = [...formData.dependencies];
    newDependencies[index] = { ...newDependencies[index], [field]: value };
    setFormData(prev => ({ ...prev, dependencies: newDependencies }));
  };
  
  const addDependency = () => {
    setFormData(prev => ({
      ...prev,
      dependencies: [
        ...prev.dependencies,
        { firstName: "", lastName: "", relationship: "", dateOfBirth: "", citizenship: "" }
      ]
    }));
  };
  
  const removeDependency = (index) => {
    const newDependencies = formData.dependencies.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, dependencies: newDependencies }));
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    // Reset form data to current profile
    setFormData({
      firstName: userProfile?.firstName || "",
      lastName: userProfile?.lastName || "",
      phone: userProfile?.phone || "",
      streetAddress: userProfile?.streetAddress || "",
      suburb: userProfile?.suburb || "",
      state: userProfile?.state || "",
      postcode: userProfile?.postcode || "",
      country: userProfile?.country || "Australia",
      dependencies: userProfile?.dependencies || [],
    });
    setIsEditing(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.streetAddress || 
        !formData.suburb || !formData.state || !formData.postcode || !formData.country) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate dependencies (if any exist, they must be complete)
    for (let i = 0; i < formData.dependencies.length; i++) {
      const dep = formData.dependencies[i];
      if (!dep.firstName || !dep.lastName || !dep.relationship || !dep.dateOfBirth || !dep.citizenship) {
        toast({
          title: "Incomplete Dependency",
          description: `Please complete all fields for dependency ${i + 1} or remove it.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Save to Firebase
      const updateSuccess = await authStore.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        streetAddress: formData.streetAddress,
        suburb: formData.suburb,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        dependencies: formData.dependencies,
      });
      
      if (!updateSuccess) {
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Step 2: Sync to Zoho CRM
      setIsSyncing(true);
      try {
        const syncResponse = await fetch('/api/profile/sync-zoho', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            email: user?.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            streetAddress: formData.streetAddress,
            suburb: formData.suburb,
            state: formData.state,
            postcode: formData.postcode,
            country: formData.country,
            dependencies: formData.dependencies,
          }),
        });
        
        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
          setLastSyncStatus({
            success: true,
            message: syncResult.message,
            timestamp: new Date().toISOString(),
          });
          
          toast({
            title: "Success",
            description: "Profile updated and synced to Zoho CRM successfully!",
          });
        } else {
          setLastSyncStatus({
            success: false,
            message: syncResult.error,
            timestamp: new Date().toISOString(),
          });
          
          toast({
            title: "Profile Updated",
            description: "Profile saved, but Zoho CRM sync failed. You can try again later.",
            variant: "destructive",
          });
        }
      } catch (syncError) {
        console.error("Error syncing to Zoho:", syncError);
        setLastSyncStatus({
          success: false,
          message: syncError.message,
          timestamp: new Date().toISOString(),
        });
        
        toast({
          title: "Profile Updated",
          description: "Profile saved, but Zoho CRM sync failed. You can try again later.",
        });
      } finally {
        setIsSyncing(false);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSync = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email is required for sync.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const syncResponse = await fetch('/api/profile/sync-zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
          firstName: userProfile?.firstName || '',
          lastName: userProfile?.lastName || '',
          phone: userProfile?.phone || '',
          streetAddress: userProfile?.streetAddress || '',
          suburb: userProfile?.suburb || '',
          state: userProfile?.state || '',
          postcode: userProfile?.postcode || '',
          country: userProfile?.country || 'Australia',
          dependencies: userProfile?.dependencies || [],
        }),
      });

      const syncResult = await syncResponse.json();

      if (syncResult.success) {
        setLastSyncStatus({
          success: true,
          message: syncResult.message,
          timestamp: new Date().toISOString(),
          action: syncResult.action,
          contactId: syncResult.contactId,
        });

        // Reload profile to get updated zohoContactId
        await authStore.loadUserProfile();

        toast({
          title: "Sync Successful",
          description: syncResult.message,
        });
      } else {
        setLastSyncStatus({
          success: false,
          message: syncResult.error || 'Sync failed',
          timestamp: new Date().toISOString(),
        });

        toast({
          title: "Sync Failed",
          description: syncResult.error || 'Failed to sync with Zoho CRM',
          variant: "destructive",
        });
      }
    } catch (syncError) {
      console.error("Error syncing to Zoho:", syncError);
      setLastSyncStatus({
        success: false,
        message: syncError.message,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Sync Failed",
        description: "Failed to sync with Zoho CRM. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchFromZoho = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User ID is required.",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      const fetchResponse = await fetch('/api/profile/fetch-zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user?.email,
          contactId: userProfile?.zohoContactId,
        }),
      });

      const fetchResult = await fetchResponse.json();

      if (fetchResult.success) {
        // Reload profile to get updated data
        await authStore.loadUserProfile();
        
        // Reload applications to get any new deals/applications from Zoho
        if (user?.id) {
          await applicationsStore.loadApplications(user.id);
          console.log('✅ Applications reloaded after fetching from Zoho');
        }
        
        // The useEffect will automatically update formData when userProfile changes
        // But we can also manually update it here to ensure it's immediate
        if (!isEditing) {
          // Update formData from the fetched result immediately
          setFormData(prev => ({
            ...prev,
            firstName: fetchResult.profileData.firstName || prev.firstName,
            lastName: fetchResult.profileData.lastName || prev.lastName,
            phone: fetchResult.profileData.phone || prev.phone,
            streetAddress: fetchResult.profileData.streetAddress || prev.streetAddress,
            suburb: fetchResult.profileData.suburb || prev.suburb,
            state: fetchResult.profileData.state || prev.state,
            postcode: fetchResult.profileData.postcode || prev.postcode,
            country: fetchResult.profileData.country || prev.country,
            dependencies: fetchResult.profileData.dependencies || prev.dependencies,
          }));
        } else {
          // Update form data if in edit mode
          setFormData({
            firstName: fetchResult.profileData.firstName || '',
            lastName: fetchResult.profileData.lastName || '',
            phone: fetchResult.profileData.phone || '',
            streetAddress: fetchResult.profileData.streetAddress || '',
            suburb: fetchResult.profileData.suburb || '',
            state: fetchResult.profileData.state || '',
            postcode: fetchResult.profileData.postcode || '',
            country: fetchResult.profileData.country || 'Australia',
            dependencies: fetchResult.profileData.dependencies || [],
          });
        }

        setLastSyncStatus({
          success: true,
          message: fetchResult.message,
          timestamp: new Date().toISOString(),
          action: 'fetched',
        });

        toast({
          title: "Fetch Successful",
          description: "Profile data fetched from Zoho CRM and updated successfully!",
        });
      } else {
        toast({
          title: "Fetch Failed",
          description: fetchResult.error || 'Failed to fetch from Zoho CRM',
          variant: "destructive",
        });
      }
    } catch (fetchError) {
      console.error("Error fetching from Zoho:", fetchError);
      toast({
        title: "Fetch Failed",
        description: "Failed to fetch from Zoho CRM. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <main className="flex-1 px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Your Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl">Your Profile</CardTitle>
                    <CardDescription>
                      Basic information about your account
                      {lastSyncStatus && (
                        <span className="ml-2 inline-flex items-center text-xs">
                          {lastSyncStatus.success ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                              <span className="text-green-600">
                                {lastSyncStatus.action === 'fetched' ? 'Fetched from Zoho CRM' : 'Synced to Zoho CRM'}
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-red-600 mr-1" />
                              <span className="text-red-600">Sync failed</span>
                            </>
                          )}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="button-edit-profile"
                        onClick={handleEdit}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditing ? (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">First Name</p>
                          <p className="font-semibold text-gray-900" data-testid="text-first-name">
                            {userProfile?.firstName || "Not set"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Last Name</p>
                          <p className="font-semibold text-gray-900" data-testid="text-last-name">
                            {userProfile?.lastName || "Not set"}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="font-medium text-gray-900" data-testid="text-email">
                          {user?.email || "Not set"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Phone className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="font-medium text-gray-900" data-testid="text-phone">
                          {userProfile?.phone || "Not set"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Mode */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            data-testid="input-first-name"
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleChange("firstName", e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            data-testid="input-last-name"
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleChange("lastName", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-gray-600">Email cannot be changed</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          data-testid="input-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          data-testid="button-cancel"
                          onClick={handleCancel}
                          disabled={isSubmitting || isSyncing}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          data-testid="button-save"
                          disabled={isSubmitting || isSyncing}
                          className="bg-[#4F726B] hover:bg-[#4F726B]"
                        >
                          {isSyncing ? "Syncing to Zoho..." : isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Address Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
                <CardDescription>Your residential address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <>
                    {/* View Mode */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Street Address</p>
                      <p className="text-gray-900" data-testid="text-street">
                        {userProfile?.streetAddress || "—"}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Suburb</p>
                        <p className="text-gray-900" data-testid="text-suburb">
                          {userProfile?.suburb || "—"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">State</p>
                        <p className="text-gray-900" data-testid="text-state">
                          {userProfile?.state || "—"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Postcode</p>
                        <p className="text-gray-900" data-testid="text-postcode">
                          {userProfile?.postcode || "—"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Country</p>
                        <p className="text-gray-900" data-testid="text-country">
                          {userProfile?.country || "Australia"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-2">
                      <Label htmlFor="streetAddress">Street Address *</Label>
                      <Input
                        id="streetAddress"
                        data-testid="input-street"
                        type="text"
                        value={formData.streetAddress}
                        onChange={(e) => handleChange("streetAddress", e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="suburb">Suburb *</Label>
                        <Input
                          id="suburb"
                          data-testid="input-suburb"
                          type="text"
                          value={formData.suburb}
                          onChange={(e) => handleChange("suburb", e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          data-testid="input-state"
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleChange("state", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postcode">Postcode *</Label>
                        <Input
                          id="postcode"
                          data-testid="input-postcode"
                          type="text"
                          value={formData.postcode}
                          onChange={(e) => handleChange("postcode", e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Input
                          id="country"
                          data-testid="input-country"
                          type="text"
                          value={formData.country}
                          onChange={(e) => handleChange("country", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Dependencies Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle>Dependencies</CardTitle>
                  </div>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="button-add-dependency"
                      onClick={addDependency}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Dependency
                    </Button>
                  )}
                </div>
                <CardDescription>Family members or dependents</CardDescription>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <>
                    {/* View Mode */}
                    {formData.dependencies && formData.dependencies.length > 0 ? (
                      <div className="space-y-4">
                        {formData.dependencies.map((dep, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Name</p>
                                <p className="text-gray-900" data-testid={`text-dependency-name-${index}`}>
                                  {dep.firstName} {dep.lastName}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Relationship</p>
                                <p className="text-gray-900" data-testid={`text-dependency-relationship-${index}`}>
                                  {dep.relationship}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                                <p className="text-gray-900" data-testid={`text-dependency-dob-${index}`}>
                                  {dep.dateOfBirth}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Citizenship</p>
                                <p className="text-gray-900" data-testid={`text-dependency-citizenship-${index}`}>
                                  {dep.citizenship}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No dependencies added</p>
                    )}
                  </>
                ) : (
                  <>
                    {/* Edit Mode */}
                    {formData.dependencies && formData.dependencies.length > 0 ? (
                      <div className="space-y-4">
                        {formData.dependencies.map((dep, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-gray-900">Dependency {index + 1}</h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                data-testid={`button-remove-dependency-${index}`}
                                onClick={() => removeDependency(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`dep-firstName-${index}`}>First Name *</Label>
                                <Input
                                  id={`dep-firstName-${index}`}
                                  data-testid={`input-dependency-first-name-${index}`}
                                  type="text"
                                  value={dep.firstName}
                                  onChange={(e) => handleDependencyChange(index, "firstName", e.target.value)}
                                  required
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`dep-lastName-${index}`}>Last Name *</Label>
                                <Input
                                  id={`dep-lastName-${index}`}
                                  data-testid={`input-dependency-last-name-${index}`}
                                  type="text"
                                  value={dep.lastName}
                                  onChange={(e) => handleDependencyChange(index, "lastName", e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`dep-relationship-${index}`}>Relationship *</Label>
                              <Select
                                value={dep.relationship}
                                onValueChange={(value) => handleDependencyChange(index, "relationship", value)}
                              >
                                <SelectTrigger data-testid={`select-dependency-relationship-${index}`}>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="spouse">Spouse</SelectItem>
                                  <SelectItem value="partner">Partner</SelectItem>
                                  <SelectItem value="child">Child</SelectItem>
                                  <SelectItem value="parent">Parent</SelectItem>
                                  <SelectItem value="sibling">Sibling</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`dep-dob-${index}`}>Date of Birth *</Label>
                                <Input
                                  id={`dep-dob-${index}`}
                                  data-testid={`input-dependency-dob-${index}`}
                                  type="date"
                                  value={dep.dateOfBirth}
                                  onChange={(e) => handleDependencyChange(index, "dateOfBirth", e.target.value)}
                                  required
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor={`dep-citizenship-${index}`}>Citizenship *</Label>
                                <Input
                                  id={`dep-citizenship-${index}`}
                                  data-testid={`input-dependency-citizenship-${index}`}
                                  type="text"
                                  value={dep.citizenship}
                                  onChange={(e) => handleDependencyChange(index, "citizenship", e.target.value)}
                                  placeholder="e.g., Australian, Canadian"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No dependencies added. Click "Add Dependency" to add one.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
      </main>
    </div>
  );
}
