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

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const CHARACTER_QUESTIONS = [
  {
    key: "police_check_last_12_months",
    label: "Has anyone who is to be included in this application applied for a Police Clearance Certificate in the last 12 months?",
  },
  {
    key: "immigration_detention",
    label: "Has anyone who is to be included in this application previously been in Immigration Detention, a Refugee Camp or Centre for Refugees?",
  },
  {
    key: "convicted_offence",
    label: "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records? If in doubt, click Yes.",
  },
  {
    key: "awaiting_legal_action",
    label: "Has any applicant ever been charged with any offence in any country that is currently awaiting legal action? If in doubt, click Yes.",
  },
  {
    key: "domestic_violence_order",
    label: "Has any applicant who is included in this application ever been the subject of a domestic violence or family violence order, or any other order, of a tribunal or court or other similar authority, for the personal protection of another person?",
  },
  {
    key: "arrest_warrant",
    label: "Has any applicant who is to be included in this application been the subject of an arrest warrant or Interpol Notice?",
  },
  {
    key: "child_sex_offence",
    label: "Has any applicant been found guilty of a sexually based offence involving a child (including where no conviction was recorded)?",
  },
  {
    key: "sex_offender_register",
    label: "Has any applicant who is to be included in this application ever been named on a sex offender register?",
  },
  {
    key: "psychiatric_institution",
    label: "Has any applicant been confined in a prison or psychiatric institution by order of a court in relation to criminal proceedings?",
  },
  {
    key: "insanity_acquittal",
    label: "Has any applicant ever been acquitted of any offence on the grounds of unsoundness of mind or insanity? If in doubt, click yes.",
  },
  {
    key: "unfit_to_plead",
    label: "Has any applicant who is to be included in this application ever been found by a court not fit to plead?",
  },
  {
    key: "false_misleading_info",
    label: "Has any applicant ever provided any information or a document to the Australian Immigration or Customs Authorities which was wrong, incorrect, false or misleading?",
  },
  {
    key: "visa_refused",
    label: "Has any applicant ever had a visa or entry permit for any country (including Australia) refused?",
  },
  {
    key: "overstayed_visa",
    label: "Has any applicant overstayed a visa or entry permit in any country (including Australia)?",
  },
  {
    key: "deported_removed",
    label: "Has any applicant been removed or deported from any country (including Australia)?",
  },
  {
    key: "avoid_removal",
    label: "Has any applicant left any country to avoid being removed or deported from that Country (including Australia)?",
  },
  {
    key: "excluded_from_country",
    label: "Has any applicant been excluded from or asked to leave any country (including Australia)?",
  },
  {
    key: "citizenship_refusal",
    label: "Has any applicant ever been refused, renounced or rescinded citizenship of any country?",
  },
  {
    key: "war_crimes",
    label: "Has any applicant been charged with, or indicted for: genocide, war crimes, crimes against humanity, torture, slavery, or any other crime that is otherwise of a serious international concern?",
  },
  {
    key: "national_security_risk",
    label: "Has any applicant been directly or indirectly involved in, or associated with, any activities that would represent a risk to Australian national security or any other country?",
  },
  {
    key: "outstanding_debts",
    label: "Has any applicant ever had any outstanding debts to the Australian Government or any public authority in Australia?",
  },
  {
    key: "people_smuggling",
    label: "Has any applicant ever been involved in people smuggling or people trafficking offences? If in doubt, click Yes.",
  },
  {
    key: "associated_criminal_conduct",
    label: "Has any applicant been associated with a person, group or organisation that has been/is involved in criminal conduct?",
  },
  {
    key: "associated_violent_org",
    label: "Has any applicant ever been associated with an organisation engaged in violence or engaged in acts of violence (including war, insurgency, freedom fighting, terrorism, protest) either overseas or in Australia?",
  },
  {
    key: "military_training",
    label: "Has any applicant undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?",
  },
  {
    key: "military_service",
    label: "Has any applicant ever served in a military force, police force, state sponsored militia, private militia, secret police or intelligence agency?",
  },
  {
    key: "sponsorship_payment",
    label: "Has any person included in this application made or offered to make a payment or provide another benefit of any kind to another person or entity in return for the sponsorship, nomination or support for an Australian visa?",
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function ViolentOrganizationDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Association with Violent Organisation</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of association with an organisation engaged in violence
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">Ok</Button>
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
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
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country_of_service: z.string().min(1, "Country of Service is required"),
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
      applicant_name: "",
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
      date_of_birth_display: dateOfBirthDisplay,
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
        Enter details of any applicant who is included in this application who has ever served in a military force,
        police force, state sponsored militia, private militia, secret police or intelligence agency
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

function MilitaryTrainingDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country_of_training: z.string().min(1, "Country of Training is required"),
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
      applicant_name: "",
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
      date_of_birth_display: dateOfBirthDisplay,
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
        Enter details of any applicant who is included in this application who has undergone any military/paramilitary
        training, been trained in weapons/explosives or in the manufacture of chemical/biological products
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function ConvictionDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country: z.string().optional(),
    date_day: z.string().optional(),
    date_month: z.string().optional(),
    date_year: z.string().optional(),
    offence_type: z.string().optional(),
    details: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { applicant_name: "", country: "", date_day: "", date_month: "", date_year: "", offence_type: "", details: "" },
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
        <Label className="mb-2 block">Date of Conviction/Charge</Label>
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
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
        <Button type="button" onClick={dialogForm.handleSubmit(onSave)} className="bg-[#285646] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

const formSchema = z.object({
  ...CHARACTER_QUESTIONS.reduce((acc, q) => {
    acc[q.key] = z.enum(["yes", "no"]).optional();
    return acc;
  }, {}),
  criminal_conduct_details: z.array(z.any()).optional(),
  violent_org_details: z.array(z.any()).optional(),
  national_security_details: z.array(z.any()).optional(),
  outstanding_debts_details: z.array(z.any()).optional(),
  // New arrays for remaining questions
  domestic_violence_details: z.array(z.any()).optional(),
  arrest_warrant_details: z.array(z.any()).optional(),
  child_sex_offence_details: z.array(z.any()).optional(),
  sex_offender_register_details: z.array(z.any()).optional(),
  insanity_acquittal_details: z.array(z.any()).optional(),
  unfit_to_plead_details: z.array(z.any()).optional(),
  visa_refused_details: z.array(z.any()).optional(),
  overstayed_visa_details: z.array(z.any()).optional(),
  deported_removed_details: z.array(z.any()).optional(),
  avoid_removal_details: z.array(z.any()).optional(),
  excluded_from_country_details: z.array(z.any()).optional(),
  citizenship_refusal_details: z.array(z.any()).optional(),
  war_crimes_details: z.array(z.any()).optional(),
  // Conviction and Charged arrays
  convicted_offence_details: z.array(z.any()).optional(),
  awaiting_legal_action_details: z.array(z.any()).optional(),
  // Simple arrays
  false_misleading_info_details: z.array(z.any()).optional(),
  sponsorship_payment_details: z.array(z.any()).optional(),
  people_smuggling_details: z.array(z.any()).optional(),
});

const GENERIC_DIALOG_CONFIG = {
  domestic_violence_order: {
    title: "Domestic Violence Order",
    description: "Enter details of any applicant who is included in this application who has ever been the subject of an order for the personal protection of another person:",
    field: "domestic_violence_details"
  },
  arrest_warrant: {
    title: "Arrest Warrant",
    description: "Enter details of any applicant who is included in this application who has been the subject of an arrest warrant or Interpol Notice:",
    field: "arrest_warrant_details"
  },
  child_sex_offence: {
    title: "Child Sex Offence",
    description: "Enter details of any applicant who has been found guilty of a sexually based offence involving a child:",
    field: "child_sex_offence_details"
  },
  sex_offender_register: {
    title: "Sex Offender Register",
    description: "Enter details of any applicant who is included in this application who has ever been named on a sex offender register:",
    field: "sex_offender_register_details"
  },
  insanity_acquittal: {
    title: "Acquitted due to Insanity",
    description: "Enter details of any applicant who has ever been acquitted of any offence on the grounds of unsoundness of mind or insanity:",
    field: "insanity_acquittal_details"
  },
  unfit_to_plead: {
    title: "Unfit to Plead",
    description: "Enter details of any applicant who is included in this application who has ever been found by a court not fit to plead:",
    field: "unfit_to_plead_details"
  },
  visa_refused: {
    title: "Visa Refusal",
    description: "Enter details of any applicant who has ever had a visa or entry permit for any country (including Australia) refused:",
    field: "visa_refused_details"
  },
  overstayed_visa: {
    title: "Overstayed Visa",
    description: "Enter details of any applicant who has overstayed a visa or entry permit in any country (including Australia):",
    field: "overstayed_visa_details"
  },
  deported_removed: {
    title: "Deported or Removed",
    description: "Enter details of any applicant who has been removed or deported from any country (including Australia):",
    field: "deported_removed_details"
  },
  avoid_removal: {
    title: "Left to Avoid Removal",
    description: "Enter details of any applicant who has left any country to avoid being removed or deported from that Country (including Australia):",
    field: "avoid_removal_details"
  },
  excluded_from_country: {
    title: "Excluded from Country",
    description: "Enter details of any applicant who has been excluded from or asked to leave any country (including Australia):",
    field: "excluded_from_country_details"
  },
  citizenship_refusal: {
    title: "Citizenship Refusal",
    description: "Enter details of any applicant who has ever been refused, renounced or rescinded citizenship of any country:",
    field: "citizenship_refusal_details"
  },
  war_crimes: {
    title: "War Crimes",
    description: "Enter details of any applicant who has been charged with, or indicted for: genocide, war crimes, crimes against humanity, torture, slavery, or any other crime that is otherwise of a serious international concern:",
    field: "war_crimes_details"
  },
  people_smuggling: {
    title: "People Smuggling",
    description: "Enter details of any applicant who has ever been involved in people smuggling or people trafficking offences:",
    field: "people_smuggling_details"
  },
};

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
    const main = draftSnap.draft?.temporary_work_details;
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
    const spouse = draftSnap.draft?.temporary_work_spouse_details;
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
    const childrenData = draftSnap.draft?.temporary_work_children?.children || [];
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
      criminal_conduct_details: [],
      violent_org_details: [],
      national_security_details: [],
      outstanding_debts_details: [],
      domestic_violence_details: [],
      arrest_warrant_details: [],
      child_sex_offence_details: [],
      sex_offender_register_details: [],
      insanity_acquittal_details: [],
      unfit_to_plead_details: [],
      visa_refused_details: [],
      overstayed_visa_details: [],
      deported_removed_details: [],
      avoid_removal_details: [],
      excluded_from_country_details: [],
      citizenship_refusal_details: [],
      war_crimes_details: [],
      convicted_offence_details: [],
      awaiting_legal_action_details: [],
      false_misleading_info_details: [],
      sponsorship_payment_details: [],
      people_smuggling_details: [],
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_character || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        // Only value if regular "yes"/"no", otherwise keep default "no"
        if (savedData[key] === "yes" || savedData[key] === "no") {
          form.setValue(key, savedData[key]);
        } else if (Array.isArray(savedData[key])) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, [draftSnap.draft?.temporary_work_character, form]);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_character", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/character`, null, "temporary_work_character");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_character", values);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Character</h1>
          <p className="text-muted-foreground mt-2">
            Provide character information for all applicants.
          </p>
        </div>

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
                    {q.key === "police_check_last_12_months" && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Enter details of any applicant who is included in this application who has applied for a Police Clearance Certificate in the last 12 months
                        </p>
                        <RepeaterTable
                          data={form.watch("police_check_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "date_of_birth_display", label: "Date of Birth" },
                            { key: "application_date_display", label: "Date of Application" },
                            { key: "issuing_country", label: "Country" },
                          ]}
                          onAdd={(row) => {
                            const current = form.watch("police_check_details") || [];
                            form.setValue("police_check_details", [...current, row], {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onEdit={(index, updatedRow) => {
                            const current = [...(form.watch("police_check_details") || [])];
                            current[index] = updatedRow;
                            form.setValue("police_check_details", current, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onDelete={(index) => {
                            const current = form.watch("police_check_details") || [];
                            const updated = current.filter((_, i) => i !== index);
                            form.setValue("police_check_details", updated, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          DialogComponent={(props) => (
                            <PoliceClearanceDialog {...props} applicantOptions={applicantOptions} />
                          )}
                          addButtonText="Add Details"
                          testIdPrefix="police-clearance"
                        />
                      </div>
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

                    {q.key === "military_training" && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Enter details of any applicant who is included in this application who has undergone any
                          military/paramilitary training, been trained in weapons/explosives or in the manufacture of
                          chemical/biological products
                        </p>
                        <RepeaterTable
                          data={form.watch("military_training_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "date_of_birth_display", label: "Date of Birth" },
                            { key: "date_from_display", label: "Date From" },
                            { key: "date_to_display", label: "Date To" },
                            { key: "country_of_training", label: "Country" },
                          ]}
                          onAdd={(row) => {
                            const current = form.watch("military_training_details") || [];
                            form.setValue("military_training_details", [...current, row], {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onEdit={(index, updatedRow) => {
                            const current = [...(form.watch("military_training_details") || [])];
                            current[index] = updatedRow;
                            form.setValue("military_training_details", current, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onDelete={(index) => {
                            const current = form.watch("military_training_details") || [];
                            const updated = current.filter((_, i) => i !== index);
                            form.setValue("military_training_details", updated, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          DialogComponent={(props) => (
                            <MilitaryTrainingDialog {...props} applicantOptions={applicantOptions} />
                          )}
                          addButtonText="Add Details"
                          testIdPrefix="military-training"
                        />
                      </div>
                    )}

                    {q.key === "military_service" && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Enter details of any applicant who is included in this application who has ever served in a
                          military force, police force, state sponsored militia, private militia, secret police or
                          intelligence agency
                        </p>
                        <RepeaterTable
                          data={form.watch("military_service_details") || []}
                          columns={[
                            { key: "applicant_name", label: "Name" },
                            { key: "date_of_birth_display", label: "Date of Birth" },
                            { key: "date_from_display", label: "Date From" },
                            { key: "date_to_display", label: "Date To" },
                            { key: "country_of_service", label: "Country of Service" },
                            { key: "country_of_deployment", label: "Country of Deployment" },
                            { key: "position_rank", label: "Position" },
                          ]}
                          onAdd={(row) => {
                            const current = form.watch("military_service_details") || [];
                            form.setValue("military_service_details", [...current, row], {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onEdit={(index, updatedRow) => {
                            const current = [...(form.watch("military_service_details") || [])];
                            current[index] = updatedRow;
                            form.setValue("military_service_details", current, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          onDelete={(index) => {
                            const current = form.watch("military_service_details") || [];
                            const updated = current.filter((_, i) => i !== index);
                            form.setValue("military_service_details", updated, {
                              shouldValidate: true,
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                          DialogComponent={(props) => (
                            <MilitaryServiceDialog {...props} applicantOptions={applicantOptions} />
                          )}
                          addButtonText="Add Details"
                          testIdPrefix="military-service"
                        />
                      </div>
                    )}

                    {GENERIC_DIALOG_CONFIG[q.key] && (
                      <RepeaterTable
                        data={form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []}
                        columns={[
                          { key: "applicant_name", label: "Name" },
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
                          <GenericCharacterDialog
                            {...props}
                            applicantOptions={applicantOptions}
                            title={GENERIC_DIALOG_CONFIG[q.key].title}
                            description={GENERIC_DIALOG_CONFIG[q.key].description}
                          />
                        )}
                        addButtonText="Add Details"
                      />
                    )}

                    {q.key === "convicted_offence" && (
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
                    )}

                    {q.key === "awaiting_legal_action" && (
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
                    )}

                    {q.key === "false_misleading_info" && (
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
                    )}

                    {q.key === "sponsorship_payment" && (
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
                    )}

                    {q.key === "associated_criminal_conduct" && (
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
                    )}
                    {q.key === "associated_violent_org" && (
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
                    )}
                    {q.key === "national_security_risk" && (
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
                    )}
                    {q.key === "outstanding_debts" && (
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
                    )}
                  </div>
                )}
              </div>
            ))}

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={draftSnap.isSaving}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
