import { z } from "zod";
import { differenceInYears, isAfter, isBefore, parseISO, subYears } from "date-fns";

const yesNoSchema = z.enum(["Yes", "No"]);

// Helper schemas
const namePartsSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
});

const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
}).refine((data) => {
  if (data.from && data.to) {
    return isAfter(parseISO(data.to), parseISO(data.from)) || data.from === data.to;
  }
  return true;
}, { message: "End date must be after start date" });

// Main Applicant - Details
export const detailsSchema = z.object({
  is_main_applicant: yesNoSchema,
  prefix: z.enum(["Mr", "Mrs", "Miss", "Ms", "Dr", "Other"]).optional(),
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  preferred_names: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().min(1, "Date of birth is required").refine((date) => {
    const dob = parseISO(date);
    const now = new Date();
    const hundredYearsAgo = subYears(now, 100);
    return isAfter(dob, hundredYearsAgo) && isBefore(dob, now);
  }, { message: "Date of birth must be within the last 100 years" }).refine((date) => {
    const age = differenceInYears(new Date(), parseISO(date));
    return age >= 18;
  }, { message: "Applicant must be at least 18 years old" }),
  country_of_birth: z.string().min(1, "Country of birth is required"),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  marital_status: z.enum(["Never Married", "Married", "De Facto", "Divorced", "Widowed", "Separated"]),
});

// Main Applicant - Other
export const otherSchema = z.object({
  has_other_names: yesNoSchema.optional(),
  other_names: z.array(z.object({
    family_name: z.string().min(1, "Family name is required"),
    given_names: z.string().min(1, "Given names are required"),
    reason_for_change: z.string().min(1, "Reason for change is required"),
  })).optional(),
  use_chinese_code: yesNoSchema.optional(),
  chinese_code: z.string().optional(),
  russian_descent: yesNoSchema.optional(),
  patronymic_name: namePartsSchema.optional(),
  has_prev_dob: yesNoSchema.optional(),
  prev_dobs: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.has_other_names === "Yes") {
    return data.other_names && data.other_names.length > 0;
  }
  return true;
}, { message: "At least one other name is required when 'Yes' is selected", path: ["other_names"] })
.refine((data) => {
  if (data.use_chinese_code === "Yes") {
    return data.chinese_code && data.chinese_code.length > 0;
  }
  return true;
}, { message: "Chinese code is required when 'Yes' is selected", path: ["chinese_code"] })
.refine((data) => {
  if (data.russian_descent === "Yes") {
    return data.patronymic_name && data.patronymic_name.family_name && data.patronymic_name.given_names;
  }
  return true;
}, { message: "Patronymic name is required when 'Yes' is selected", path: ["patronymic_name"] })
.refine((data) => {
  if (data.has_prev_dob === "Yes") {
    return data.prev_dobs && data.prev_dobs.length > 0;
  }
  return true;
}, { message: "At least one previous date of birth is required when 'Yes' is selected", path: ["prev_dobs"] });

// Identity
export const identitySchema = z.object({
  citizen_of_country: yesNoSchema.optional(),
  citizenships: z.array(z.object({
    country: z.string().min(1, "Country is required"),
    obtained_method: z.string().min(1, "Method is required"),
    date_obtained: z.string().optional(),
    still_citizen: z.boolean().optional(),
  })).optional(),
  has_passport: yesNoSchema.optional(),
  passports: z.array(z.object({
    doc_number: z.string().min(1, "Document number is required"),
    name: z.string().min(1, "Name is required"),
    nationality: z.string().min(1, "Nationality is required"),
    date_of_issue: z.string().optional(),
    status: z.enum(["Valid", "Expired", "Cancelled"]).optional(),
  })).optional(),
  has_identity_doc: yesNoSchema.optional(),
  identity_docs: z.array(z.object({
    doc_type: z.string().min(1, "Document type is required"),
    id_number: z.string().min(1, "ID number is required"),
    name: z.string().min(1, "Name is required"),
    country_of_issue: z.string().min(1, "Country is required"),
    date_of_issue: z.string().optional(),
  })).optional(),
  permanent_residency_rights: yesNoSchema.optional(),
  pr_countries: z.array(z.object({
    country: z.string().min(1, "Country is required"),
  })).optional(),
}).refine((data) => {
  if (data.citizen_of_country === "Yes") {
    return data.citizenships && data.citizenships.length > 0;
  }
  return true;
}, { message: "At least one citizenship is required", path: ["citizenships"] })
.refine((data) => {
  if (data.has_passport === "Yes") {
    return data.passports && data.passports.length > 0;
  }
  return true;
}, { message: "At least one passport is required", path: ["passports"] })
.refine((data) => {
  if (data.has_identity_doc === "Yes") {
    return data.identity_docs && data.identity_docs.length > 0;
  }
  return true;
}, { message: "At least one identity document is required", path: ["identity_docs"] });

