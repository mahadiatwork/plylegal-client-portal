import { z } from "zod";

const yesNoEnum = z.enum(["Yes", "No"]);

export const startSchema = z.object({
  started: z.boolean().refine((val) => val === true, {
    message: "You must accept to continue",
  }),
});

export const detailsSchema = z.object({
  is_main_applicant: yesNoEnum,
  // Main applicant fields (required when is_main_applicant === "Yes")
  prefix: z.string().optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  country_of_birth: z.string().optional(),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  marital_status: z.enum([
    "Never Married or been in a De Facto Relationship",
    "Married",
    "De Facto",
    "Divorced",
    "Widowed",
    "Separated",
  ]).optional(),
  marital_status_date_day: z.string().optional(),
  marital_status_date_month: z.string().optional(),
  marital_status_date_year: z.string().optional(),
  // Person completing questionnaire fields (required when is_main_applicant === "No")
  completing_family_name: z.string().optional(),
  completing_given_names: z.string().optional(),
  completing_preferred_names: z.string().optional(),
  completing_gender: z.enum(["Male", "Female"]).optional(),
  completing_birth_day: z.string().optional(),
  completing_birth_month: z.string().optional(),
  completing_birth_year: z.string().optional(),
  completing_country_of_birth: z.string().optional(),
  completing_suburb_of_birth: z.string().optional(),
  completing_city_of_birth: z.string().optional(),
  completing_state_of_birth: z.string().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation based on is_main_applicant
  if (data.is_main_applicant === "Yes") {
    // Require main applicant fields
    if (!data.family_name || data.family_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["family_name"],
      });
    }
    if (!data.given_names || data.given_names.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["given_names"],
      });
    }
    if (!data.gender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["gender"],
      });
    }
    if (!data.birth_day || !data.birth_month || !data.birth_year) {
      if (!data.birth_day) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["birth_day"],
        });
      }
      if (!data.birth_month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["birth_month"],
        });
      }
      if (!data.birth_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["birth_year"],
        });
      }
    }
    if (!data.country_of_birth || data.country_of_birth.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["country_of_birth"],
      });
    }
    if (!data.marital_status && data.is_main_applicant === "Yes") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["marital_status"],
      });
    }
    if (data.marital_status && data.marital_status !== "Never Married or been in a De Facto Relationship" && data.is_main_applicant === "Yes") {
      if (!data.marital_status_date_day || !data.marital_status_date_month || !data.marital_status_date_year) {
        if (!data.marital_status_date_day) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required",
            path: ["marital_status_date_day"],
          });
        }
        if (!data.marital_status_date_month) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required",
            path: ["marital_status_date_month"],
          });
        }
        if (!data.marital_status_date_year) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required",
            path: ["marital_status_date_year"],
          });
        }
      }
    }
  } else if (data.is_main_applicant === "No") {
    // Require person completing questionnaire fields
    if (!data.completing_family_name || data.completing_family_name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["completing_family_name"],
      });
    }
    if (!data.completing_given_names || data.completing_given_names.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["completing_given_names"],
      });
    }
    if (!data.completing_gender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["completing_gender"],
      });
    }
    if (!data.completing_birth_day || !data.completing_birth_month || !data.completing_birth_year) {
      if (!data.completing_birth_day) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["completing_birth_day"],
        });
      }
      if (!data.completing_birth_month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["completing_birth_month"],
        });
      }
      if (!data.completing_birth_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["completing_birth_year"],
        });
      }
    }
    if (!data.completing_country_of_birth || data.completing_country_of_birth.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["completing_country_of_birth"],
      });
    }
  }
});

