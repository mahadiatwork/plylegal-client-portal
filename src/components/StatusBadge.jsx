import { Badge } from "@/components/ui/badge";
import { Check, Clock, FileText, AlertCircle } from "lucide-react";

export function StatusBadge({ status, className }) {
  const config = getStatusConfig(status);
  
  return (
    <Badge 
      variant={config.variant}
      className={className}
      data-testid={`badge-status-${status.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div 
        className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
        style={{ backgroundColor: config.chipColor }}
      />
      <config.icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

function getStatusConfig(status) {
  if (!status) {
    return { variant: "secondary", icon: Clock, chipColor: "#9CA3AF" };
  }

  const statusLower = status.toLowerCase();
  
  // Zoho CRM Deal Stages with chip colors
  if (statusLower.includes("qualification")) {
    return { variant: "secondary", icon: Clock, chipColor: "#FCA5A5" }; // Light red
  }
  if (statusLower.includes("needs analysis")) {
    return { variant: "secondary", icon: Clock, chipColor: "#FDBA74" }; // Light orange
  }
  if (statusLower.includes("value proposition")) {
    return { variant: "secondary", icon: FileText, chipColor: "#FDE047" }; // Light yellow
  }
  if (statusLower.includes("identify decision makers") || statusLower.includes("decision makers")) {
    return { variant: "secondary", icon: FileText, chipColor: "#86EFAC" }; // Light green
  }
  if (statusLower.includes("proposal") || statusLower.includes("price quote")) {
    return { variant: "outline", icon: FileText, chipColor: "#93C5FD" }; // Light blue
  }
  if (statusLower.includes("negotiation") || statusLower.includes("review")) {
    return { variant: "outline", icon: FileText, chipColor: "#C4B5FD" }; // Light purple
  }
  if (statusLower.includes("closed won") || statusLower.includes("won")) {
    return { variant: "default", icon: Check, chipColor: "#22C55E" }; // Vibrant green
  }
  if (statusLower.includes("closed lost") || statusLower.includes("lost")) {
    return { variant: "destructive", icon: AlertCircle, chipColor: "#EF4444" }; // Solid red
  }
  
  // Legacy statuses for backward compatibility
  switch (status) {
    case "Active":
    case "Completed":
    case "Uploaded":
    case "Verified":
      return { variant: "default", icon: Check, chipColor: "#22C55E" };
    case "Draft":
    case "Pending":
      return { variant: "secondary", icon: Clock, chipColor: "#9CA3AF" };
    case "Submitted":
    case "Under Review":
    case "In progress":
      return { variant: "outline", icon: FileText, chipColor: "#3B82F6" };
    case "Rejected":
      return { variant: "destructive", icon: AlertCircle, chipColor: "#EF4444" };
    default:
      return { variant: "secondary", icon: Clock, chipColor: "#9CA3AF" }; // Default gray
  }
}
