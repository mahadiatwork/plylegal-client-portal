"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/reuseable/countries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const CHARACTER_QUESTIONS = [
  {
    key: "convicted_child_offence",
    label: "Has your Sponsor specifically been convicted of a crime or offence in any country (including any conviction which is removed from official records), relating to persons under the age of 18, including but not limited to: child abuse, child sex, endangering a child, indecent dealings with a child, or possession of child pornography?",
  },
  {
    key: "charged_child_offence",
    label: "Has your Sponsor specifically been charged with any offence that is currently awaiting legal action in any country relating to persons under the age of 18, including but not limited to: child abuse, child sex, endangering a child, indecent dealings with a child, or possession of child pornography?",
  },
  {
    key: "convicted_general_offence",
    label: "In addition to any offence disclosed above, has your Sponsor been convicted of a crime or offence* in any country (including any conviction removed from official records)? *This may include traffic and other non criminal offences. If in doubt, click yes.",
  },
  {
    key: "charged_general_offence",
    label: "In addition to any offence disclosed above, has your Sponsor been charged with any offence* in any country that is currently awaiting legal action? *This may include traffic and other non criminal offences. If in doubt, click yes.",
  },
  {
    key: "acquitted_mental_illness",
    label: "Has your Sponsor been acquitted of any offence* on the grounds of mental illness, insanity or unsoundness of mind? *This may include traffic and other non criminal offences? If in doubt, click yes.",
  },
  {
    key: "removed_deported",
    label: "Has your Sponsor been removed or deported from any country?",
  },
  {
    key: "left_to_avoid_removal",
    label: "Has your Sponsor left any country to avoid being removed or deported from that country?",
  },
  {
    key: "excluded_from_country",
    label: "Has your Sponsor been excluded from or asked to leave any country?",
  },
  {
    key: "war_crimes",
    label: "Has your Sponsor committed or been involved in the commission of war crimes against humanity or human rights?",
  },
  {
    key: "national_security_risk",
    label: "Has your Sponsor been involved in any activities that would represent a risk to Australian national security or any other country?",
  },
  {
    key: "outstanding_debts",
    label: "Has your Sponsor had an outstanding debt to the Australian Government or any public authority in Australia?",
  },
  {
    key: "people_smuggling",
    label: "Has your Sponsor been involved in any activity or been convicted of any offence relating to the illegal movement of people to any country?",
  },
  {
    key: "military_training",
    label: "Has your Sponsor undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?",
  },
  {
    key: "military_service",
    label: "Has your Sponsor ever served in a military force, police force, state sponsored militia, private militia, secret police or intelligence agency?",
  },
];
function CriminalConductDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { applicant_name: "", country: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Involvement with Criminal Conduct</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant who is included in this application who has been associated with a person, group or
        organisation that has been/is involved in criminal conduct
      </p>
      <div>
        <Label className="mb-2 block">Name of Applicant <span className="text-red-600">*</span></Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
function ViolentOrganizationDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    country: z.string().optional(),
    date_day: z.string().optional(),
    date_month: z.string().optional(),
    date_year: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { country: "", date_day: "", date_month: "", date_year: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Association with Violent Organisation</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of association with an organisation engaged in violence
      </p>
      <div>
        <Label className="mb-2 block">Date</Label>
        <div className="grid grid-cols-3 gap-4">
          <Select value={dialogForm.watch("date_day")} onValueChange={(value) => dialogForm.setValue("date_day", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_month")} onValueChange={(value) => dialogForm.setValue("date_month", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_year")} onValueChange={(value) => dialogForm.setValue("date_year", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select value={dialogForm.watch("country")} onValueChange={(value) => dialogForm.setValue("country", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
function NationalSecurityDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { applicant_name: "", country: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">National Security Risk</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of involvement in activities representing a risk to national security
      </p>
      <div>
        <Label className="mb-2 block">Name of Applicant <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("applicant_name")} onValueChange={(value) => dialogForm.setValue("applicant_name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
function OutstandingDebtsDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { applicant_name: "", country: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Outstanding Debts</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of outstanding debts to the Australian Government
      </p>
      <div>
        <Label className="mb-2 block">Name of Applicant <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("applicant_name")} onValueChange={(value) => dialogForm.setValue("applicant_name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));
function PoliceClearanceDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    issuing_country: z.string().min(1, "Issuing Country is required"),
    application_date_day: z.string().min(1, "Day is required"),
    application_date_month: z.string().min(1, "Month is required"),
    application_date_year: z.string().min(1, "Year is required"),
    date_issue_day: z.string().optional(),
    date_issue_month: z.string().optional(),
    date_issue_year: z.string().optional(),
    reference_number: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      applicant_name: "",
      issuing_country: "",
      application_date_day: "",
      application_date_month: "",
      application_date_year: "",
      date_issue_day: "",
      date_issue_month: "",
      date_issue_year: "",
      reference_number: "",
    },
  });
  const handleSubmit = (data) => {
    // Extract DOB from applicant name if it's in the format "Name (DOB: day month year)"
    let dateOfBirthDisplay = "";
    const dobMatch = data.applicant_name.match(/\(DOB:\s*(.+?)\)/);
    if (dobMatch) {
      dateOfBirthDisplay = dobMatch[1];
    }
    onSave({
      ...data,
      date_of_birth_display: dateOfBirthDisplay,
      application_date_display: `${data.application_date_day} ${data.application_date_month} ${data.application_date_year}`,
      date_issue_display: data.date_issue_day && data.date_issue_month && data.date_issue_year
        ? `${data.date_issue_day} ${data.date_issue_month} ${data.date_issue_year}`
        : "",
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Police Clearance Certificate</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant who is included in this application who has applied for a Police Clearance Certificate in the last 12 months
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.applicant_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.applicant_name.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Issuing Country</Label>
        <Select
          value={dialogForm.watch("issuing_country")}
          onValueChange={(value) => dialogForm.setValue("issuing_country", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.issuing_country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.issuing_country.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Application Date</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("application_date_day")}
            onValueChange={(value) => dialogForm.setValue("application_date_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("application_date_month")}
            onValueChange={(value) => dialogForm.setValue("application_date_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("application_date_year")}
            onValueChange={(value) => dialogForm.setValue("application_date_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.application_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.application_date_day.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Date of Issue</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_issue_day")}
            onValueChange={(value) => dialogForm.setValue("date_issue_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_issue_month")}
            onValueChange={(value) => dialogForm.setValue("date_issue_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_issue_year")}
            onValueChange={(value) => dialogForm.setValue("date_issue_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Reference Number</Label>
        <Input {...dialogForm.register("reference_number")} placeholder="Enter reference number" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function ImmigrationDetentionDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    location_type: z.string().min(1, "Type of Location is required"),
    centre_name: z.string().min(1, "Name of Centre / Camp is required"),
    country: z.string().min(1, "Country is required"),
    location: z.string().optional(),
    organiser: z.string().optional(),
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        location_type: "",
        centre_name: "",
        country: "",
        location: "",
        organiser: "",
        date_from_day: "",
        date_from_month: "",
        date_from_year: "",
        date_to_day: "",
        date_to_month: "",
        date_to_year: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave({
      ...data,
      date_from_display:
        data.date_from_day && data.date_from_month && data.date_from_year
          ? `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`
          : "",
      date_to_display:
        data.date_to_day && data.date_to_month && data.date_to_year
          ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}`
          : "",
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Immigration Detention / Refugee Camp History</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant who is included in this application who has previously been in Immigration
        Detention, a Refugee Camp or Centre for Refugees
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Type of Location</Label>
        <Input {...dialogForm.register("location_type")} placeholder="Enter type of location" />
      </div>
      <div>
        <Label className="mb-2 block">Name of Centre / Camp</Label>
        <Input {...dialogForm.register("centre_name")} placeholder="Enter name of Centre / Camp" />
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select value={dialogForm.watch("country")} onValueChange={(value) => dialogForm.setValue("country", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Location</Label>
        <Input {...dialogForm.register("location")} placeholder="Enter location" />
      </div>
      <div>
        <Label className="mb-2 block">Name of Organiser who ran the Centre/Camp</Label>
        <Input {...dialogForm.register("organiser")} placeholder="Enter name of organiser" />
      </div>
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_from_day")} onValueChange={(value) => dialogForm.setValue("date_from_day", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_month")} onValueChange={(value) => dialogForm.setValue("date_from_month", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_year")} onValueChange={(value) => dialogForm.setValue("date_from_year", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_to_day")} onValueChange={(value) => dialogForm.setValue("date_to_day", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_month")} onValueChange={(value) => dialogForm.setValue("date_to_month", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_year")} onValueChange={(value) => dialogForm.setValue("date_to_year", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
function PrisonInstitutionDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    country: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      applicant_name: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      country: "",
      details: "",
    },
  });
  const handleSubmit = (data) => {
    onSave({
      ...data,
      date_from_display:
        data.date_from_day && data.date_from_month && data.date_from_year
          ? `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`
          : "",
      date_to_display:
        data.date_to_day && data.date_to_month && data.date_to_year
          ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}`
          : "",
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Prison / Institution History</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant who is included in this application who has been confined in a prison or psychiatric
        institution by order of a court in relation to criminal proceedings
      </p>
      <div>
        <Label className="mb-2 block">
          Applicant Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.applicant_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.applicant_name.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date To</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month")}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year")}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select value={dialogForm.watch("country")} onValueChange={(value) => dialogForm.setValue("country", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
const TRAINING_TYPES = [
  "Military Training",
  "Paramilitary Training",
  "Weapons Training",
  "Explosives Training",
  "Chemical Product Manufacturing",
  "Biological Product Manufacturing",
  "Other",
];
const SERVICE_TYPES = [
  "Intelligence",
  "Military - Voluntary Service",
  "Military - Compulsory National Service",
  "Military - Conscription",
  "Military - Reserve",
  "National Guard",
  "Militia",
  "Paramilitary",
  "Police",
  "Secret Police",
];
function MilitaryServiceDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    country_of_service: z.string().optional(),
    country_of_deployment: z.string().optional(),
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    service_type: z.string().optional(),
    organisation_name: z.string().optional(),
    position_rank: z.string().optional(),
    duties_description: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      country_of_service: "",
      country_of_deployment: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      service_type: "",
      organisation_name: "",
      position_rank: "",
      duties_description: "",
    },
  });
  const handleSubmit = (data) => {
    // Extract DOB from applicant name if it's in the format "Name (DOB: day month year)"
    let dateOfBirthDisplay = "";
    const dobMatch = data.applicant_name.match(/\(DOB:\s*(.+?)\)/);
    if (dobMatch) {
      dateOfBirthDisplay = dobMatch[1];
    }
    onSave({
      ...data,
      date_from_display:
        data.date_from_day && data.date_from_month && data.date_from_year
          ? `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`
          : "",
      date_to_display:
        data.date_to_day && data.date_to_month && data.date_to_year
          ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}`
          : "",
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Military Service History</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details relating to serving in a military force, police force, state sponsored militia, private militia,
        secret police or intelligence agency
      </p>
      <div>

        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.applicant_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.applicant_name.message}</p>
        )}
      </div>
      <div>

        <Label className="mb-2 block">Country of Service</Label>
        <Select
          value={dialogForm.watch("country_of_service")}
          onValueChange={(value) => dialogForm.setValue("country_of_service", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country_of_service && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_service.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Country of Deployment</Label>
        <Select
          value={dialogForm.watch("country_of_deployment")}
          onValueChange={(value) => dialogForm.setValue("country_of_deployment", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month")}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year")}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Type of Service</Label>
        <Select
          value={dialogForm.watch("service_type")}
          onValueChange={(value) => dialogForm.setValue("service_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Service" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Name of Organisation/Unit/Brigade Group</Label>
        <Input {...dialogForm.register("organisation_name")} placeholder="Enter organisation name" />
      </div>
      <div>
        <Label className="mb-2 block">Position/Rank</Label>
        <Input {...dialogForm.register("position_rank")} placeholder="Enter position or rank" />
      </div>
      <div>
        <Label className="mb-2 block">Description of Duties</Label>
        <Textarea rows={3} {...dialogForm.register("duties_description")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function MilitaryTrainingDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    country_of_training: z.string().optional(),
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    training_type: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      country_of_training: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      training_type: "",
      details: "",
    },
  });
  const handleSubmit = (data) => {
    // Extract DOB from applicant name if it's in the format "Name (DOB: day month year)"
    let dateOfBirthDisplay = "";
    const dobMatch = data.applicant_name.match(/\(DOB:\s*(.+?)\)/);
    if (dobMatch) {
      dateOfBirthDisplay = dobMatch[1];
    }
    onSave({
      ...data,
      date_from_display:
        data.date_from_day && data.date_from_month && data.date_from_year
          ? `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`
          : "",
      date_to_display:
        data.date_to_day && data.date_to_month && data.date_to_year
          ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}`
          : "",
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Military Training History</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details relating to undergoing any military/paramilitary training, been trained in weapons/explosives or in
        the manufacture of chemical/biological products
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.applicant_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.applicant_name.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Country of Training</Label>
        <Select
          value={dialogForm.watch("country_of_training")}
          onValueChange={(value) => dialogForm.setValue("country_of_training", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country_of_training && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_training.message}</p>
        )}
      </div>
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month")}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year")}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Type of Training</Label>
        <Select
          value={dialogForm.watch("training_type")}
          onValueChange={(value) => dialogForm.setValue("training_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function GenericCharacterDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country: z.string().optional(),
    date_day: z.string().optional(),
    date_month: z.string().optional(),
    date_year: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { applicant_name: "", country: "", date_day: "", date_month: "", date_year: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div>
        <Label className="mb-2 block">Applicant Name <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("applicant_name")} onValueChange={(value) => dialogForm.setValue("applicant_name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select value={dialogForm.watch("country")} onValueChange={(value) => dialogForm.setValue("country", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date</Label>
        <div className="grid grid-cols-3 gap-4">
          <Select value={dialogForm.watch("date_day")} onValueChange={(value) => dialogForm.setValue("date_day", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_month")} onValueChange={(value) => dialogForm.setValue("date_month", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_year")} onValueChange={(value) => dialogForm.setValue("date_year", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
function ConvictionDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({
    country: z.string().optional(),
    date_day: z.string().optional(),
    date_month: z.string().optional(),
    date_year: z.string().optional(),
    offence_type: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { country: "", date_day: "", date_month: "", date_year: "", offence_type: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div>
        <Label className="mb-2 block">Applicant Name <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("applicant_name")} onValueChange={(value) => dialogForm.setValue("applicant_name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select value={dialogForm.watch("country")} onValueChange={(value) => dialogForm.setValue("country", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date of Offence</Label>
        <div className="grid grid-cols-3 gap-4">
          <Select value={dialogForm.watch("date_day")} onValueChange={(value) => dialogForm.setValue("date_day", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_month")} onValueChange={(value) => dialogForm.setValue("date_month", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_year")} onValueChange={(value) => dialogForm.setValue("date_year", value)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Offence Type</Label>
        <Input {...dialogForm.register("offence_type")} placeholder="Choose Offence Type" />
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}
function SimpleCharacterDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { applicant_name: "", details: "" },
  });
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div>
        <Label className="mb-2 block">Applicant Name <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("applicant_name")} onValueChange={(value) => dialogForm.setValue("applicant_name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

const formSchema = z.object({
  ...CHARACTER_QUESTIONS.reduce((acc, q) => {
    acc[q.key] = z.enum(["yes", "no"]).optional();
    return acc;
  }, {}),
  // Details arrays for new questions
  convicted_child_offence_details: z.array(z.any()).optional(),
  charged_child_offence_details: z.array(z.any()).optional(),
  convicted_general_offence_details: z.array(z.any()).optional(),
  charged_general_offence_details: z.array(z.any()).optional(),
  acquitted_mental_illness_details: z.array(z.any()).optional(),
  removed_deported_details: z.array(z.any()).optional(),
  left_to_avoid_removal_details: z.array(z.any()).optional(),
  excluded_from_country_details: z.array(z.any()).optional(),
  war_crimes_details: z.array(z.any()).optional(),
  national_security_risk_details: z.array(z.any()).optional(),
  outstanding_debts_details: z.array(z.any()).optional(),
  people_smuggling_details: z.array(z.any()).optional(),
  military_training_details: z.array(z.any()).optional(),
  military_service_details: z.array(z.any()).optional(),
});
const GENERIC_DIALOG_CONFIG = {
  acquitted_mental_illness: {
    description: "Enter details relating to any crime or offence on the grounds of mental illness, insanity or unsoundness of mind",
    field: "acquitted_mental_illness_details"
  },
  removed_deported: {
    description: "Enter details relating to being removed or deported from any country",
    field: "removed_deported_details"
  },
  left_to_avoid_removal: {
    description: "Enter details relating to leaving any country to avoid being removed or deported from that country",
    field: "left_to_avoid_removal_details"
  },
  excluded_from_country: {
    description: "Enter details relating to being excluded from or asked to leave any country",
    field: "excluded_from_country_details"
  },
  war_crimes: {
    description: "Enter details relating to involvement in war crimes against humanity or human rights",
    field: "war_crimes_details"
  },
  national_security_risk: {
    description: "Enter details relating to involvement in any activities that would represent a risk to Australian national security or any other country",
    field: "national_security_risk_details"
  },
  outstanding_debts: {
    description: "Enter details relating to any outstanding debt to the Australian Government or any public authority in Australia",
    field: "outstanding_debts_details"
  },
  people_smuggling: {
    description: "Enter details relating to any activity or conviction of any offence relating to the illegal movement of people to any country",
    field: "people_smuggling_details"
  },
};
export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
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
  // Build applicant name options from main applicant, spouse/partner, and children draft data
  const applicantOptions = (() => {
    const opts = [];
    const buildLabel = (family, given, day, month, year) => {
      const name = [family, given].filter(Boolean).join(" ").trim();
      const dob = [day, month, year].filter(Boolean).join(" ");
      if (!name) return "";
      return dob ? `${name} (DOB: ${dob})` : name;
    };
    // Main applicant
    const main = draftStore.getSectionData('mainApplicant.details');
    if (main) {
      const label = buildLabel(
        main.family_name,
        main.given_names,
        main.birth_day,
        main.birth_month,
        main.birth_year
      );
      if (label) opts.push(label);
    }
    // Spouse / partner
    const spouse = draftStore.getSectionData('spousePartner.details');
    if (spouse) {
      const label = buildLabel(
        spouse.family_name,
        spouse.given_names,
        spouse.birth_day,
        spouse.birth_month,
        spouse.birth_year
      );
      if (label) opts.push(label);
    }
    // Children
    const childrenData = draftStore.getSectionData('mainApplicant.family')?.children || [];
    if (Array.isArray(childrenData)) {
      childrenData.forEach((child) => {
        const label = buildLabel(
          child.family_name,
          child.given_names,
          child.birth_day,
          child.birth_month,
          child.birth_year
        );
        if (label) opts.push(label);
      });
    }
    return opts;
  })();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...CHARACTER_QUESTIONS.reduce((acc, q) => {
        acc[q.key] = "no";
        return acc;
      }, {}),
      convicted_child_offence_details: [],
      charged_child_offence_details: [],
      convicted_general_offence_details: [],
      charged_general_offence_details: [],
      acquitted_mental_illness_details: [],
      removed_deported_details: [],
      left_to_avoid_removal_details: [],
      excluded_from_country_details: [],
      war_crimes_details: [],
      national_security_risk_details: [],
      outstanding_debts_details: [],
      people_smuggling_details: [],
      military_training_details: [],
      military_service_details: [],
    },
  });
  useEffect(() => {
    const savedData = draftStore.getSectionData('familySponsor.details') || {};
    // Only get character-related fields
    const characterData = {};
    CHARACTER_QUESTIONS.forEach((q) => {
      if (savedData[q.key] === "yes" || savedData[q.key] === "no") {
        characterData[q.key] = savedData[q.key];
      }
    });
    // Get detail arrays
    const detailFields = [
      'convicted_child_offence_details', 'charged_child_offence_details',
      'convicted_general_offence_details', 'charged_general_offence_details',
      'acquitted_mental_illness_details', 'removed_deported_details',
      'left_to_avoid_removal_details', 'excluded_from_country_details',
      'war_crimes_details', 'national_security_risk_details',
      'outstanding_debts_details', 'people_smuggling_details',
      'military_training_details', 'military_service_details'
    ];
    detailFields.forEach((field) => {
      if (Array.isArray(savedData[field])) {
        characterData[field] = savedData[field];
      }
    });

    if (Object.keys(characterData).length > 0) {
      Object.keys(characterData).forEach((key) => {
        if (characterData[key] === "yes" || characterData[key] === "no") {
          form.setValue(key, characterData[key]);
        } else if (Array.isArray(characterData[key])) {
          form.setValue(key, characterData[key]);
        }
      });
    }
  }, [draftSnap.draft, form]);
  const onSubmit = async (data) => {
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const mergedData = { ...existingData, ...data };
    await draftStore.saveSectionData("familySponsor.details", mergedData);
    await draftStore.markPageComplete('partner/family-sponsor/character', null, 'familySponsor.details');
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(next);
    if (next) router.push(next);
  };
  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
    if (prev) router.push(prev);
  };
  const handleSave = async () => {
    const values = form.getValues();
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const mergedData = { ...existingData, ...values };
    const result = await draftStore.saveSectionData("familySponsor.details", mergedData);
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
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Character</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide character information for all applicants.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            {CHARACTER_QUESTIONS.map((q) => (
              <div key={q.key} className="space-y-3">
                <Label>{q.label}</Label>
                <RadioGroup
                  value={form.watch(q.key)}
                  onValueChange={(value) => form.setValue(q.key, value)}
                >
                  <div className="flex gap-4">
                    {["yes", "no"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={option}
                          id={`${q.key}-${option}`}
                          data-testid={`radio-${q.key}-${option}`}
                        />
                        <Label htmlFor={`${q.key}-${option}`}>
                          {option === "yes" ? "Yes" : "No"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {form.watch(q.key) === "yes" && (
                  <div className="mt-4">
                    {q.key === "convicted_child_offence" && (
                      <RepeaterTable
                        data={form.watch("convicted_child_offence_details") || []}
                        columns={[
                          { key: "country", label: "Country" },
                          { key: "offence_type", label: "Offence" },
                          { key: "details", label: "Details" }
                        ]}
                        onAdd={(row) => form.setValue("convicted_child_offence_details", [...(form.watch("convicted_child_offence_details") || []), row])}
                        onEdit={(i, row) => {
                          const current = [...(form.watch("convicted_child_offence_details") || [])];
                          current[i] = row;
                          form.setValue("convicted_child_offence_details", current);
                        }}
                        onDelete={(i) => form.setValue("convicted_child_offence_details", (form.watch("convicted_child_offence_details") || []).filter((_, idx) => idx !== i))}
                        DialogComponent={(props) => (
                          <ConvictionDialog
                            {...props}
                            applicantOptions={applicantOptions}
                            title="Offence Character Detail"
                            description="Enter details relating to any crime or offence in any country (including any conviction which is removed from official records), relating to persons under the age of 18, including but not limited to: child abuse, child sex, endangering a child, indecent dealings with a child, or possession of child pornography"
                          />
                        )}
                        addButtonText="Add Details"
                      />
                    )}

                    {q.key === "immigration_detention" && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Enter details of any applicant who is included in this application who has previously been in Immigration Detention,
                          a Refugee Camp or Centre for Refugees
                        </p>
                        <RepeaterTable
                          data={form.watch("immigration_detention_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "centre_name", label: "Name of Centre / Camp" },
                            { key: "country", label: "Country" },
                            { key: "date_from_display", label: "Date From" },
                            { key: "date_to_display", label: "Date To" },
                          ]}
                          onAdd={(row) => {
                            const current = form.watch("immigration_detention_details") || [];
                            form.setValue("immigration_detention_details", [...current, row], {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onEdit={(index, updatedRow) => {
                            const current = [...(form.watch("immigration_detention_details") || [])];
                            current[index] = updatedRow;
                            form.setValue("immigration_detention_details", current, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onDelete={(index) => {
                            const current = form.watch("immigration_detention_details") || [];
                            const updated = current.filter((_, i) => i !== index);
                            form.setValue("immigration_detention_details", updated, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          DialogComponent={(props) => (
                            <ImmigrationDetentionDialog {...props} applicantOptions={applicantOptions} />
                          )}
                          addButtonText="Add Details"
                          testIdPrefix="immigration-detention"
                        />
                      </div>
                    )}
                    {q.key === "psychiatric_institution" && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Enter details of any applicant who is included in this application who has been confined in a
                          prison or psychiatric institution by order of a court in relation to criminal proceedings
                        </p>
                        <RepeaterTable
                          data={form.watch("psychiatric_institution_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "date_from_display", label: "Date From" },
                            { key: "date_to_display", label: "Date To" },
                            { key: "country", label: "Country" },
                          ]}
                          onAdd={(row) => {
                            const current = form.watch("psychiatric_institution_details") || [];
                            form.setValue("psychiatric_institution_details", [...current, row], {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onEdit={(index, updatedRow) => {
                            const current = [...(form.watch("psychiatric_institution_details") || [])];
                            current[index] = updatedRow;
                            form.setValue("psychiatric_institution_details", current, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onDelete={(index) => {
                            const current = form.watch("psychiatric_institution_details") || [];
                            const updated = current.filter((_, i) => i !== index);
                            form.setValue("psychiatric_institution_details", updated, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          DialogComponent={(props) => (
                            <PrisonInstitutionDialog {...props} applicantOptions={applicantOptions} />
                          )}
                          addButtonText="Add Details"
                          testIdPrefix="prison-institution"
                        />
                      </div>
                    )}

                    {
                      q.key === "military_training" && (
                        <div className="space-y-3">
                          <RepeaterTable
                            data={form.watch("military_training_details") || []}
                            columns={[
                              { key: "country_of_training", label: "Country" },
                              { key: "date_from_display", label: "Date From" },
                              { key: "date_to_display", label: "Date To" },
                            ]}
                            onAdd={(row) => form.setValue("military_training_details", [...(form.watch("military_training_details") || []), row])}
                            onEdit={(i, row) => {
                              const current = [...(form.watch("military_training_details") || [])];
                              current[i] = row;
                              form.setValue("military_training_details", current);
                            }}
                            onDelete={(i) => form.setValue("military_training_details", (form.watch("military_training_details") || []).filter((_, idx) => idx !== i))}
                            DialogComponent={(props) => (
                              <MilitaryTrainingDialog {...props} />
                            )}
                            addButtonText="Add Details"
                          />
                        </div>
                      )
                    }
                    {
                      q.key === "military_service" && (
                        <div className="space-y-3">
                          <RepeaterTable
                            data={form.watch("military_service_details") || []}
                            columns={[
                              { key: "country_of_service", label: "Country of Service" },
                              { key: "date_from_display", label: "Date From" },
                              { key: "date_to_display", label: "Date To" },
                              { key: "position_rank", label: "Position" },
                            ]}
                            onAdd={(row) => form.setValue("military_service_details", [...(form.watch("military_service_details") || []), row])}
                            onEdit={(i, row) => {
                              const current = [...(form.watch("military_service_details") || [])];
                              current[i] = row;
                              form.setValue("military_service_details", current);
                            }}
                            onDelete={(i) => form.setValue("military_service_details", (form.watch("military_service_details") || []).filter((_, idx) => idx !== i))}
                            DialogComponent={(props) => (
                              <MilitaryServiceDialog {...props} />
                            )}
                            addButtonText="Add Details"
                          />
                        </div>
                      )
                    }
                    {
                      GENERIC_DIALOG_CONFIG[q.key] && (
                        <RepeaterTable
                          data={form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []}
                          columns={[
                            { key: "country", label: "Country" },
                            { key: "date_year", label: "Year" },
                            { key: "details", label: "Details" }
                          ]}
                          onAdd={(row) => form.setValue(GENERIC_DIALOG_CONFIG[q.key].field, [...(form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || [])];
                            current[i] = row;
                            form.setValue(GENERIC_DIALOG_CONFIG[q.key].field, current);
                          }}
                          onDelete={(i) => form.setValue(GENERIC_DIALOG_CONFIG[q.key].field, (form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => (
                            <OtherCharacterDialog
                              {...props}
                              title="Other Character Detail"
                              description={GENERIC_DIALOG_CONFIG[q.key].description}
                            />
                          )}
                          addButtonText="Add Details"
                        />
                      )
                    }

                    {
                      q.key === "convicted_offence" && (
                        <RepeaterTable
                          data={form.watch("convicted_offence_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "country", label: "Country" },
                            { key: "offence_type", label: "Offence" },
                            { key: "details", label: "Details" }
                          ]}
                          onAdd={(row) => form.setValue("convicted_offence_details", [...(form.watch("convicted_offence_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("convicted_offence_details") || [])];
                            current[i] = row;
                            form.setValue("convicted_offence_details", current);
                          }}
                          onDelete={(i) => form.setValue("convicted_offence_details", (form.watch("convicted_offence_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => (
                            <ConvictionDialog
                              {...props}
                              applicantOptions={applicantOptions}
                              title="Convictions for Crimes/Offences"
                              description="Enter details of any applicant who is included in this application who has ever been convicted of an offence in any country (including any conviction which is now removed from official records). Please list each offence separately:"
                            />
                          )}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "awaiting_legal_action" && (
                        <RepeaterTable
                          data={form.watch("awaiting_legal_action_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "country", label: "Country" },
                            { key: "offence_type", label: "Offence" },
                            { key: "details", label: "Details" }
                          ]}
                          onAdd={(row) => form.setValue("awaiting_legal_action_details", [...(form.watch("awaiting_legal_action_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("awaiting_legal_action_details") || [])];
                            current[i] = row;
                            form.setValue("awaiting_legal_action_details", current);
                          }}
                          onDelete={(i) => form.setValue("awaiting_legal_action_details", (form.watch("awaiting_legal_action_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => (
                            <ConvictionDialog
                              {...props}
                              applicantOptions={applicantOptions}
                              title="Awaiting Legal Action"
                              description="Enter details of any applicant who has ever been charged with any offence in any country that is currently awaiting legal action:"
                            />
                          )}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "false_misleading_info" && (
                        <RepeaterTable
                          data={form.watch("false_misleading_info_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "details", label: "Details" }
                          ]}
                          onAdd={(row) => form.setValue("false_misleading_info_details", [...(form.watch("false_misleading_info_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("false_misleading_info_details") || [])];
                            current[i] = row;
                            form.setValue("false_misleading_info_details", current);
                          }}
                          onDelete={(i) => form.setValue("false_misleading_info_details", (form.watch("false_misleading_info_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => (
                            <SimpleCharacterDialog
                              {...props}
                              applicantOptions={applicantOptions}
                              title="Invalid Australian Immigration"
                              description="Enter details of any applicant who is included in this application who has ever provided any information or a document to the Australian Immigration or Customs Authorities which was wrong, incorrect, false or misleading"
                            />
                          )}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "sponsorship_payment" && (
                        <RepeaterTable
                          data={form.watch("sponsorship_payment_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "details", label: "Details" }
                          ]}
                          onAdd={(row) => form.setValue("sponsorship_payment_details", [...(form.watch("sponsorship_payment_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("sponsorship_payment_details") || [])];
                            current[i] = row;
                            form.setValue("sponsorship_payment_details", current);
                          }}
                          onDelete={(i) => form.setValue("sponsorship_payment_details", (form.watch("sponsorship_payment_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => (
                            <SimpleCharacterDialog
                              {...props}
                              applicantOptions={applicantOptions}
                              title="Benefit for Sponsorship/Nomination"
                              description="Enter details of any person included in this application who made or offered to make a payment or provide another benefit of any kind to another person or entity in return for the sponsorship, nomination or support for an Australian visa"
                            />
                          )}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "associated_criminal_conduct" && (
                        <RepeaterTable
                          data={form.watch("criminal_conduct_details") || []}
                          columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "details", label: "Details" }]}
                          onAdd={(row) => form.setValue("criminal_conduct_details", [...(form.watch("criminal_conduct_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("criminal_conduct_details") || [])];
                            current[i] = row;
                            form.setValue("criminal_conduct_details", current);
                          }}
                          onDelete={(i) => form.setValue("criminal_conduct_details", (form.watch("criminal_conduct_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => <CriminalConductDialog {...props} applicantOptions={applicantOptions} />}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "associated_violent_org" && (
                        <RepeaterTable
                          data={form.watch("violent_org_details") || []}
                          columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "details", label: "Details" }]}
                          onAdd={(row) => form.setValue("violent_org_details", [...(form.watch("violent_org_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("violent_org_details") || [])];
                            current[i] = row;
                            form.setValue("violent_org_details", current);
                          }}
                          onDelete={(i) => form.setValue("violent_org_details", (form.watch("violent_org_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => <ViolentOrganizationDialog {...props} applicantOptions={applicantOptions} />}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "national_security_risk" && (
                        <RepeaterTable
                          data={form.watch("national_security_details") || []}
                          columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "details", label: "Details" }]}
                          onAdd={(row) => form.setValue("national_security_details", [...(form.watch("national_security_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("national_security_details") || [])];
                            current[i] = row;
                            form.setValue("national_security_details", current);
                          }}
                          onDelete={(i) => form.setValue("national_security_details", (form.watch("national_security_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => <NationalSecurityDialog {...props} applicantOptions={applicantOptions} />}
                          addButtonText="Add Details"
                        />
                      )
                    }
                    {
                      q.key === "outstanding_debts" && (
                        <RepeaterTable
                          data={form.watch("outstanding_debts_details") || []}
                          columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "details", label: "Details" }]}
                          onAdd={(row) => form.setValue("outstanding_debts_details", [...(form.watch("outstanding_debts_details") || []), row])}
                          onEdit={(i, row) => {
                            const current = [...(form.watch("outstanding_debts_details") || [])];
                            current[i] = row;
                            form.setValue("outstanding_debts_details", current);
                          }}
                          onDelete={(i) => form.setValue("outstanding_debts_details", (form.watch("outstanding_debts_details") || []).filter((_, idx) => idx !== i))}
                          DialogComponent={(props) => <OutstandingDebtsDialog {...props} applicantOptions={applicantOptions} />}
                          addButtonText="Add Details"
                        />
                      )
                    }

                  </div >
                )
                }
              </div >
            ))
            }
            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={draftSnap.isSaving}
            />
          </div >
        </form >
      </CardContent >
    </Card >
  );
}