export const otherSchema = z.object({
  has_other_names: yesNoEnum.optional(),
  other_names: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    reason_for_change: z.string(),
    has_evidence: z.string().optional(),
    evidence_type: z.string().optional(),
    document_issue_day: z.string().optional(),
    document_issue_month: z.string().optional(),
    document_issue_year: z.string().optional(),
    document_reference_number: z.string().optional(),
    issuing_country: z.string().optional(),
    issuing_state: z.string().optional(),
    place_of_issue: z.string().optional(),
    use_in_application: z.string().optional(),
  })).optional(),
  use_chinese_code: yesNoEnum.optional(),
  chinese_code: z.string().optional(),
  russian_descent: yesNoEnum.optional(),
  patronymic_name: z.object({
    family_name: z.string(),
    given_names: z.string(),
  }).optional(),
  has_prev_dob: yesNoEnum.optional(),
  prev_dobs: z.array(z.union([
    z.string(),
    z.object({
      day: z.string(),
      month: z.string(),
      year: z.string(),
      date: z.string().optional(),
    })
  ])).optional(),
}).superRefine((data, ctx) => {
  // If has_other_names is Yes, require at least one other name
  if (data.has_other_names === "Yes") {
    if (!data.other_names || data.other_names.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one other name is required when 'Yes' is selected",
        path: ["other_names"],
      });
    }
  }
  
  // If use_chinese_code is Yes, require chinese_code
  if (data.use_chinese_code === "Yes") {
    if (!data.chinese_code || data.chinese_code.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chinese Commercial Code is required when 'Yes' is selected",
        path: ["chinese_code"],
      });
    }
  }
  
  // If russian_descent is Yes, require patronymic_name fields
  if (data.russian_descent === "Yes") {
    if (!data.patronymic_name || !data.patronymic_name.family_name || !data.patronymic_name.given_names) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Patronymic name (Family Name and Given Names) is required when 'Yes' is selected",
        path: ["patronymic_name"],
      });
    }
  }
  
  // If has_prev_dob is Yes, require at least one previous DOB
  if (data.has_prev_dob === "Yes") {
    if (!data.prev_dobs || data.prev_dobs.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one previous date of birth is required when 'Yes' is selected",
        path: ["prev_dobs"],
      });
    }
  }
});

export const identitySchema = z.object({
  citizen_of_country: yesNoEnum.optional(),
  stateless_explanation: z.string().optional(),
  citizenships: z.array(z.object({
    country: z.string(),
    obtained_method: z.string(),
    date_obtained_day: z.string().optional(),
    date_obtained_month: z.string().optional(),
    date_obtained_year: z.string().optional(),
  })).optional(),
  has_passport: yesNoEnum.optional(),
  passports: z.array(z.object({
    document_type: z.string(),
    document_number: z.string(),
    passport_country: z.string(),
    place_of_issue: z.string(),
    nationality: z.string(),
    gender: z.string(),
    name: z.string(),
    date_issued_day: z.string().optional(),
    date_issued_month: z.string().optional(),
    date_issued_year: z.string().optional(),
    is_original_date: z.string().optional(),
    original_date_day: z.string().optional(),
    original_date_month: z.string().optional(),
    original_date_year: z.string().optional(),
    date_expiry_day: z.string().optional(),
    date_expiry_month: z.string().optional(),
    date_expiry_year: z.string().optional(),
    document_status: z.string(),
  })).optional(),
  has_identity_doc: yesNoEnum.optional(),
  identity_docs: z.array(z.object({
    document_type: z.string(),
    identification_number: z.string(),
    name: z.string(),
    country_of_issue: z.string(),
    state_province_of_issue: z.string().optional(),
    place_of_issue: z.string().optional(),
    date_issued_day: z.string().optional(),
    date_issued_month: z.string().optional(),
    date_issued_year: z.string().optional(),
    date_expiry_day: z.string().optional(),
    date_expiry_month: z.string().optional(),
    date_expiry_year: z.string().optional(),
  })).optional(),
  permanent_residency_rights: yesNoEnum.optional(),
  pr_countries: z.array(z.object({
    country: z.string(),
    residency_status: z.string().optional(),
    expiry_date_day: z.string().optional(),
    expiry_date_month: z.string().optional(),
    expiry_date_year: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If not a citizen, stateless explanation is required
  if (data.citizen_of_country === "No" && (!data.stateless_explanation || data.stateless_explanation.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Stateless explanation is required when you are not a citizen of any country",
      path: ["stateless_explanation"],
    });
  }
  
  // If is current citizen, require at least one citizenship entry
  if (data.citizen_of_country === "Yes" && (!data.citizenships || data.citizenships.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one citizenship is required",
      path: ["citizenships"],
    });
  }
  
  // If has passport, require at least one passport entry
  if (data.has_passport === "Yes" && (!data.passports || data.passports.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one passport/travel document is required",
      path: ["passports"],
    });
  }
  
  // If has identity doc, require at least one identity document entry
  if (data.has_identity_doc === "Yes" && (!data.identity_docs || data.identity_docs.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one identity document is required",
      path: ["identity_docs"],
    });
  }
  
  // If has permanent residency rights, require at least one PR country entry
  if (data.permanent_residency_rights === "Yes") {
    if (!data.pr_countries || data.pr_countries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one country of residency is required",
        path: ["pr_countries"],
      });
    } else {
      // Validate each PR country entry
      data.pr_countries.forEach((item, index) => {
        if (item.residency_status === "Temporary") {
          if (!item.expiry_date_day || !item.expiry_date_month || !item.expiry_date_year) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Expiry date is required for temporary residency",
              path: ["pr_countries", index, "expiry_date_day"],
            });
          }
        }
      });
    }
  }
});

