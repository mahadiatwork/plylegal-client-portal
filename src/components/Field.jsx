"use client";

import { useController } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field(props) {
  const { field, fieldState } = useController({
    name: props.name,
    control: props.control,
  });

  const errorId = fieldState.error ? `${props.name}-error` : undefined;
  const descriptionId = props.description ? `${props.name}-description` : undefined;

  if (props.type === "textarea") {
    return (
      <div className={cn("space-y-2", props.className)}>
        <Label htmlFor={props.name} className="text-sm font-medium">
          {props.label}
          {props.required && <span className="text-red-600 ml-1">*</span>}
        </Label>
        {props.description && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {props.description}
          </p>
        )}
        <Textarea
          id={props.name}
          data-testid={`textarea-${props.name}`}
          {...field}
          value={field.value || ""}
          placeholder={props.placeholder}
          rows={props.rows || 4}
          aria-describedby={cn(descriptionId, errorId)}
          aria-invalid={!!fieldState.error}
          className={cn(
            "resize-none border-2 focus:ring-2 focus:ring-[#022C22]/20 transition-colors",
            fieldState.error && "border-red-600 focus:ring-red-600/20"
          )}
        />
        {fieldState.error && (
          <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {fieldState.error.message}
          </p>
        )}
      </div>
    );
  }

  if (props.type === "select") {
    return (
      <div className={cn("space-y-2", props.className)}>
        <Label htmlFor={props.name} className="text-sm font-medium">
          {props.label}
          {props.required && <span className="text-red-600 ml-1">*</span>}
        </Label>
        {props.description && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {props.description}
          </p>
        )}
        <Select
          value={field.value || ""}
          onValueChange={field.onChange}
        >
          <SelectTrigger
            id={props.name}
            data-testid={`select-${props.name}`}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={!!fieldState.error}
            className={cn(
              "border-2 focus:ring-2 focus:ring-[#022C22]/20 transition-colors",
              fieldState.error && "border-red-600 focus:ring-red-600/20"
            )}
          >
            <SelectValue placeholder={props.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {props.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldState.error && (
          <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {fieldState.error.message}
          </p>
        )}
      </div>
    );
  }

  if (props.type === "radio") {
    return (
      <div className={cn("space-y-3", props.className)}>
        <Label className="text-sm font-medium">
          {props.label}
          {props.required && <span className="text-red-600 ml-1">*</span>}
        </Label>
        {props.description && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {props.description}
          </p>
        )}
        <RadioGroup
          value={field.value || ""}
          onValueChange={field.onChange}
          aria-describedby={cn(descriptionId, errorId)}
          aria-invalid={!!fieldState.error}
          className="flex flex-col sm:flex-row gap-4"
        >
          {props.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`${props.name}-${option.value}`}
                data-testid={`radio-${props.name}-${option.value}`}
              />
              <Label
                htmlFor={`${props.name}-${option.value}`}
                className="font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {fieldState.error && (
          <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {fieldState.error.message}
          </p>
        )}
      </div>
    );
  }

  if (props.type === "checkbox") {
    return (
      <div className={cn("flex items-start space-x-3", props.className)}>
        <Checkbox
          id={props.name}
          data-testid={`checkbox-${props.name}`}
          checked={field.value || false}
          onCheckedChange={field.onChange}
          aria-describedby={cn(descriptionId, errorId)}
          aria-invalid={!!fieldState.error}
          className={cn(
            "mt-1",
            fieldState.error && "border-red-600"
          )}
        />
        <div className="space-y-1 leading-none">
          <Label
            htmlFor={props.name}
            className="text-sm font-medium cursor-pointer"
          >
            {props.label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </Label>
          {props.description && (
            <p id={descriptionId} className="text-sm text-gray-600">
              {props.description}
            </p>
          )}
          {fieldState.error && (
            <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
              <span className="inline-block">⚠</span> {fieldState.error.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Input field (text, email, tel, date, number)
  return (
    <div className={cn("space-y-2", props.className)}>
      <Label htmlFor={props.name} className="text-sm font-medium">
        {props.label}
        {props.required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {props.description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {props.description}
        </p>
      )}
      <Input
        id={props.name}
        data-testid={`input-${props.name}`}
        type={props.type}
        {...field}
        value={field.value || ""}
        placeholder={props.placeholder}
        aria-describedby={cn(descriptionId, errorId)}
        aria-invalid={!!fieldState.error}
        className={cn(
          "border-2 focus:ring-2 focus:ring-[#022C22]/20 transition-colors h-11",
          fieldState.error && "border-red-600 focus:ring-red-600/20"
        )}
      />
      {fieldState.error && (
        <p id={errorId} className="text-sm text-red-600 flex items-center gap-1">
          <span className="inline-block">⚠</span> {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
