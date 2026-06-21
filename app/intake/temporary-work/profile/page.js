"use client";

import VisaProfilePage from "@/components/intake/VisaProfilePage";

const RELATIONSHIPS = [
  { value: "main_applicant", label: "Main Applicant (Nominated Worker)" },
  { value: "spouse", label: "Spouse or De Facto Partner" },
  { value: "child", label: "Dependent Child" },
  { value: "other", label: "Other Dependent" },
];

const INFO_ITEMS = [
  "Main applicant",
  "Spouse or de facto partner",
  "Dependent children",
];

export default function ApplicationProfilePage() {
  return (
    <VisaProfilePage
      relationships={RELATIONSHIPS}
      detailsSectionKey="temporary_work_details"
      continueHref="/intake/temporary-work/main-applicant/details"
      infoItems={INFO_ITEMS}
    />
  );
}