// Employment
export const employmentSchema = z.object({
  currently_employed: yesNoSchema.optional(),
  employment_history: z.array(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    status: z.string().optional(),
    position: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
});

// Education
export const educationSchema = z.object({
  has_education: yesNoSchema.optional(),
  education_history: z.array(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    course_name: z.string().min(1, "Course name is required"),
    institution_name: z.string().min(1, "Institution name is required"),
    country: z.string().optional(),
    status: z.enum(["Completed", "Ongoing", "Withdrawn"]).optional(),
  })).optional(),
}).refine((data) => {
  if (data.has_education === "Yes") {
    return data.education_history && data.education_history.length > 0;
  }
  return true;
}, { message: "At least one education entry is required", path: ["education_history"] });

// Language
export const languageSchema = z.object({
  is_english_main: yesNoSchema.optional(),
  languages: z.array(z.object({
    language: z.string().min(1, "Language is required"),
    proficiency: z.enum(["Basic", "Intermediate", "Proficient", "Native"]).optional(),
    main_language: z.boolean().optional(),
  })).optional(),
});

// Family (Main Applicant)
export const familyMainSchema = z.object({
  has_children: yesNoSchema.optional(),
});

// Children
export const childrenSchema = z.object({
  has_children_joint: yesNoSchema.optional(),
  children: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    intention: z.enum(["Included in Application", "Not Included"]).optional(),
  })).optional(),
}).refine((data) => {
  if (data.has_children_joint === "Yes") {
    return data.children && data.children.length > 0;
  }
  return true;
}, { message: "At least one child is required", path: ["children"] });

// Family Sponsor
export const familySponsorSchema = z.object({
  has_family_sponsor: yesNoSchema.optional(),
  sponsor_relation: z.enum(["Parent", "Spouse", "Child", "Sibling", "Other Relative"]).optional(),
}).refine((data) => {
  if (data.has_family_sponsor === "Yes") {
    return data.sponsor_relation && data.sponsor_relation.length > 0;
  }
  return true;
}, { message: "Sponsor relationship is required", path: ["sponsor_relation"] });

// Family Members
export const familyMembersSchema = z.object({
  family_members: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    relationship: z.string().min(1, "Relationship is required"),
  })).optional(),
});

// Addresses
export const addressesSchema = z.object({
  same_residence: yesNoSchema.optional(),
  address_history: z.array(z.object({
    from: z.string().min(1, "Start date is required"),
    to: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    legal_status: z.string().optional(),
  }).refine((data) => {
    if (data.from && data.to) {
      return isAfter(parseISO(data.to), parseISO(data.from)) || data.from === data.to;
    }
    return true;
  }, { message: "End date must be after start date" })).optional(),
});

