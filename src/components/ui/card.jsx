"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { translateQuestionnaireChildren, useQuestionnaireCopy } from "@/components/questionnaire/QuestionnaireCopyContext";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "shadcn-card rounded-xl border bg-card border-card-border text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => {
  const translate = useQuestionnaireCopy("body");
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>{translateQuestionnaireChildren(children, translate)}</div>;
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, style, children, ...props }, ref) => {
  const translate = useQuestionnaireCopy("title");
  return (
  <div
    ref={ref}
    className={cn(
      "font-heading text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    style={{
      ...style,
      fontFamily: "var(--font-heading)",
      fontWeight: 600,
    }}
    {...props}
  >{translateQuestionnaireChildren(children, translate)}</div>
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const translate = useQuestionnaireCopy("body");
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>{translateQuestionnaireChildren(children, translate)}</div>;
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
