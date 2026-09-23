import assert from "node:assert/strict";
import test from "node:test";
import { buildTargetVisaReviewSections } from "../src/lib/targetVisaReview.js";

const profiles = [
  { id: "main", relationship: "main_applicant", given_names: "Alex", family_name: "Applicant" },
  { id: "child", relationship: "child", given_names: "Casey", family_name: "Child" },
];

test("review never attributes legacy main-applicant answers to a child and keeps edits scoped", () => {
  const sections = buildTargetVisaReviewSections({ visaType: "partner", appId: "matter-820", draft: {
    profiles, mainApplicant: { details: { city_of_birth: "Main-only birthplace" }, identity: { passport_number: "MAIN-PASSPORT" } },
    profiles_data: { main: { details: {} } },
  } });
  const childDetails = sections.find((section) => section.title.includes("Child (Casey Child)") && section.title.endsWith("Details"));
  assert.ok(childDetails);
  assert.ok(JSON.stringify(childDetails.items).includes("Casey"));
  assert.ok(!JSON.stringify(childDetails.items).includes("Main-only"));
  assert.ok(!sections.some((section) => section.title.includes("Child (Casey Child)") && JSON.stringify(section.items).includes("MAIN-PASSPORT")));
  assert.match(childDetails.editHref, /matter-820\/intake\/children\/child\/details/);
  const mainDetails = sections.find((section) => section.title.includes("Main Applicant") && section.title.endsWith("Details"));
  assert.ok(!JSON.stringify(mainDetails.items).includes("Main-only"), "an explicitly saved empty per-person section must supersede legacy data");
});

test("review keeps sponsor attribution and translates applicant references to names", () => {
  const sections = buildTargetVisaReviewSections({ visaType: "partner", appId: "matter", draft: {
    profiles,
    familySponsor: { details: { outstanding_debts: "yes", outstanding_debts_details: [{ details: "Sponsor debt" }] } },
    partner_travel: { history: [{ applicant_ids: ["main", "child"], country: "Australia", id: "internal-id" }] },
  } });
  const sponsor = sections.find((section) => section.title === "Family Sponsor");
  assert.match(sponsor.items[0].label, /your Sponsor/);
  assert.match(sponsor.formatLabel("outstanding_debts_details"), /your Sponsor.*Give details/);
  const travel = sections.find((section) => section.title.includes("Travel History"));
  assert.ok(JSON.stringify(travel.items).includes("Casey Child"));
  assert.ok(!JSON.stringify(travel.items).includes("internal-id"));
});

for (const [visaType, gate] of [["partner", "share_email_address"], ["protection", "share_same_email"]]) {
  test(`${visaType} review honours a shared-contact No without deleting the stored answer`, () => {
    const contact = { [gate]: "no", shared_email: "retained@example.test" };
    const draft = { profiles, [`${visaType}_contact_details`]: contact };
    const sections = buildTargetVisaReviewSections({ visaType, appId: "matter", draft });
    assert.ok(!JSON.stringify(sections).includes("retained@example.test"));
    assert.equal(contact.shared_email, "retained@example.test");
  });
}

test("review follows legacy-only education storage and uses education rather than visa-history labels", () => {
  const sections = buildTargetVisaReviewSections({ visaType: "protection", appId: "matter", draft: {
    profiles, profiles_data: { main: { education: {} } }, protection_education: { history: [{ institution: "Current saved school" }] },
  } });
  const education = sections.find((section) => section.title.endsWith("Education"));
  assert.equal(education.items[0].label, "Education History");
  assert.match(JSON.stringify(education.items), /Current saved school/);
});

test("review suppresses obsolete hidden answers and merges sponsor aliases without mutating stored history", () => {
  const event = { details: "One event" };
  const draft = { profiles, familySponsor: { details: { national_security_risk: "yes", national_security_details: [event], national_security_risk_details: [event] } },
    partner_health: { intends_hospital_entry: "no", hospital_details: [{ details: "Old hospital plan" }] },
    partner_character: { military_training: "no", military_training_details: [{ details: "Old training declaration" }] },
  };
  const sections = buildTargetVisaReviewSections({ visaType: "partner", appId: "matter", draft });
  assert.ok(!JSON.stringify(sections).includes("Old hospital plan"));
  assert.ok(!JSON.stringify(sections).includes("Old training declaration"));
  assert.equal(JSON.stringify(sections).split("One event").length - 1, 1);
  assert.equal(draft.familySponsor.details.national_security_details.length, 1);
  assert.equal(draft.partner_health.hospital_details.length, 1);
});

