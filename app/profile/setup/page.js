"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useSnapshot(authStore);
  
  const [formData, setFormData] = useState({
    name: userProfile?.name || "",
    phone: userProfile?.phone || "",
    streetAddress: userProfile?.streetAddress || "",
    suburb: userProfile?.suburb || "",
    state: userProfile?.state || "",
    postcode: userProfile?.postcode || "",
    country: userProfile?.country || "Australia",
    dependencies: userProfile?.dependencies || [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zohoStatus, setZohoStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [waitingForZoho, setWaitingForZoho] = useState(false);
  const [zohoLoadAttempts, setZohoLoadAttempts] = useState(0);
  const [zohoDataLoaded, setZohoDataLoaded] = useState(false);
  
  // Fetch data directly from Zoho and populate form (not from Firebase since it's first time)
  useEffect(() => {
    if (!user?.email || !user?.id) {
      setLoadingStatus(false);
      return;
    }

    const MAX_WAIT_TIME = 8000; // 8 seconds max wait
    const POLL_INTERVAL = 1000; // Check every 1 second
    const MAX_ATTEMPTS = Math.ceil(MAX_WAIT_TIME / POLL_INTERVAL);
    
    let attempts = 0;
    let timeoutId;
    let pollInterval;

    const fetchZohoData = async () => {
      attempts++;
      setZohoLoadAttempts(attempts);
      
      try {
        // Fetch directly from Zoho (not from Firebase) - skipSave=true to just get data for form
        const response = await fetch('/api/profile/fetch-zoho', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            skipSave: true, // Don't save to Firebase yet - just get data for form
          }),
        });

        const result = await response.json();
        
        if (result.success && result.profileData) {
          console.log('✅ Zoho data fetched, populating form');
          
          // Populate form with Zoho data
          const zohoData = result.profileData;
          setFormData({
            name: zohoData.firstName && zohoData.lastName
              ? `${zohoData.firstName} ${zohoData.lastName}`.trim()
              : zohoData.name || "",
            phone: zohoData.phone || "",
            streetAddress: zohoData.streetAddress || "",
            suburb: zohoData.suburb || "",
            state: zohoData.state || "",
            postcode: zohoData.postcode || "",
            country: zohoData.country || "Australia",
            dependencies: zohoData.dependencies || [],
          });
          
          // Mark as loaded
          setZohoDataLoaded(true);
          setWaitingForZoho(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          
          // Check status for debugging
          try {
            const statusResponse = await fetch(
              `/api/profile/zoho-population-status?email=${encodeURIComponent(user.email)}&userId=${encodeURIComponent(user.id)}`
            );
            const statusData = await statusResponse.json();
            setZohoStatus(statusData);
          } catch (error) {
            console.error('Error checking Zoho status:', error);
          }
          
          setLoadingStatus(false);
          return;
        } else if (result.error && result.error.includes('not found')) {
          // No Zoho contact found - stop trying
          console.log('📭 No Zoho contact found, showing empty form');
          setZohoDataLoaded(false);
          setWaitingForZoho(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          
          // Check status anyway
          try {
            const statusResponse = await fetch(
              `/api/profile/zoho-population-status?email=${encodeURIComponent(user.email)}&userId=${encodeURIComponent(user.id)}`
            );
            const statusData = await statusResponse.json();
            setZohoStatus(statusData);
          } catch (error) {
            console.error('Error checking Zoho status:', error);
            setZohoStatus({ success: false, error: error.message });
          }
          
          setLoadingStatus(false);
          return;
        }
        
        // If max attempts reached, stop waiting
        if (attempts >= MAX_ATTEMPTS) {
          console.log('⏱️ Max wait time reached, stopping Zoho data fetch');
          setZohoDataLoaded(false);
          setWaitingForZoho(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          
          // Check status anyway
          try {
            const statusResponse = await fetch(
              `/api/profile/zoho-population-status?email=${encodeURIComponent(user.email)}&userId=${encodeURIComponent(user.id)}`
            );
            const statusData = await statusResponse.json();
            setZohoStatus(statusData);
          } catch (error) {
            console.error('Error checking Zoho status:', error);
            setZohoStatus({ success: false, error: error.message });
          }
          
          setLoadingStatus(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching Zoho data:', error);
        // Continue polling unless we've reached max attempts
        if (attempts >= MAX_ATTEMPTS) {
          setZohoDataLoaded(false);
          setWaitingForZoho(false);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          setLoadingStatus(false);
        }
      }
    };

    // Start fetching Zoho data
    setWaitingForZoho(true);
    
    // Initial fetch
    fetchZohoData();
    
    // Poll every second
    pollInterval = setInterval(fetchZohoData, POLL_INTERVAL);
    
    // Timeout after max wait time
    timeoutId = setTimeout(() => {
      console.log('⏱️ Timeout reached, stopping Zoho data fetch');
      setZohoDataLoaded(false);
      setWaitingForZoho(false);
      clearInterval(pollInterval);
      setLoadingStatus(false);
    }, MAX_WAIT_TIME);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [user?.email, user?.id]);
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.phone || !formData.streetAddress || 
        !formData.suburb || !formData.state || !formData.postcode || !formData.country) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Parse name into firstName and lastName
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Get dependencies from Zoho data (if fetched) or userProfile (if already loaded)
      const dependencies = formData.dependencies && formData.dependencies.length > 0 
        ? formData.dependencies 
        : (userProfile?.dependencies || []);
      
      // Update profile with all fields (split name into firstName/lastName)
      const updateSuccess = await authStore.updateProfile({
        firstName: firstName,
        lastName: lastName,
        name: formData.name,
        phone: formData.phone,
        streetAddress: formData.streetAddress,
        suburb: formData.suburb,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        dependencies: dependencies,
      });
      
      if (updateSuccess) {
        // Sync to Zoho CRM (only if there's a Zoho contact)
        if (zohoStatus?.zohoContactFound || userProfile?.zohoContactId) {
          try {
            const syncResponse = await fetch('/api/profile/sync-zoho', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user?.id,
                email: user?.email,
                firstName: firstName,
                lastName: lastName,
                phone: formData.phone,
                streetAddress: formData.streetAddress,
                suburb: formData.suburb,
                state: formData.state,
                postcode: formData.postcode,
                country: formData.country,
                dependencies: dependencies,
              }),
            });

            const syncResult = await syncResponse.json();
            
            if (syncResult.success) {
              console.log('✅ Profile synced to Zoho CRM');
            } else {
              console.warn('⚠️ Failed to sync to Zoho:', syncResult.error);
              // Don't fail the whole process if Zoho sync fails
            }
          } catch (syncError) {
            console.error('⚠️ Error syncing to Zoho (non-critical):', syncError);
            // Don't fail the whole process if Zoho sync fails
          }
        }

        // Mark profile as complete
        const completeSuccess = await authStore.markProfileComplete();
        
        if (completeSuccess) {
          toast({
            title: "Profile Complete!",
            description: "Your profile has been saved successfully.",
          });
          
          // Redirect to profile page
          router.push("/profile");
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to save profile. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show loader while waiting for Zoho data
  if (waitingForZoho || loadingStatus) {
    return (
      <div className="min-h-screen bg-[#E0E7FF] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Your Profile Data
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Fetching your information from Zoho CRM...
            </p>
            {zohoLoadAttempts > 0 && (
              <p className="text-xs text-gray-500">
                Attempt {zohoLoadAttempts} of 8
              </p>
            )}
            <div className="mt-6 w-full max-w-md">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min((zohoLoadAttempts / 8) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E0E7FF] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your information to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="John David Smith"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="input-email"
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
                  placeholder="+44 7700 900000"
                  required
                />
              </div>
            </div>
            
            {/* Address Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  data-testid="input-street"
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => handleChange("streetAddress", e.target.value)}
                  placeholder="123 Main Street"
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
                    placeholder="Sydney"
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
                    placeholder="NSW"
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
                    placeholder="2000"
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
                    placeholder="Australia"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                data-testid="button-save-profile"
                disabled={isSubmitting}
                className="bg-[#4F726B] hover:bg-[#4F726B]"
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