export const employmentSchema = z.object({
  currently_employed: yesNoEnum.optional(),
  employment_history: z.array(z.object({
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    status: z.string().optional(),
    position: z.string().optional(),
    business_name: z.string().optional(),
    business_address_street: z.string().optional(),
    business_address_street_line2: z.string().optional(),
    business_address_suburb: z.string().optional(),
    business_address_state: z.string().optional(),
    business_address_postcode: z.string().optional(),
    main_duties: z.string().optional(),
    occupied_time: z.string().optional(),
    financial_support: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
});

export const educationSchema = z.object({
  has_education: yesNoEnum.optional(),
  education_history: z.array(z.object({
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    qualification_type: z.string().optional(),
    is_highest_qualification: z.string().optional(),
    course_name: z.string().optional(),
    course_language: z.string().optional(),
    course_status: z.string().optional(),
    institution_name: z.string().optional(),
    country: z.string().optional(),
    institution_address: z.string().optional(),
    institution_suburb: z.string().optional(),
    institution_state: z.string().optional(),
    institution_postcode: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If has education is Yes, require at least one education history entry
  if (data.has_education === "Yes" && (!data.education_history || data.education_history.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one education history entry is required",
      path: ["education_history"],
    });
  }
});

export const languageSchema = z.object({
  is_english_main: yesNoEnum.optional(),
  languages: z.array(z.object({
    language: z.string().optional(),
    proficiency: z.string().optional(),
    is_main_language: z.string().optional(),
  })).optional(),
});

export const familyMainSchema = z.object({
  has_children: yesNoEnum.optional(),
  children: z.array(z.object({
    family_name: z.string().optional(),
    given_names: z.string().optional(),
    name: z.string().optional(), // Keep for backward compatibility
    gender: z.string().optional(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    dob: z.string().optional(), // Keep for backward compatibility
    relationship: z.string().optional(),
    intention: z.enum(["Included in Application", "Not Included"]).optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If has children is Yes, require at least one child entry
  if (data.has_children === "Yes" && (!data.children || data.children.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one child entry is required",
      path: ["children"],
    });
  }
});

export const childrenSchema = z.object({
  has_children_joint: yesNoEnum.optional(),
  children: z.array(z.object({
    family_name: z.string().optional(),
    given_names: z.string().optional(),
    name: z.string().optional(), // Keep for backward compatibility
    gender: z.string().optional(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    dob: z.string().optional(), // Keep for backward compatibility
    relationship: z.string().optional(),
    intention: z.enum(["Included in Application", "Not Included"]).optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If has children is Yes, require at least one child entry
  if (data.has_children_joint === "Yes" && (!data.children || data.children.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one child entry is required",
      path: ["children"],
    });
  }
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
