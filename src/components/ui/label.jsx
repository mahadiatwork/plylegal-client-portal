"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { translateQuestionnaireChildren, useQuestionnaireCopy } from "@/components/questionnaire/QuestionnaireCopyContext";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef(({ className, children, ...props }, ref) => {
  const translate = useQuestionnaireCopy("labels", props.htmlFor);
  return <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>{translateQuestionnaireChildren(children, translate)}</LabelPrimitive.Root>;
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
