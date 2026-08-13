// Ply Legal Intake Types
export type YesNo = "Yes" | "No";

export type NameParts = { 
  family_name: string; 
  given_names: string; 
};

export type DateRange = { 
  from?: string; 
  to?: string;
};

export type OtherName = NameParts & { 
  reason_for_change: string;
};

export type Citizenship = { 
  country: string; 
  obtained_method: string; 
  date_obtained?: string; 
  still_citizen?: boolean;
};

export type Passport = { 
  doc_number: string; 
  name: string; 
  nationality: string; 
  date_of_issue?: string; 
  status?: "Valid" | "Expired" | "Cancelled";
};

export type IdentityDoc = { 
  doc_type: string; 
  id_number: string; 
  name: string; 
  country_of_issue: string; 
  date_of_issue?: string;
};

export type EmploymentRow = { 
  date_from?: string; 
  date_to?: string; 
  status?: string; 
  position?: string; 
  country?: string;
};

export type EducationRow = { 
  date_from?: string; 
  date_to?: string; 
  course_name: string; 
  institution_name: string; 
  country?: string; 
  status?: "Completed" | "Ongoing" | "Withdrawn";
};

export type LanguageRow = { 
  language: string; 
  proficiency?: "Basic" | "Intermediate" | "Proficient" | "Native"; 
  main_language?: boolean;
};

export type ChildRow = { 
  name: string; 
  dob?: string; 
  gender?: "Male" | "Female" | "Other"; 
  intention?: "Included in Application" | "Not Included";
};

export type AddressRow = DateRange & { 
  address: string; 
  legal_status?: string;
};

export type PostalAddress = { 
  line1: string; 
  line2?: string; 
  city: string; 
  state: string; 
  postcode: string; 
  country: string;
};

export type VisaRow = { 
  country: string; 
  type?: string; 
  linked_passport?: string; 
  decision_date?: string; 
  outcome?: "Granted" | "Refused" | "Cancelled" | "Pending";
};

export type TravelRow = { 
  country?: string; 
  arrival_date?: string; 
  departure_date?: string; 
  reason?: string;
};

export type FutureTravelRow = { 
  from_to?: string; 
  start_date?: string; 
  reason?: string;
};

export type FutureAddressRow = { 
  date_from?: string; 
  date_to?: string; 
  address?: string;
};

export type HealthExamRow = { 
  name: string; 
  dob?: string; 
  country?: string; 
  date_completed?: string;
};

export type HealthWorkRow = { 
  name: string; 
  dob?: string; 
  role?: string;
};

export type TBRow = { 
  name: string; 
  dob?: string; 
  country?: string;
};

export type HealthConditionRow = { 
  name: string; 
  dob?: string; 
  condition?: string;
};

export type MedCareRow = { 
  name: string; 
  dob?: string;
};

export type CharacterDetail = { 
  name?: string; 
  dob?: string; 
  detail?: string; 
  country?: string; 
  date?: string; 
  offence?: string; 
  penalty?: string;
};

