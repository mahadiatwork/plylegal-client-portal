"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      // Update profile with all fields
      const updateSuccess = await authStore.updateProfile({
        name: formData.name,
        phone: formData.phone,
        streetAddress: formData.streetAddress,
        suburb: formData.suburb,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
      });
      
      if (updateSuccess) {
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
                className="bg-[#285646] hover:bg-[#1f4236]"
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