test("review groups saved date parts using the same formatter as approved visas", () => {
  const sections = buildTargetVisaReviewSections({ visaType: "partner", appId: "matter", draft: {
    profiles: [{ ...profiles[0], birth_day: "04", birth_month: "September", birth_year: "1990" }],
  } });
  const details = sections.find((section) => section.title.endsWith("Details"));
  assert.ok(details.items.some((item) => item.value === "04 September 1990"));
  assert.ok(!details.items.some((item) => item.value === "September"));
});

test("main Other Names review mirrors the form's legacy fallback with per-person answers taking precedence", () => {
  const sections = buildTargetVisaReviewSections({ visaType: "partner", appId: "matter", draft: {
    profiles, mainApplicant: { otherNames: { has_other_names: "yes", prior_fact: "Retained old answer", edited_fact: "Old value" } },
    profiles_data: { main: { other: { edited_fact: "Current value" } } },
  } });
  const other = sections.find((section) => section.title === "Main Applicant (Alex Applicant): Other Names");
  assert.match(JSON.stringify(other.items), /Retained old answer/);
  assert.match(JSON.stringify(other.items), /Current value/);
  assert.ok(!JSON.stringify(other.items).includes("Old value"));
});

test("promoted non-migrating pages review the selected member with published option labels", () => {
  const memberPage = {
    id: "partner-non-migrating-member-profile-other-names",
    route: "/intake/partner/non-migrating/member-profile/other-names",
    title: "Previous names",
    sectionKey: "partner_other_names",
    completionKey: "partner/non-migrating/member-profile/other-names",
    scope: "profile",
    metadata: { renderer: "dynamic", profileRole: "non_migrating", storagePath: "partner_other_names" },
    questions: [{
      id: "other_names",
      answerKey: "other_names",
      label: "Published previous names",
      type: "repeater",
      required: false,
      metadata: { fields: [{
        id: "type",
        answerKey: "type",
        label: "Published name type",
        type: "select",
        required: false,
        options: [{ value: "maiden", label: "Former surname" }],
      }] },
    }],
  };
  const sections = buildTargetVisaReviewSections({
    visaType: "partner",
    appId: "matter",
    questionnaireDefinition: { id: "published", revision: 1, pages: [memberPage] },
    draft: {
      profiles: [{ id: "main", relationship: "main_applicant" }],
      non_migrating_members: [{
        id: "member-1",
        passport: { given_names: "Family", family_name: "Member" },
        other_names: [{ type: "maiden" }],
      }],
    },
  });

  const review = sections.find((section) => section.title === "Previous names");
  assert.ok(review);
  assert.deepEqual(review.items, [{
    label: "Published previous names",
    value: [{ "Published name type": "Former surname" }],
  }]);
});

test("promoted partner applicant lists use client names in review", () => {
  const addressPage = {
    id: "partner-all-applicants-addresses",
    route: "/intake/partner/all-applicants/addresses",
    title: "Published addresses",
    sectionKey: "partner_addresses",
    completionKey: "partner/all-applicants/addresses",
    scope: "shared",
    metadata: { renderer: "dynamic", storagePath: "partner_addresses" },
    questions: [{
      id: "address_history",
      answerKey: "address_history",
      label: "Published address history",
      type: "repeater",
      required: false,
      metadata: { fields: [{
        id: "applicant_ids",
        answerKey: "applicant_ids",
        label: "Published applicants",
        type: "repeater",
        required: false,
        metadata: {
          itemType: "string",
          fields: [{ id: "value", answerKey: "value", label: "Applicant", type: "text", required: false }],
        },
      }, {
        id: "street",
        answerKey: "street",
        label: "Street",
        type: "text",
        required: false,
      }] },
    }],
  };
  const sections = buildTargetVisaReviewSections({
    visaType: "partner",
    appId: "matter",
    questionnaireDefinition: { id: "published", revision: 2, pages: [addressPage] },
    draft: {
      profiles,
      partner_addresses: {
        address_history: [{ applicant_ids: ["main", "child"], street: "10 Client Street" }],
      },
    },
  });

  const review = sections.find((section) => section.title === "Published addresses");
  assert.ok(review);
  assert.deepEqual(review.items, [{
    label: "Published address history",
    value: [{
      "Published applicants": ["Alex Applicant", "Casey Child"],
      Street: "10 Client Street",
    }],
  }]);
  assert.ok(!JSON.stringify(review.items).includes('"main"'));
  assert.ok(!JSON.stringify(review.items).includes('"child"'));
});
