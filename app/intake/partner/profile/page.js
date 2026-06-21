"use client";

import VisaProfilePage from "@/components/intake/VisaProfilePage";

const PARTNER_RELATIONSHIPS = [
  { value: "main_applicant", label: "Main Applicant" },
  { value: "spouse", label: "Spouse or De Facto Partner" },
  { value: "child", label: "Dependent Child" },
  { value: "other", label: "Other Dependent" },
];

const PARTNER_INFO_ITEMS = [
  "Main applicant",
  "Spouse or de facto partner",
  "Dependent children",
];

export default function PartnerProfilePage() {
  return (
    <VisaProfilePage
      relationships={PARTNER_RELATIONSHIPS}
      detailsSectionKey="mainApplicant.details"
      continueHref="/intake/partner/main-applicant/details"
      infoItems={PARTNER_INFO_ITEMS}
    />
  );
}
