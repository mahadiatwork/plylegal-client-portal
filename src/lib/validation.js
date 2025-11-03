import { z } from "zod";

const yesNoEnum = z.enum(["Yes", "No"]);

export const startSchema = z.object({
  started: z.boolean().refine((val) => val === true, {
    message: "You must accept to continue",
  }),
});

export const detailsSchema = z.object({
  is_main_applicant: yesNoEnum,
  prefix: z.string().optional(),
  family_name: z.string().min(1, "Required"),
  given_names: z.string().min(1, "Required"),
  preferred_names: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().min(1, "Required"),
  country_of_birth: z.string().min(1, "Required"),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  marital_status: z.enum([
    "Never Married",
    "Married",
    "De Facto",
    "Divorced",
    "Widowed",
    "Separated",
  ]),
});

export const otherSchema = z.object({
  has_other_names: yesNoEnum.optional(),
  other_names: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    reason_for_change: z.string(),
  })).optional(),
  use_chinese_code: yesNoEnum.optional(),
  chinese_code: z.string().optional(),
  russian_descent: yesNoEnum.optional(),
  patronymic_name: z.object({
    family_name: z.string(),
    given_names: z.string(),
  }).optional(),
  has_prev_dob: yesNoEnum.optional(),
  prev_dobs: z.array(z.string()).optional(),
});

export const identitySchema = z.object({
  citizen_of_country: yesNoEnum.optional(),
  citizenships: z.array(z.object({
    country: z.string(),
    obtained_method: z.string(),
    date_obtained: z.string().optional(),
    still_citizen: z.boolean().optional(),
  })).optional(),
  has_passport: yesNoEnum.optional(),
  passports: z.array(z.object({
    doc_number: z.string(),
    name: z.string(),
    nationality: z.string(),
    date_of_issue: z.string().optional(),
    status: z.enum(["Valid", "Expired", "Cancelled"]).optional(),
  })).optional(),
  has_identity_doc: yesNoEnum.optional(),
  identity_docs: z.array(z.object({
    doc_type: z.string(),
    id_number: z.string(),
    name: z.string(),
    country_of_issue: z.string(),
    date_of_issue: z.string().optional(),
  })).optional(),
  permanent_residency_rights: yesNoEnum.optional(),
  pr_countries: z.array(z.object({ country: z.string() })).optional(),
});

export const employmentSchema = z.object({
  currently_employed: yesNoEnum.optional(),
  employment_history: z.array(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    status: z.string().optional(),
    position: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
});

export const educationSchema = z.object({
  has_education: yesNoEnum.optional(),
  education_history: z.array(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    course_name: z.string(),
    institution_name: z.string(),
    country: z.string().optional(),
    status: z.enum(["Completed", "Ongoing", "Withdrawn"]).optional(),
  })).optional(),
});

export const languageSchema = z.object({
  is_english_main: yesNoEnum.optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(["Basic", "Intermediate", "Proficient", "Native"]).optional(),
    main_language: z.boolean().optional(),
  })).optional(),
});

export const familyMainSchema = z.object({
  has_children: yesNoEnum.optional(),
  children: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    intention: z.enum(["Included in Application", "Not Included"]).optional(),
  })).optional(),
});

export const childrenSchema = z.object({
  has_children_joint: yesNoEnum.optional(),
  children: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    intention: z.enum(["Included in Application", "Not Included"]).optional(),
  })).optional(),
});

export const familySponsorSchema = z.object({
  has_family_sponsor: yesNoEnum.optional(),
  sponsor_relation: z.enum([
    "Parent",
    "Spouse",
    "Child",
    "Sibling",
    "Other Relative",
  ]).optional(),
}).refine((data) => {
  // If user selects "Yes", sponsor_relation is required
  if (data.has_family_sponsor === "Yes") {
    return !!data.sponsor_relation;
  }
  return true;
}, {
  message: "Relationship to sponsor is required when you have a family sponsor",
  path: ["sponsor_relation"],
});

export const familyMembersSchema = z.object({
  family_members: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    relationship: z.string(),
  })).optional(),
});

export const addressesSchema = z.object({
  same_residence: yesNoEnum.optional(),
  address_history: z.array(z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    address: z.string(),
    legal_status: z.string().optional(),
  })).optional(),
});

export const contactDetailsSchema = z.object({
  shared_phone: yesNoEnum.optional(),
  phone_numbers: z.object({
    after_hours: z.string().optional(),
    office_hours: z.string().optional(),
    mobile: z.string().optional(),
  }).optional(),
  shared_email: yesNoEnum.optional(),
  email: z.string().optional(),
  shared_postal: yesNoEnum.optional(),
  postal_address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
  }).optional(),
});

export const visasSchema = z.object({
  has_previous_visa: yesNoEnum.optional(),
  visa_history: z.array(z.object({
    country: z.string(),
    type: z.string().optional(),
    linked_passport: z.string().optional(),
    decision_date: z.string().optional(),
    outcome: z.enum(["Granted", "Refused", "Cancelled", "Pending"]).optional(),
  })).optional(),
});

export const travelHistorySchema = z.object({
  has_travel: yesNoEnum.optional(),
  travel_history: z.array(z.object({
    country: z.string().optional(),
    arrival_date: z.string().optional(),
    departure_date: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
});

export const futureTravelSchema = z.object({
  has_future_travel: yesNoEnum.optional(),
  future_travel: z.array(z.object({
    from_to: z.string().optional(),
    start_date: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
});

export const futureAddressesSchema = z.object({
  knows_future_address: yesNoEnum.optional(),
  future_addresses: z.array(z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    address: z.string().optional(),
  })).optional(),
});

export const healthSchema = z.object({
  health_exam_12m: yesNoEnum.optional(),
  health_exams: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    country: z.string().optional(),
    date_completed: z.string().optional(),
  })).optional(),
  intends_healthcare_work: yesNoEnum.optional(),
  health_work: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
  tb_history: yesNoEnum.optional(),
  tb_history_details: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  tb_close_contact: yesNoEnum.optional(),
  tb_close_contact_details: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  listed_health_conditions: yesNoEnum.optional(),
  health_conditions: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
    condition: z.string().optional(),
  })).optional(),
  needs_medical_care: yesNoEnum.optional(),
  medical_care_details: z.array(z.object({
    name: z.string(),
    dob: z.string().optional(),
  })).optional(),
});

export const characterSchema = z.object({
  character: z.record(z.object({
    answer: yesNoEnum,
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
});

export const contactsSchema = z.object({
  contacts_note: z.string().optional(),
});
