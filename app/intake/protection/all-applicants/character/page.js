"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Country list for dropdowns
const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
  "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

// Helper function to format dates
const formatDate = (day, month, year) => {
  if (!day || !month || !year) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[parseInt(month) - 1]} ${year}`;
};

// Dialog Schemas
const basicEntrySchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_day: z.string().min(1, "Day is required"),
  date_month: z.string().min(1, "Month is required"),
  date_year: z.string().min(1, "Year is required"),
  country: z.string().min(1, "Country is required"),
});

const basicEntryWithOffenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_day: z.string().min(1, "Day is required"),
  date_month: z.string().min(1, "Month is required"),
  date_year: z.string().min(1, "Year is required"),
  country: z.string().min(1, "Country is required"),
  offence_type: z.string().min(1, "Offence Type is required"),
});

const nameCountryOnlySchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
});

const dateRangeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  country: z.string().min(1, "Country is required"),
}).superRefine((data, ctx) => {
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date fields (Day, Month, Year) must be filled for Date To",
        path: ["date_to_day"],
      });
    } else {
      const fromDate = new Date(
        parseInt(data.date_from_year),
        parseInt(data.date_from_month) - 1,
        parseInt(data.date_from_day)
      );
      const toDate = new Date(
        parseInt(data.date_to_year),
        parseInt(data.date_to_month) - 1,
        parseInt(data.date_to_day)
      );
      
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date To must not be earlier than Date From",
          path: ["date_to_day"],
        });
      }
    }
  }
});

const policeClearanceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth_day: z.string().min(1, "Day is required"),
  date_of_birth_month: z.string().min(1, "Month is required"),
  date_of_birth_year: z.string().min(1, "Year is required"),
  date_of_application_day: z.string().min(1, "Day is required"),
  date_of_application_month: z.string().min(1, "Month is required"),
  date_of_application_year: z.string().min(1, "Year is required"),
  country: z.string().min(1, "Country is required"),
});

const immigrationDetentionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  centre_camp_name: z.string().min(1, "Name of Centre/Camp is required"),
  country: z.string().min(1, "Country is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date fields (Day, Month, Year) must be filled for Date To",
        path: ["date_to_day"],
      });
    } else {
      const fromDate = new Date(
        parseInt(data.date_from_year),
        parseInt(data.date_from_month) - 1,
        parseInt(data.date_from_day)
      );
      const toDate = new Date(
        parseInt(data.date_to_year),
        parseInt(data.date_to_month) - 1,
        parseInt(data.date_to_day)
      );
      
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date To must not be earlier than Date From",
          path: ["date_to_day"],
        });
      }
    }
  }
});

const militaryTrainingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth_day: z.string().min(1, "Day is required"),
  date_of_birth_month: z.string().min(1, "Month is required"),
  date_of_birth_year: z.string().min(1, "Year is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  country: z.string().min(1, "Country is required"),
}).superRefine((data, ctx) => {
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date fields (Day, Month, Year) must be filled for Date To",
        path: ["date_to_day"],
      });
    } else {
      const fromDate = new Date(
        parseInt(data.date_from_year),
        parseInt(data.date_from_month) - 1,
        parseInt(data.date_from_day)
      );
      const toDate = new Date(
        parseInt(data.date_to_year),
        parseInt(data.date_to_month) - 1,
        parseInt(data.date_to_day)
      );
      
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date To must not be earlier than Date From",
          path: ["date_to_day"],
        });
      }
    }
  }
});

const militaryServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth_day: z.string().min(1, "Day is required"),
  date_of_birth_month: z.string().min(1, "Month is required"),
  date_of_birth_year: z.string().min(1, "Year is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  country_of_service: z.string().min(1, "Country of Service is required"),
  country_of_deployment: z.string().min(1, "Country of Deployment is required"),
  position: z.string().min(1, "Position is required"),
}).superRefine((data, ctx) => {
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date fields (Day, Month, Year) must be filled for Date To",
        path: ["date_to_day"],
      });
    } else {
      const fromDate = new Date(
        parseInt(data.date_from_year),
        parseInt(data.date_from_month) - 1,
        parseInt(data.date_from_day)
      );
      const toDate = new Date(
        parseInt(data.date_to_year),
        parseInt(data.date_to_month) - 1,
        parseInt(data.date_to_day)
      );
      
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date To must not be earlier than Date From",
          path: ["date_to_day"],
        });
      }
    }
  }
});

const paymentBenefitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth_day: z.string().min(1, "Day is required"),
  date_of_birth_month: z.string().min(1, "Month is required"),
  date_of_birth_year: z.string().min(1, "Year is required"),
  details: z.string().min(1, "Details is required"),
});

// Dialog Components
function BasicEntryDialog({ editingRow, onSave, onCancel, subtitle }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(basicEntrySchema),
    defaultValues: row || {
      name: "",
      date_day: "",
      date_month: "",
      date_year: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_day")}
            onValueChange={(value) => dialogForm.setValue("date_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_month")}
            onValueChange={(value) => dialogForm.setValue("date_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_year")}
            onValueChange={(value) => dialogForm.setValue("date_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function BasicEntryWithOffenceDialog({ editingRow, onSave, onCancel, subtitle }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(basicEntryWithOffenceSchema),
    defaultValues: row || {
      name: "",
      date_day: "",
      date_month: "",
      date_year: "",
      country: "",
      offence_type: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_day")}
            onValueChange={(value) => dialogForm.setValue("date_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_month")}
            onValueChange={(value) => dialogForm.setValue("date_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_year")}
            onValueChange={(value) => dialogForm.setValue("date_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="offence_type" className="mb-2 block">
          Offence Type <span className="text-red-500">*</span>
        </Label>
        <Input
          id="offence_type"
          {...dialogForm.register("offence_type")}
          data-testid="input-offence-type"
        />
        {dialogForm.formState.errors.offence_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.offence_type.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function NameCountryOnlyDialog({ editingRow, onSave, onCancel, subtitle }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(nameCountryOnlySchema),
    defaultValues: row || {
      name: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function DateRangeEntryDialog({ editingRow, onSave, onCancel, subtitle }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(dateRangeSchema),
    defaultValues: row || {
      name: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date From <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_from_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date To (leave blank if ongoing)
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function PoliceClearanceDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(policeClearanceSchema),
    defaultValues: row || {
      name: "",
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      date_of_application_day: "",
      date_of_application_month: "",
      date_of_application_year: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter details of any applicant who is included in this application who has applied for a Police Clearance Certificate in the last 12 months
      </p>
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date of Birth <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_of_birth_day")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_day", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_month")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_month", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_year")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_year", value, { shouldValidate: true })}
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
        {dialogForm.formState.errors.date_of_birth_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_birth_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date of Application <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_of_application_day")}
            onValueChange={(value) => dialogForm.setValue("date_of_application_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-application-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_of_application_month")}
            onValueChange={(value) => dialogForm.setValue("date_of_application_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-application-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_of_application_year")}
            onValueChange={(value) => dialogForm.setValue("date_of_application_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-application-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_of_application_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_application_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function ImmigrationDetentionDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(immigrationDetentionSchema),
    defaultValues: row || {
      name: "",
      centre_camp_name: "",
      country: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter details of any applicant who is included in this application who has previously been in Immigration Detention, a Refugee Camp or Centre for Refugees
      </p>
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="centre_camp_name" className="mb-2 block">
          Name of Centre / Camp <span className="text-red-500">*</span>
        </Label>
        <Input
          id="centre_camp_name"
          {...dialogForm.register("centre_camp_name")}
          data-testid="input-centre-camp-name"
        />
        {dialogForm.formState.errors.centre_camp_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.centre_camp_name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date From <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_from_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date To (leave blank if ongoing)
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function MilitaryTrainingDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(militaryTrainingSchema),
    defaultValues: row || {
      name: "",
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter details of any applicant who is included in this application who has undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products
      </p>
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date of Birth <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_of_birth_day")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_day", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_month")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_month", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_year")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_year", value, { shouldValidate: true })}
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
        {dialogForm.formState.errors.date_of_birth_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_birth_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date From <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_from_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date To (leave blank if ongoing)
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function MilitaryServiceDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(militaryServiceSchema),
    defaultValues: row || {
      name: "",
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      country_of_service: "",
      country_of_deployment: "",
      position: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter details of any applicant who is included in this application who has ever served in a military force, police force, state sponsored militia, private militia, secret police or intelligence agency
      </p>
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date of Birth <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_of_birth_day")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_day", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_month")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_month", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_year")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_year", value, { shouldValidate: true })}
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
        {dialogForm.formState.errors.date_of_birth_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_birth_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date From <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_from_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date To (leave blank if ongoing)
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year") || "none"}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value === "none" ? "" : value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-to-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none">None</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country of Service <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country_of_service")}
          onValueChange={(value) => dialogForm.setValue("country_of_service", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country-of-service">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country_of_service && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_service.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Country of Deployment <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dialogForm.watch("country_of_deployment")}
          onValueChange={(value) => dialogForm.setValue("country_of_deployment", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-country-of-deployment">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country_of_deployment && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_deployment.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="position" className="mb-2 block">
          Position <span className="text-red-500">*</span>
        </Label>
        <Input
          id="position"
          {...dialogForm.register("position")}
          data-testid="input-position"
        />
        {dialogForm.formState.errors.position && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.position.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

function PaymentBenefitDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const dialogForm = useForm({
    resolver: zodResolver(paymentBenefitSchema),
    defaultValues: row || {
      name: "",
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      details: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter details of the payment or benefit made or offered
      </p>
      
      <div>
        <Label htmlFor="name" className="mb-2 block">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          data-testid="input-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">
          Date of Birth <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_of_birth_day")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_day", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_month")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_month", value, { shouldValidate: true })}
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
          <Select
            value={dialogForm.watch("date_of_birth_year")}
            onValueChange={(value) => dialogForm.setValue("date_of_birth_year", value, { shouldValidate: true })}
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
        {dialogForm.formState.errors.date_of_birth_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_birth_day.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="details" className="mb-2 block">
          Details <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="details"
          {...dialogForm.register("details")}
          rows={4}
          data-testid="textarea-details"
        />
        {dialogForm.formState.errors.details && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.details.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4336] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

// Main Form Schema with all 28 questions
const formSchema = z.object({
  // Question 1
  police_clearance: z.enum(["yes", "no"]).optional(),
  police_clearance_entries: z.array(policeClearanceSchema).optional(),
  
  // Question 2
  immigration_detention: z.enum(["yes", "no"]).optional(),
  immigration_detention_entries: z.array(immigrationDetentionSchema).optional(),
  
  // Question 3
  criminal_conviction: z.enum(["yes", "no"]).optional(),
  criminal_conviction_entries: z.array(basicEntryWithOffenceSchema).optional(),
  
  // Question 4
  charges_awaiting_action: z.enum(["yes", "no"]).optional(),
  charges_awaiting_action_entries: z.array(basicEntryWithOffenceSchema).optional(),
  
  // Question 5
  domestic_violence_order: z.enum(["yes", "no"]).optional(),
  domestic_violence_order_entries: z.array(basicEntrySchema).optional(),
  
  // Question 6
  outstanding_warrants: z.enum(["yes", "no"]).optional(),
  outstanding_warrants_entries: z.array(basicEntrySchema).optional(),
  
  // Question 7
  visa_refusal_australia: z.enum(["yes", "no"]).optional(),
  visa_refusal_australia_entries: z.array(basicEntrySchema).optional(),
  
  // Question 8
  visa_cancellation_australia: z.enum(["yes", "no"]).optional(),
  visa_cancellation_australia_entries: z.array(basicEntrySchema).optional(),
  
  // Question 9
  visa_refusal_other_country: z.enum(["yes", "no"]).optional(),
  visa_refusal_other_country_entries: z.array(basicEntrySchema).optional(),
  
  // Question 10
  deportation: z.enum(["yes", "no"]).optional(),
  deportation_entries: z.array(basicEntrySchema).optional(),
  
  // Question 11
  exclusion_removal: z.enum(["yes", "no"]).optional(),
  exclusion_removal_entries: z.array(basicEntrySchema).optional(),
  
  // Question 12
  military_training: z.enum(["yes", "no"]).optional(),
  military_training_entries: z.array(militaryTrainingSchema).optional(),
  
  // Question 13
  military_service: z.enum(["yes", "no"]).optional(),
  military_service_entries: z.array(militaryServiceSchema).optional(),
  
  // Question 14
  war_crimes: z.enum(["yes", "no"]).optional(),
  war_crimes_entries: z.array(nameCountryOnlySchema).optional(),
  
  // Question 15
  association_terrorist: z.enum(["yes", "no"]).optional(),
  association_terrorist_entries: z.array(nameCountryOnlySchema).optional(),
  
  // Question 16
  association_criminal: z.enum(["yes", "no"]).optional(),
  association_criminal_entries: z.array(nameCountryOnlySchema).optional(),
  
  // Question 17
  association_illegal_activity: z.enum(["yes", "no"]).optional(),
  association_illegal_activity_entries: z.array(nameCountryOnlySchema).optional(),
  
  // Question 18
  human_trafficking: z.enum(["yes", "no"]).optional(),
  human_trafficking_entries: z.array(nameCountryOnlySchema).optional(),
  
  // Question 19
  payment_benefit: z.enum(["yes", "no"]).optional(),
  payment_benefit_entries: z.array(paymentBenefitSchema).optional(),
  
  // Question 20
  false_documents: z.enum(["yes", "no"]).optional(),
  false_documents_entries: z.array(dateRangeSchema).optional(),
  
  // Question 21
  false_information: z.enum(["yes", "no"]).optional(),
  false_information_entries: z.array(dateRangeSchema).optional(),
  
  // Question 22
  identity_concealment: z.enum(["yes", "no"]).optional(),
  identity_concealment_entries: z.array(dateRangeSchema).optional(),
  
  // Question 23
  previous_application: z.enum(["yes", "no"]).optional(),
  previous_application_entries: z.array(dateRangeSchema).optional(),
  
  // Question 24
  removal_departure: z.enum(["yes", "no"]).optional(),
  removal_departure_entries: z.array(dateRangeSchema).optional(),
  
  // Question 25
  overstay: z.enum(["yes", "no"]).optional(),
  overstay_entries: z.array(dateRangeSchema).optional(),
  
  // Question 26
  breach_visa_conditions: z.enum(["yes", "no"]).optional(),
  breach_visa_conditions_entries: z.array(dateRangeSchema).optional(),
  
  // Question 27
  illegal_entry: z.enum(["yes", "no"]).optional(),
  illegal_entry_entries: z.array(dateRangeSchema).optional(),
  
  // Question 28
  other_character_issues: z.enum(["yes", "no"]).optional(),
  other_character_issues_entries: z.array(dateRangeSchema).optional(),
}).superRefine((data, ctx) => {
  // Validation: if Yes is selected, entries array must have at least one entry
  const questions = [
    { key: "police_clearance", entries: "police_clearance_entries" },
    { key: "immigration_detention", entries: "immigration_detention_entries" },
    { key: "criminal_conviction", entries: "criminal_conviction_entries" },
    { key: "charges_awaiting_action", entries: "charges_awaiting_action_entries" },
    { key: "domestic_violence_order", entries: "domestic_violence_order_entries" },
    { key: "outstanding_warrants", entries: "outstanding_warrants_entries" },
    { key: "visa_refusal_australia", entries: "visa_refusal_australia_entries" },
    { key: "visa_cancellation_australia", entries: "visa_cancellation_australia_entries" },
    { key: "visa_refusal_other_country", entries: "visa_refusal_other_country_entries" },
    { key: "deportation", entries: "deportation_entries" },
    { key: "exclusion_removal", entries: "exclusion_removal_entries" },
    { key: "military_training", entries: "military_training_entries" },
    { key: "military_service", entries: "military_service_entries" },
    { key: "war_crimes", entries: "war_crimes_entries" },
    { key: "association_terrorist", entries: "association_terrorist_entries" },
    { key: "association_criminal", entries: "association_criminal_entries" },
    { key: "association_illegal_activity", entries: "association_illegal_activity_entries" },
    { key: "human_trafficking", entries: "human_trafficking_entries" },
    { key: "payment_benefit", entries: "payment_benefit_entries" },
    { key: "false_documents", entries: "false_documents_entries" },
    { key: "false_information", entries: "false_information_entries" },
    { key: "identity_concealment", entries: "identity_concealment_entries" },
    { key: "previous_application", entries: "previous_application_entries" },
    { key: "removal_departure", entries: "removal_departure_entries" },
    { key: "overstay", entries: "overstay_entries" },
    { key: "breach_visa_conditions", entries: "breach_visa_conditions_entries" },
    { key: "illegal_entry", entries: "illegal_entry_entries" },
    { key: "other_character_issues", entries: "other_character_issues_entries" },
  ];
  
  questions.forEach(({ key, entries }) => {
    if (data[key] === "yes" && (!data[entries] || data[entries].length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Please add at least one entry for this question`,
        path: [entries],
      });
    }
  });
});

