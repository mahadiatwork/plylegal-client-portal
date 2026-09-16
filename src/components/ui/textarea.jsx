"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useQuestionnaireCopy } from "@/components/questionnaire/QuestionnaireCopyContext";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  const translate = useQuestionnaireCopy("placeholders", props.name || props.id);
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
        "bg-[#E9F0FE]"
      )}
      ref={ref}
      {...props}
      placeholder={translate(props.placeholder)}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
