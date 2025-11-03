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
      <config.icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

function getStatusConfig(status) {
  switch (status) {
    case "Active":
    case "Completed":
    case "Uploaded":
    case "Verified":
      return { variant: "default", icon: Check };
    case "Draft":
    case "Pending":
      return { variant: "secondary", icon: Clock };
    case "Submitted":
    case "Under Review":
    case "In progress":
      return { variant: "outline", icon: FileText };
    case "Rejected":
      return { variant: "destructive", icon: AlertCircle };
    default:
      return { variant: "secondary", icon: Clock };
  }
}