export type Intake = {
  started?: boolean;

  // Main Applicant - Details
  is_main_applicant?: YesNo;
  prefix?: "Mr" | "Mrs" | "Miss" | "Ms" | "Dr" | "Other";
  family_name?: string;
  given_names?: string;
  preferred_names?: string;
  gender?: "Male" | "Female" | "Other";
  dob?: string;
  country_of_birth?: string;
  suburb_of_birth?: string;
  city_of_birth?: string;
  state_of_birth?: string;
  marital_status?: "Never Married" | "Married" | "De Facto" | "Divorced" | "Widowed" | "Separated";

  // Main Applicant - Other
  has_other_names?: YesNo;
  other_names?: OtherName[];
  use_chinese_code?: YesNo;
  chinese_code?: string;
  russian_descent?: YesNo;
  patronymic_name?: NameParts;
  has_prev_dob?: YesNo;
  prev_dobs?: string[];

  // Identity
  citizen_of_country?: YesNo;
  citizenships?: Citizenship[];
  has_passport?: YesNo;
  passports?: Passport[];
  has_identity_doc?: YesNo;
  identity_docs?: IdentityDoc[];
  permanent_residency_rights?: YesNo;
  pr_countries?: { country: string }[];

  // Employment
  currently_employed?: YesNo;
  employment_history?: EmploymentRow[];

  // Education
  has_education?: YesNo;
  education_history?: EducationRow[];

  // Language
  is_english_main?: YesNo;
  languages?: LanguageRow[];

  // Family (in Main Applicant)
  has_children?: YesNo;

  // Children
  has_children_joint?: YesNo;
  children?: ChildRow[];

  // Family Sponsor
  has_family_sponsor?: YesNo;
  sponsor_relation?: "Parent" | "Spouse" | "Child" | "Sibling" | "Other Relative";

  // Family (section)
  family_members?: { name: string; dob?: string; relationship: string }[];

  // All Applicants
  same_residence?: YesNo;
  address_history?: AddressRow[];

  shared_phone?: YesNo;
  phone_numbers?: { after_hours?: string; office_hours?: string; mobile?: string };

  shared_email?: YesNo;
  email?: string;

  shared_postal?: YesNo;
  postal_address?: PostalAddress;

  has_previous_visa?: YesNo;
  visa_history?: VisaRow[];

  has_travel?: YesNo;
  travel_history?: TravelRow[];

  has_future_travel?: YesNo;
  future_travel?: FutureTravelRow[];

  knows_future_address?: YesNo;
  future_addresses?: FutureAddressRow[];

  // Health
  health_exam_12m?: YesNo; 
  health_exams?: HealthExamRow[];
  intends_healthcare_work?: YesNo; 
  health_work?: HealthWorkRow[];
  tb_history?: YesNo; 
  tb_history_details?: TBRow[];
  tb_close_contact?: YesNo; 
  tb_close_contact_details?: TBRow[];
  listed_health_conditions?: YesNo; 
  health_conditions?: HealthConditionRow[];
  needs_medical_care?: YesNo; 
  medical_care_details?: MedCareRow[];

  // Character (map of slug -> answer+details)
  character?: {
    [questionKey: string]: { answer: YesNo; details?: CharacterDetail[] }
  };

  // Contacts
  contacts_note?: string;
};

// Portal Types
export type ApplicationStatus = "Draft" | "Active" | "Submitted" | "Under Review" | "Completed";

export type Application = {
  id: string;
  reference: string;
  type: string;
  status: ApplicationStatus;
  updated: string;
  created: string;
};

export type UploadStatus = "Pending" | "Uploaded" | "Verified" | "Rejected";

export type Upload = {
  id: string;
  name: string;
  status: UploadStatus;
  uploadedAt?: string;
  url?: string;
  size?: number;
};

export type Document = {
  id: string;
  name: string;
  type: string;
  url?: string;
  size?: number;
  uploadedAt: string;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
};

export type DeliverableStatus = "Pending" | "In progress" | "Completed";

export type Deliverable = {
  id: string;
  item: string;
  description: string;
  status: DeliverableStatus;
};

export type ResourceType = "Guide" | "Link" | "Document";

export type Resource = {
  id: string;
  title: string;
  type: ResourceType;
  count?: number;
  url?: string;
};

export type ResourceTemplateItemKind = "folder" | "file" | "link" | "note";

export type ResourceTemplateItem = {
  id: string;
  parentId: string | null;
  kind: ResourceTemplateItemKind;
  name: string;
  category: string;
  order: number;
  status?: "active" | "draft" | "archived";
  externalUrl: string;
  downloadUrl?: string;
  noteText?: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ResourceTemplateCategory = {
  name: string;
  icon: string;
};

export type ResourceTemplate = {
  visaSlug: string;
  title: string;
  status: "active" | "draft" | "archived";
  categories: ResourceTemplateCategory[];
  updatedAt: string | null;
};

export type Message = {
  id: string;
  from: "client" | "plylegal";
  subject?: string;
  text: string;
  date: string;
};
