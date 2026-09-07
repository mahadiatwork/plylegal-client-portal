"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const prevDobDialogSchema = z.object({
  date_of_birth_day: z.string().optional(),
  date_of_birth_month: z.string().optional(),
  date_of_birth_year: z.string().optional(),
  date_of_birth: z.string().optional(),
}).refine((data) => {
  // Either all three fields are provided OR date_of_birth is provided
  if (data.date_of_birth) return true;
  return !!(data.date_of_birth_day && data.date_of_birth_month && data.date_of_birth_year);
}, {
  message: "Please provide a complete date of birth",
  path: ["date_of_birth"]
});

export function PreviousDOBDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;

  // Parse existing date_of_birth if it's in ISO format
  const parseExistingDate = (dateStr) => {
    if (!dateStr) return { day: "", month: "", year: "" };
    const isoDate = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (isoDate) return { day: String(Number(isoDate[3])), month: String(Number(isoDate[2])), year: isoDate[1] };
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { day: "", month: "", year: "" };
      return {
        day: String(date.getDate()),
        month: String(date.getMonth() + 1),
        year: String(date.getFullYear()),
      };
    } catch {
      return { day: "", month: "", year: "" };
    }
  };

  const existingDate = row?.date_of_birth ? parseExistingDate(row.date_of_birth) : {
    day: String(Number(row?.date_of_birth_day) || ""),
    month: String(Number(row?.date_of_birth_month) || ""),
    year: String(row?.date_of_birth_year || ""),
  };

  const dialogForm = useForm({
    resolver: zodResolver(prevDobDialogSchema),
    defaultValues: row ? {
      date_of_birth_day: existingDate.day,
      date_of_birth_month: existingDate.month,
      date_of_birth_year: existingDate.year,
      date_of_birth: row.date_of_birth || "",
    } : {
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      date_of_birth: "",
    },
  });

  const handleFormSubmit = (data) => {
    // Construct date_of_birth from day/month/year if provided
    let dateOfBirth = data.date_of_birth;
    if (!dateOfBirth && data.date_of_birth_day && data.date_of_birth_month && data.date_of_birth_year) {
      const month = data.date_of_birth_month.padStart(2, '0');
      const day = data.date_of_birth_day.padStart(2, '0');
      dateOfBirth = `${data.date_of_birth_year}-${month}-${day}`;
    }
    onSave({
      ...row,
      date_of_birth: dateOfBirth,
      date_of_birth_day: data.date_of_birth_day,
      date_of_birth_month: data.date_of_birth_month,
      date_of_birth_year: data.date_of_birth_year,
    });
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dialogForm.handleSubmit(handleFormSubmit)(e);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  if (existingDate.year && !years.includes(existingDate.year)) years.push(existingDate.year);

  return (
    <div className="space-y-4">
      <div>
        <Label>Date of Birth <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <Select
              value={dialogForm.watch("date_of_birth_day") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("date_of_birth_day", value);
                dialogForm.setValue("date_of_birth", ""); // Clear the combined date when parts change
              }}
            >
              <SelectTrigger data-testid="select-dob-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={dialogForm.watch("date_of_birth_month") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("date_of_birth_month", value);
                dialogForm.setValue("date_of_birth", ""); // Clear the combined date when parts change
              }}
            >
              <SelectTrigger data-testid="select-dob-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={dialogForm.watch("date_of_birth_year") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("date_of_birth_year", value);
                dialogForm.setValue("date_of_birth", ""); // Clear the combined date when parts change
              }}
            >
              <SelectTrigger data-testid="select-dob-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {dialogForm.formState.errors.date_of_birth && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_birth.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-dob"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSaveClick}
          className="bg-[#4F726B] hover:bg-[#4F726B] text-white"
          data-testid="button-save-dob"
        >
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

