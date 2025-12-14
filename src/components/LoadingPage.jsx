"use client";

import { FileText, Star } from "lucide-react";

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-[#E0E7FF] flex items-center justify-center relative">
      {/* Main Loading Indicator */}
      <div className="flex flex-col items-center justify-center">
        {/* Circular Spinner with Document Icon */}
        <div className="relative w-24 h-24 mb-6">
          {/* Outer Circle (Progress Ring) */}
          <svg
            className="w-24 h-24 transform -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#2D5A4F"
              strokeWidth="4"
              className="opacity-20"
            />
            {/* Progress Arc - animated segment at top */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1a3d32"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * 0.85}`}
              className="animate-spin"
              style={{
                animation: "spin 1.5s linear infinite",
              }}
            />
          </svg>
          
          {/* Document Icon in Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText 
              className="w-10 h-10 text-[#2D5A4F] opacity-40" 
            />
          </div>
        </div>
        
        {/* Loading Text */}
        <p className="text-[#2D5A4F] text-lg font-medium">Loading...</p>
      </div>
      
      {/* Star Icon in Bottom Right */}
      <div className="absolute bottom-6 right-6">
        <Star className="w-5 h-5 text-white" fill="white" />
      </div>
    </div>
  );
}

