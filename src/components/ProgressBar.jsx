import { Progress } from "@/components/ui/progress";

export function ProgressBar({ completed, total, className }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted-foreground">
          Progress: {completed} of {total} tasks completed
        </span>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
