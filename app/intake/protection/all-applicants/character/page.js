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

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

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
      criminal_record: "",
      visa_refusal_other_country: "",
      deportation: "",
      war_crimes: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_character || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, []);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("protection_character", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/character`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("protection_character", values);
    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrevious={handlePrevious}
        onSave={handleSave}
        onContinue={form.handleSubmit(onSubmit)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Character</h1>
          <p className="text-muted-foreground mt-2">
            Provide character information for all applicants.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Have you or any family member ever been convicted of a criminal offence in any country?</Label>
              <RadioGroup
                value={form.watch("criminal_record")}
                onValueChange={(value) => form.setValue("criminal_record", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`criminal-${option}`} data-testid={`radio-criminal-${option}`} />
                      <Label htmlFor={`criminal-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Have you or any family member been refused a visa to any country?</Label>
              <RadioGroup
                value={form.watch("visa_refusal_other_country")}
                onValueChange={(value) => form.setValue("visa_refusal_other_country", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`refusal-${option}`} data-testid={`radio-refusal-${option}`} />
                      <Label htmlFor={`refusal-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Have you or any family member been deported or removed from any country?</Label>
              <RadioGroup
                value={form.watch("deportation")}
                onValueChange={(value) => form.setValue("deportation", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`deportation-${option}`} data-testid={`radio-deportation-${option}`} />
                      <Label htmlFor={`deportation-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Have you or any family member been involved in war crimes, crimes against humanity, or genocide?</Label>
              <RadioGroup
                value={form.watch("war_crimes")}
                onValueChange={(value) => form.setValue("war_crimes", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`war-${option}`} data-testid={`radio-war-${option}`} />
                      <Label htmlFor={`war-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
