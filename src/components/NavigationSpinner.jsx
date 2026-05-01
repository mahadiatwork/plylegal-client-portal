"use client";

export function NavigationSpinner({ size = "md" }) {
  const sizeClasses = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-24 h-24" : "w-12 h-12";
  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-10 h-10" : "w-6 h-6";

  return (
    <div className={`relative ${sizeClasses}`}>
      <svg
        className={`${sizeClasses} transform -rotate-90`}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#2D5A4F"
          strokeWidth="4"
          className="opacity-20"
        />
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
          style={{ animation: "spin 1.5s linear infinite" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className={`${iconSize} text-[#2D5A4F] opacity-40 animate-spin`}
          style={{ animation: "spin 2s linear infinite reverse" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
    </div>
  );
}
