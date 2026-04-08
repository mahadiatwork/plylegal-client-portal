"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

export const CITIZENSHIP_REASON_OPTIONS = ["Birth", "Descent", "Naturalisation"];

export const citizenshipDialogSchema = z
  .object({
    country: z.string().min(1, "Country is required"),
    how_obtained: z.string().min(1, "How obtained is required"),
    date_obtained_day: z.string().optional(),
    date_obtained_month: z.string().optional(),
    date_obtained_year: z.string().optional(),
    still_citizen: z.enum(["yes", "no"]).optional(),
    date_ceased_day: z.string().optional(),
    date_ceased_month: z.string().optional(),
    date_ceased_year: z.string().optional(),
    reason_ceased: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.still_citizen === "no") {
        return !!(
          data.date_ceased_year &&
          data.date_ceased_month &&
          data.date_ceased_day &&
          data.reason_ceased?.trim()
        );
      }
      return true;
    },
    {
      message: "Provide ceased date and reason if you are no longer a citizen",
      path: ["reason_ceased"],
    }
  );

export const citizenshipRowSchema = z.object({
  country: z.string(),
  how_obtained: z.string(),
  date_obtained_day: z.string().optional(),
  date_obtained_month: z.string().optional(),
  date_obtained_year: z.string().optional(),
  still_citizen: z.enum(["yes", "no"]).optional(),
  date_ceased_day: z.string().optional(),
  date_ceased_month: z.string().optional(),
  date_ceased_year: z.string().optional(),
  reason_ceased: z.string().optional(),
});

export function CitizenshipDialog({ editingRow: row, onSave: onSubmit, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(citizenshipDialogSchema),
    defaultValues:
      row || {
        country: "",
        how_obtained: "",
        date_obtained_day: "",
        date_obtained_month: "",
        date_obtained_year: "",
        still_citizen: "yes",
        date_ceased_day: "",
        date_ceased_month: "",
        date_ceased_year: "",
        reason_ceased: "",
      },
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="country">Country of Citizenship</Label>
        <Input
          id="country"
          {...dialogForm.register("country")}
          placeholder="Choose Country"
          data-testid="input-citizenship-country"
        />
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="how_obtained">How was this Citizenship obtained?</Label>
        <Select
          value={dialogForm.watch("how_obtained")}
          onValueChange={(value) => dialogForm.setValue("how_obtained", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-how-obtained">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent>
            {CITIZENSHIP_REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>
                {reason}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.how_obtained && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.how_obtained.message}</p>
        )}
      </div>

      <div>
        <Label>
          Date Obtained <span className="text-gray-500 font-normal">(optional but recommended)</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_obtained_day")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_day", value)}
          >
            <SelectTrigger data-testid="select-obtained-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_obtained_month")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_month", value)}
          >
            <SelectTrigger data-testid="select-obtained-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_obtained_year")}
            onValueChange={(value) => dialogForm.setValue("date_obtained_year", value)}
          >
            <SelectTrigger data-testid="select-obtained-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Are you still a citizen of this country?</Label>
        <RadioGroup
          value={dialogForm.watch("still_citizen")}
          onValueChange={(value) => dialogForm.setValue("still_citizen", value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="still-citizen-yes" />
            <Label htmlFor="still-citizen-yes" className="ml-2 cursor-pointer font-normal">
              Yes
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="still-citizen-no" />
            <Label htmlFor="still-citizen-no" className="ml-2 cursor-pointer font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      {dialogForm.watch("still_citizen") === "no" && (
        <div className="space-y-4">
          <div>
            <Label>Date ceased</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_ceased_day")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_day", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_ceased_month")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_month", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_ceased_year")}
                onValueChange={(value) => dialogForm.setValue("date_ceased_year", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Input {...dialogForm.register("reason_ceased")} placeholder="Enter reason citizenship ceased" />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleFormSubmit)} data-testid="button-ok">
          OK
        </Button>
      </DialogFooter>
    </div>
  );
}