// Contact Details
export const contactDetailsSchema = z.object({
  shared_phone: yesNoSchema.optional(),
  phone_numbers: z.object({
    after_hours: z.string().optional(),
    office_hours: z.string().optional(),
    mobile: z.string().optional(),
  }).optional(),
  shared_email: yesNoSchema.optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  shared_postal: yesNoSchema.optional(),
  postal_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

// Visas
export const visasSchema = z.object({
  has_previous_visa: yesNoSchema.optional(),
  visa_history: z.array(z.object({
    country: z.string().min(1, "Country is required"),
    type: z.string().optional(),
    linked_passport: z.string().optional(),
    decision_date: z.string().optional(),
    outcome: z.enum(["Granted", "Refused", "Cancelled", "Pending"]).optional(),
  })).optional(),
}).refine((data) => {
  if (data.has_previous_visa === "Yes") {
    return data.visa_history && data.visa_history.length > 0;
  }
  return true;
}, { message: "At least one visa is required", path: ["visa_history"] });

// Travel History
export const travelHistorySchema = z.object({
  has_travel: yesNoSchema.optional(),
  travel_history: z.array(z.object({
    country: z.string().optional(),
    arrival_date: z.string().optional(),
    departure_date: z.string().optional(),
    reason: z.string().optional(),
  }).refine((data) => {
    if (data.arrival_date && data.departure_date) {
      return isAfter(parseISO(data.departure_date), parseISO(data.arrival_date)) || data.arrival_date === data.departure_date;
    }
    return true;
  }, { message: "Departure date must be after arrival date" })).optional(),
}).refine((data) => {
  if (data.has_travel === "Yes") {
    return data.travel_history && data.travel_history.length > 0;
  }
  return true;
}, { message: "At least one travel entry is required", path: ["travel_history"] });

// Future Travel
export const futureTravelSchema = z.object({
  has_future_travel: yesNoSchema.optional(),
  future_travel: z.array(z.object({
    from_to: z.string().optional(),
    start_date: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
}).refine((data) => {
  if (data.has_future_travel === "Yes") {
    return data.future_travel && data.future_travel.length > 0;
  }
  return true;
}, { message: "At least one future travel entry is required", path: ["future_travel"] });

// Future Addresses
export const futureAddressesSchema = z.object({
  knows_future_address: yesNoSchema.optional(),
  future_addresses: z.array(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    address: z.string().optional(),
  })).optional(),
}).refine((data) => {
  if (data.knows_future_address === "Yes") {
    return data.future_addresses && data.future_addresses.length > 0;
  }
  return true;
}, { message: "At least one future address is required", path: ["future_addresses"] });

// Health
export const healthSchema = z.object({
  health_exam_12m: yesNoSchema.optional(),
  health_exams: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    country: z.string().optional(),
    date_completed: z.string().optional(),
  })).optional(),
  intends_healthcare_work: yesNoSchema.optional(),
  health_work: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
  tb_history: yesNoSchema.optional(),
  tb_history_details: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  tb_close_contact: yesNoSchema.optional(),
  tb_close_contact_details: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  listed_health_conditions: yesNoSchema.optional(),
  health_conditions: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    condition: z.string().optional(),
  })).optional(),
  needs_medical_care: yesNoSchema.optional(),
  medical_care_details: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
  })).optional(),
});

// Character
export const characterSchema = z.object({
  character: z.record(z.object({
    answer: yesNoSchema,
    details: z.array(z.object({
      name: z.string().optional(),
      dob: z.string().optional(),
      detail: z.string().optional(),
      country: z.string().optional(),
      date: z.string().optional(),
      offence: z.string().optional(),
      penalty: z.string().optional(),
    })).optional(),
  })).optional(),
}).refine((data) => {
  if (data.character) {
    for (const [key, value] of Object.entries(data.character)) {
      if (value.answer === "Yes") {
        if (!value.details || value.details.length === 0 || !value.details.some(d => d.detail && d.detail.trim().length > 0)) {
          return false;
        }
      }
    }
  }
  return true;
}, { message: "Details are required when answer is Yes" });

// Contacts
export const contactsSchema = z.object({
  contacts_note: z.string().optional(),
});

// Start
export const startSchema = z.object({
  started: z.boolean(),
}).refine((data) => data.started === true, { message: "You must agree to start the application" });
