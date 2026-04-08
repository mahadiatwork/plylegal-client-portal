"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

export const OTHER_IDENTITY_DOC_TYPES = [
  "Birth certificate",
  "Drivers licence",
  "Marriage certificate",
  "Change of name certificate",
  "Military discharge certificate",
  "Other",
];

const schema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  document_type: z.string().min(1, "Document type is required"),
  identification_number: z.string().min(1, "Identification number is required"),
  country_of_issue: z.string().min(1, "Country of issue is required"),
});

export function SimplifiedOtherIdentityDialog({ editingRow: row, onSave: onSubmit, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(schema),
    defaultValues: row || {
      family_name: "",
      given_names: "",
      document_type: "",
      identification_number: "",
      country_of_issue: "",
    },
  });

  useEffect(() => {
    if (row) {
      dialogForm.reset(row);
    }
  }, [row]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <Label htmlFor="other-id-family">Family name</Label>
        <Input id="other-id-family" {...dialogForm.register("family_name")} />
        {dialogForm.formState.errors.family_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.family_name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="other-id-given">Given names</Label>
        <Input id="other-id-given" {...dialogForm.register("given_names")} />
        {dialogForm.formState.errors.given_names && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.given_names.message}</p>
        )}
      </div>
      <div>
        <Label>Type of document</Label>
        <Select
          value={dialogForm.watch("document_type")}
          onValueChange={(v) => dialogForm.setValue("document_type", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {OTHER_IDENTITY_DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_type.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="other-id-num">Identification number</Label>
        <Input id="other-id-num" {...dialogForm.register("identification_number")} />
        {dialogForm.formState.errors.identification_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.identification_number.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="other-id-country">Country of issue</Label>
        <Input id="other-id-country" {...dialogForm.register("country_of_issue")} placeholder="Country" />
        {dialogForm.formState.errors.country_of_issue && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_issue.message}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleFormSubmit)}>
          OK
        </Button>
      </DialogFooter>
    </div>
  );
}