// Helper component to render a question with conditional table
function CharacterQuestion({
  questionText,
  fieldName,
  form,
  title,
  helpText,
  columns,
  DialogComponent,
  dialogSubtitle,
}) {
  const value = form.watch(fieldName);
  const entries = form.watch(`${fieldName}_entries`) || [];
  
  const handlers = {
    onAdd: (newRow) => {
      form.setValue(`${fieldName}_entries`, [...entries, newRow]);
    },
    onEdit: (index, updatedRow) => {
      const updated = [...entries];
      updated[index] = updatedRow;
      form.setValue(`${fieldName}_entries`, updated);
    },
    onDelete: (index) => {
      form.setValue(`${fieldName}_entries`, entries.filter((_, i) => i !== index));
    },
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{questionText}</Label>
        <RadioGroup
          value={value || ""}
          onValueChange={(selectedValue) => {
            form.setValue(fieldName, selectedValue);
            if (selectedValue === "no") {
              form.setValue(`${fieldName}_entries`, []);
            }
          }}
        >
          <div className="flex gap-4">
            {["yes", "no"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldName}-${option}`} />
                <Label htmlFor={`${fieldName}-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
      {value === "yes" && (
        <RepeaterTable
          title={title}
          helpText={helpText}
          data={entries}
          columns={columns}
          onAdd={handlers.onAdd}
          onEdit={handlers.onEdit}
          onDelete={handlers.onDelete}
          DialogComponent={(props) => <DialogComponent {...props} subtitle={dialogSubtitle} />}
        />
      )}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      police_clearance: "",
      police_clearance_entries: [],
      immigration_detention: "",
      immigration_detention_entries: [],
      criminal_conviction: "",
      criminal_conviction_entries: [],
      charges_awaiting_action: "",
      charges_awaiting_action_entries: [],
      domestic_violence_order: "",
      domestic_violence_order_entries: [],
      outstanding_warrants: "",
      outstanding_warrants_entries: [],
      visa_refusal_australia: "",
      visa_refusal_australia_entries: [],
      visa_cancellation_australia: "",
      visa_cancellation_australia_entries: [],
      visa_refusal_other_country: "",
      visa_refusal_other_country_entries: [],
      deportation: "",
      deportation_entries: [],
      exclusion_removal: "",
      exclusion_removal_entries: [],
      military_training: "",
      military_training_entries: [],
      military_service: "",
      military_service_entries: [],
      war_crimes: "",
      war_crimes_entries: [],
      association_terrorist: "",
      association_terrorist_entries: [],
      association_criminal: "",
      association_criminal_entries: [],
      association_illegal_activity: "",
      association_illegal_activity_entries: [],
      human_trafficking: "",
      human_trafficking_entries: [],
      payment_benefit: "",
      payment_benefit_entries: [],
      false_documents: "",
      false_documents_entries: [],
      false_information: "",
      false_information_entries: [],
      identity_concealment: "",
      identity_concealment_entries: [],
      previous_application: "",
      previous_application_entries: [],
      removal_departure: "",
      removal_departure_entries: [],
      overstay: "",
      overstay_entries: [],
      breach_visa_conditions: "",
      breach_visa_conditions_entries: [],
      illegal_entry: "",
      illegal_entry_entries: [],
      other_character_issues: "",
      other_character_issues_entries: [],
    },
  });

  // Load saved data
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_character || {};
    if (Object.keys(savedData).length > 0) {
      // Merge saved data with default values to ensure all fields are set
      const formData = {
        police_clearance: savedData.police_clearance || "",
        police_clearance_entries: savedData.police_clearance_entries || [],
        immigration_detention: savedData.immigration_detention || "",
        immigration_detention_entries: savedData.immigration_detention_entries || [],
        criminal_conviction: savedData.criminal_conviction || "",
        criminal_conviction_entries: savedData.criminal_conviction_entries || [],
        charges_awaiting_action: savedData.charges_awaiting_action || "",
        charges_awaiting_action_entries: savedData.charges_awaiting_action_entries || [],
        domestic_violence_order: savedData.domestic_violence_order || "",
        domestic_violence_order_entries: savedData.domestic_violence_order_entries || [],
        outstanding_warrants: savedData.outstanding_warrants || "",
        outstanding_warrants_entries: savedData.outstanding_warrants_entries || [],
        visa_refusal_australia: savedData.visa_refusal_australia || "",
        visa_refusal_australia_entries: savedData.visa_refusal_australia_entries || [],
        visa_cancellation_australia: savedData.visa_cancellation_australia || "",
        visa_cancellation_australia_entries: savedData.visa_cancellation_australia_entries || [],
        visa_refusal_other_country: savedData.visa_refusal_other_country || "",
        visa_refusal_other_country_entries: savedData.visa_refusal_other_country_entries || [],
        deportation: savedData.deportation || "",
        deportation_entries: savedData.deportation_entries || [],
        exclusion_removal: savedData.exclusion_removal || "",
        exclusion_removal_entries: savedData.exclusion_removal_entries || [],
        military_training: savedData.military_training || "",
        military_training_entries: savedData.military_training_entries || [],
        military_service: savedData.military_service || "",
        military_service_entries: savedData.military_service_entries || [],
        war_crimes: savedData.war_crimes || "",
        war_crimes_entries: savedData.war_crimes_entries || [],
        association_terrorist: savedData.association_terrorist || "",
        association_terrorist_entries: savedData.association_terrorist_entries || [],
        association_criminal: savedData.association_criminal || "",
        association_criminal_entries: savedData.association_criminal_entries || [],
        association_illegal_activity: savedData.association_illegal_activity || "",
        association_illegal_activity_entries: savedData.association_illegal_activity_entries || [],
        human_trafficking: savedData.human_trafficking || "",
        human_trafficking_entries: savedData.human_trafficking_entries || [],
        payment_benefit: savedData.payment_benefit || "",
        payment_benefit_entries: savedData.payment_benefit_entries || [],
        false_documents: savedData.false_documents || "",
        false_documents_entries: savedData.false_documents_entries || [],
        false_information: savedData.false_information || "",
        false_information_entries: savedData.false_information_entries || [],
        identity_concealment: savedData.identity_concealment || "",
        identity_concealment_entries: savedData.identity_concealment_entries || [],
        previous_application: savedData.previous_application || "",
        previous_application_entries: savedData.previous_application_entries || [],
        removal_departure: savedData.removal_departure || "",
        removal_departure_entries: savedData.removal_departure_entries || [],
        overstay: savedData.overstay || "",
        overstay_entries: savedData.overstay_entries || [],
        breach_visa_conditions: savedData.breach_visa_conditions || "",
        breach_visa_conditions_entries: savedData.breach_visa_conditions_entries || [],
        illegal_entry: savedData.illegal_entry || "",
        illegal_entry_entries: savedData.illegal_entry_entries || [],
        other_character_issues: savedData.other_character_issues || "",
        other_character_issues_entries: savedData.other_character_issues_entries || [],
      };
      
      // Use reset to properly update all form fields (including Select components)
      form.reset(formData);
    }
  }, [draftSnap.draft?.protection_character]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("protection_character", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/character`);
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      if (next) router.push(next);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate form before saving
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        return;
      }
      
      const formData = form.getValues();
      console.log("Saving protection_character data:", formData); // Debug log
      const result = await draftStore.saveSectionData("protection_character", formData);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error); // Debug log
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error); // Debug log
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrev={handlePrevious}
        onSave={handleSave}
        onNext={form.handleSubmit(onSubmit)}
        loading={isSaving}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Character</h1>
          <p className="text-muted-foreground mt-2">
            In this section you are to provide character information for the following included Applicants:
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-8">
            {/* Question 1: Police Clearance Certificate */}
            <CharacterQuestion
              questionText="Has anyone who is to be included in this application applied for a Police Clearance Certificate in the last 12 months?"
              fieldName="police_clearance"
              form={form}
              title="Police Clearance Certificates"
              helpText="Enter details of any applicant who is included in this application who has applied for a Police Clearance Certificate in the last 12 months"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_of_birth", label: "Date of Birth", format: (row) => formatDate(row.date_of_birth_day, row.date_of_birth_month, row.date_of_birth_year) },
                { key: "date_of_application", label: "Date of Application", format: (row) => formatDate(row.date_of_application_day, row.date_of_application_month, row.date_of_application_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={PoliceClearanceDialog}
            />

            {/* Question 2: Immigration Detention */}
            <CharacterQuestion
              questionText="Has anyone who is to be included in this application previously been in Immigration Detention, a Refugee Camp or Centre for Refugees?"
              fieldName="immigration_detention"
              form={form}
              title="Immigration Detention / Refugee Camp / Centre for Refugees"
              helpText="Enter details of any applicant who is included in this application who has previously been in Immigration Detention, a Refugee Camp or Centre for Refugees"
              columns={[
                { key: "name", label: "Name" },
                { key: "centre_camp_name", label: "Name of Centre / Camp" },
                { key: "country", label: "Country" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
              ]}
              DialogComponent={ImmigrationDetentionDialog}
            />

            {/* Question 3: Criminal Conviction */}
            <CharacterQuestion
              questionText="Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)? If in doubt, click Yes."
              fieldName="criminal_conviction"
              form={form}
              title="Criminal Convictions"
              helpText="Enter details of any applicant who is included in this application who has ever been convicted of an offence"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
                { key: "offence_type", label: "Offence Type" },
              ]}
              DialogComponent={BasicEntryWithOffenceDialog}
              dialogSubtitle="Enter details of the criminal conviction"
            />

            {/* Continue with remaining 25 questions... */}
            {/* For brevity, I'll add a few more key questions and note that the pattern continues */}
            
            {/* Question 4: Charges Awaiting Action */}
            <CharacterQuestion
              questionText="Has any applicant ever been charged with any offence in any country that is currently awaiting legal action? If in doubt, click Yes."
              fieldName="charges_awaiting_action"
              form={form}
              title="Charges Awaiting Legal Action"
              helpText="Enter details of any applicant who is included in this application who has been charged with any offence that is currently awaiting legal action"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
                { key: "offence_type", label: "Offence Type" },
              ]}
              DialogComponent={BasicEntryWithOffenceDialog}
              dialogSubtitle="Enter details of the charge awaiting legal action"
            />

            {/* Question 5: Domestic Violence Order */}
            <CharacterQuestion
              questionText="Has any applicant who is included in this application ever been the subject of a domestic violence or family violence order, or any other order, of a tribunal or court or other similar authority, for the personal protection of another person?"
              fieldName="domestic_violence_order"
              form={form}
              title="Domestic/Family Violence Orders"
              helpText="Enter details of any applicant who has been the subject of a domestic violence or family violence order"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the domestic/family violence order"
            />

            {/* Question 6: Outstanding Warrants */}
            <CharacterQuestion
              questionText="Has any applicant ever had any outstanding warrants for their arrest in any country?"
              fieldName="outstanding_warrants"
              form={form}
              title="Outstanding Warrants"
              helpText="Enter details of any applicant who has outstanding warrants for their arrest"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the outstanding warrant"
            />

            {/* Question 7: Visa Refusal Australia */}
            <CharacterQuestion
              questionText="Has any applicant ever been refused a visa or entry permit to Australia?"
              fieldName="visa_refusal_australia"
              form={form}
              title="Visa Refusals - Australia"
              helpText="Enter details of any applicant who has been refused a visa or entry permit to Australia"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the visa refusal"
            />

            {/* Question 8: Visa Cancellation Australia */}
            <CharacterQuestion
              questionText="Has any applicant ever had a visa or entry permit cancelled in Australia?"
              fieldName="visa_cancellation_australia"
              form={form}
              title="Visa Cancellations - Australia"
              helpText="Enter details of any applicant who has had a visa or entry permit cancelled in Australia"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the visa cancellation"
            />

            {/* Question 9: Visa Refusal Other Country */}
            <CharacterQuestion
              questionText="Has any applicant ever been refused a visa or entry permit to any country other than Australia?"
              fieldName="visa_refusal_other_country"
              form={form}
              title="Visa Refusals - Other Countries"
              helpText="Enter details of any applicant who has been refused a visa or entry permit to any country other than Australia"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the visa refusal"
            />

            {/* Question 10: Deportation */}
            <CharacterQuestion
              questionText="Has any applicant ever been deported or removed from any country?"
              fieldName="deportation"
              form={form}
              title="Deportations / Removals"
              helpText="Enter details of any applicant who has been deported or removed from any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the deportation or removal"
            />

            {/* Question 11: Exclusion/Removal */}
            <CharacterQuestion
              questionText="Has any applicant ever been excluded from or asked to leave any country?"
              fieldName="exclusion_removal"
              form={form}
              title="Exclusions / Requests to Leave"
              helpText="Enter details of any applicant who has been excluded from or asked to leave any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date", label: "Date", format: (row) => formatDate(row.date_day, row.date_month, row.date_year) },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={BasicEntryDialog}
              dialogSubtitle="Enter details of the exclusion or request to leave"
            />

            {/* Question 12: Military Training */}
            <CharacterQuestion
              questionText="Has any applicant undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?"
              fieldName="military_training"
              form={form}
              title="Military/Paramilitary Training"
              helpText="Enter details of any applicant who has undergone military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_of_birth", label: "Date of Birth", format: (row) => formatDate(row.date_of_birth_day, row.date_of_birth_month, row.date_of_birth_year) },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={MilitaryTrainingDialog}
            />

            {/* Question 13: Military Service */}
            <CharacterQuestion
              questionText="Has any applicant ever served in a military force, police force, state sponsored militia, private militia, secret police or intelligence agency?"
              fieldName="military_service"
              form={form}
              title="Military/Police/Intelligence Service"
              helpText="Enter details of any applicant who has ever served in a military force, police force, state sponsored militia, private militia, secret police or intelligence agency"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_of_birth", label: "Date of Birth", format: (row) => formatDate(row.date_of_birth_day, row.date_of_birth_month, row.date_of_birth_year) },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country_of_service", label: "Country of Service" },
                { key: "country_of_deployment", label: "Country of Deployment" },
                { key: "position", label: "Position" },
              ]}
              DialogComponent={MilitaryServiceDialog}
            />

            {/* Question 14: War Crimes */}
            <CharacterQuestion
              questionText="Has any applicant been involved in war crimes, crimes against humanity, or genocide?"
              fieldName="war_crimes"
              form={form}
              title="War Crimes / Crimes Against Humanity / Genocide"
              helpText="Enter details of any applicant who has been involved in war crimes, crimes against humanity, or genocide"
              columns={[
                { key: "name", label: "Name" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={NameCountryOnlyDialog}
              dialogSubtitle="Enter details of the war crimes, crimes against humanity, or genocide"
            />

            {/* Question 15: Association Terrorist */}
            <CharacterQuestion
              questionText="Has any applicant ever been associated with an organisation engaged in violence or engaged in acts of violence (including war, insurgency, freedom fighting, terrorism, protest) either overseas or in Australia?"
              fieldName="association_terrorist"
              form={form}
              title="Association with Violent Organizations"
              helpText="Enter details of any applicant who has been associated with an organisation engaged in violence or engaged in acts of violence"
              columns={[
                { key: "name", label: "Name" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={NameCountryOnlyDialog}
              dialogSubtitle="Enter details of the association with violent organizations"
            />

            {/* Question 16: Association Criminal */}
            <CharacterQuestion
              questionText="Has any applicant been associated with a person, group or organisation that has been/is involved in criminal conduct?"
              fieldName="association_criminal"
              form={form}
              title="Association with Criminal Conduct"
              helpText="Enter details of any applicant who has been associated with a person, group or organisation involved in criminal conduct"
              columns={[
                { key: "name", label: "Name" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={NameCountryOnlyDialog}
              dialogSubtitle="Enter details of the association with criminal conduct"
            />

            {/* Question 17: Association Illegal Activity */}
            <CharacterQuestion
              questionText="Has any applicant been associated with a person, group or organisation that has been/is involved in illegal activity?"
              fieldName="association_illegal_activity"
              form={form}
              title="Association with Illegal Activity"
              helpText="Enter details of any applicant who has been associated with a person, group or organisation involved in illegal activity"
              columns={[
                { key: "name", label: "Name" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={NameCountryOnlyDialog}
              dialogSubtitle="Enter details of the association with illegal activity"
            />

            {/* Question 18: Human Trafficking */}
            <CharacterQuestion
              questionText="Has any applicant ever been involved in people smuggling or people trafficking offences? If in doubt, click Yes."
              fieldName="human_trafficking"
              form={form}
              title="People Smuggling / People Trafficking"
              helpText="Enter details of any applicant who has been involved in people smuggling or people trafficking offences"
              columns={[
                { key: "name", label: "Name" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={NameCountryOnlyDialog}
              dialogSubtitle="Enter details of the people smuggling or people trafficking involvement"
            />

            {/* Question 19: Payment/Benefit */}
            <CharacterQuestion
              questionText="Has any person included in this application made or offered to make a payment or provide another benefit of any kind to another person or entity in return for the sponsorship, nomination or support for an Australian visa?"
              fieldName="payment_benefit"
              form={form}
              title="Payments / Benefits for Visa Support"
              helpText="Enter details of any payment or benefit made or offered for visa sponsorship, nomination or support"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_of_birth", label: "Date of Birth", format: (row) => formatDate(row.date_of_birth_day, row.date_of_birth_month, row.date_of_birth_year) },
                { key: "details", label: "Details" },
              ]}
              DialogComponent={PaymentBenefitDialog}
            />

            {/* Question 20: False Documents */}
            <CharacterQuestion
              questionText="Has any applicant ever provided false or misleading documents in relation to a visa application or entry to any country?"
              fieldName="false_documents"
              form={form}
              title="False or Misleading Documents"
              helpText="Enter details of any applicant who has provided false or misleading documents in relation to a visa application or entry to any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the false or misleading documents"
            />

            {/* Question 21: False Information */}
            <CharacterQuestion
              questionText="Has any applicant ever provided false or misleading information in relation to a visa application or entry to any country?"
              fieldName="false_information"
              form={form}
              title="False or Misleading Information"
              helpText="Enter details of any applicant who has provided false or misleading information in relation to a visa application or entry to any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the false or misleading information"
            />

            {/* Question 22: Identity Concealment */}
            <CharacterQuestion
              questionText="Has any applicant ever concealed their identity or used a false identity in relation to a visa application or entry to any country?"
              fieldName="identity_concealment"
              form={form}
              title="Identity Concealment / False Identity"
              helpText="Enter details of any applicant who has concealed their identity or used a false identity in relation to a visa application or entry to any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the identity concealment or false identity"
            />

            {/* Question 23: Previous Application */}
            <CharacterQuestion
              questionText="Has any applicant ever made a previous application for a visa or entry permit to any country that was not disclosed?"
              fieldName="previous_application"
              form={form}
              title="Undisclosed Previous Applications"
              helpText="Enter details of any applicant who has made a previous application for a visa or entry permit that was not disclosed"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the undisclosed previous application"
            />

            {/* Question 24: Removal/Departure */}
            <CharacterQuestion
              questionText="Has any applicant ever left any country to avoid being removed or deported from that country?"
              fieldName="removal_departure"
              form={form}
              title="Departure to Avoid Removal/Deportation"
              helpText="Enter details of any applicant who has left any country to avoid being removed or deported"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the departure to avoid removal or deportation"
            />

            {/* Question 25: Overstay */}
            <CharacterQuestion
              questionText="Has any applicant ever overstayed a visa or entry permit in any country?"
              fieldName="overstay"
              form={form}
              title="Visa/Entry Permit Overstays"
              helpText="Enter details of any applicant who has overstayed a visa or entry permit in any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the visa or entry permit overstay"
            />

            {/* Question 26: Breach Visa Conditions */}
            <CharacterQuestion
              questionText="Has any applicant ever breached the conditions of a visa or entry permit in any country?"
              fieldName="breach_visa_conditions"
              form={form}
              title="Breach of Visa/Entry Permit Conditions"
              helpText="Enter details of any applicant who has breached the conditions of a visa or entry permit in any country"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the breach of visa or entry permit conditions"
            />

            {/* Question 27: Illegal Entry */}
            <CharacterQuestion
              questionText="Has any applicant ever entered any country illegally or without proper authorisation?"
              fieldName="illegal_entry"
              form={form}
              title="Illegal Entry / Entry Without Authorisation"
              helpText="Enter details of any applicant who has entered any country illegally or without proper authorisation"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the illegal entry or entry without authorisation"
            />

            {/* Question 28: Other Character Issues */}
            <CharacterQuestion
              questionText="Is there any other information about the character of any applicant that should be disclosed?"
              fieldName="other_character_issues"
              form={form}
              title="Other Character Issues"
              helpText="Enter details of any other character-related information that should be disclosed"
              columns={[
                { key: "name", label: "Name" },
                { key: "date_from", label: "Date From", format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year) },
                { key: "date_to", label: "Date To", format: (row) => row.date_to_day && row.date_to_month && row.date_to_year ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year) : "Ongoing" },
                { key: "country", label: "Country" },
              ]}
              DialogComponent={DateRangeEntryDialog}
              dialogSubtitle="Enter details of the other character issue"
            />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                className="min-h-9"
                data-testid="button-previous"
              >
                ← Previous
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="min-h-9"
                  data-testid="button-save"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </Button>
                <Button
                  type="submit"
                  className="min-h-9 bg-[#285646] hover:bg-[#1e4336] text-white"
                  data-testid="button-continue"
                >
                  Continue →
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
