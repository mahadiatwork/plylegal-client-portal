"use client";

import VisaProfilePage from "@/components/intake/VisaProfilePage";

const PROTECTION_RELATIONSHIPS = [
  { value: "main_applicant", label: "Main Applicant" },
  { value: "spouse", label: "Spouse or De Facto Partner" },
  { value: "child", label: "Dependent Child" },
];

const PROTECTION_INFO_ITEMS = [
  "Main applicant",
  "Spouse or de facto partner",
  "Dependent children",
];

export default function ProtectionProfilePage() {
  return (
    <VisaProfilePage
      relationships={PROTECTION_RELATIONSHIPS}
      detailsSectionKey="mainApplicant.details"
      continueHref="/intake/protection/main-applicant/details"
      infoItems={PROTECTION_INFO_ITEMS}
    />
  );
}
