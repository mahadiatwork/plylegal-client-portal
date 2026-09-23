import assert from "node:assert/strict";
import test from "node:test";
import {
  getQuestionnaireApplicantIdOptions,
  getQuestionnaireMonthOptions,
  getQuestionnaireNonMigratingMemberUpdates,
  getQuestionnairePageSavedValues,
  getQuestionnairePageStorageTarget,
  getQuestionnairePageStorageValues,
  getQuestionnairePageValidationIssues,
} from "../src/lib/questionnaires/answers.js";
import { SPONSOR_CHARACTER_KEYS } from "../src/lib/partnerQuestionnaireAlignment.js";

const promotedProfilePage = {
  id: "temporary-work-main-applicant-details",
  scope: "profile",
  sectionKey: "temporary_work_details",
  metadata: {
    renderer: "dynamic",
    builtInPageId: "temporary-work-main-applicant-details",
    profileSection: "details",
    storagePath: "temporary_work_details",
  },
};

const promotedSponsorCharacterPage = {
  id: "partner-family-sponsor-character",
  route: "/intake/partner/family-sponsor/character",
  scope: "shared",
  sectionKey: "partner_family_sponsor_character",
  metadata: {
    renderer: "dynamic",
    builtInPageId: "partner-family-sponsor-character",
    storagePath: "familySponsor.details",
  },
};

test("promoted built-in pages load the modern profile section before legacy answers", () => {
  const draft = {
    profiles_data: {
      applicant: { details: { family_name: "Modern" } },
    },
    temporary_work_details: { family_name: "Legacy" },
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, promotedProfilePage, "applicant"),
    { family_name: "Modern" },
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(promotedProfilePage, "applicant"),
    { type: "profile", profileId: "applicant", sectionKey: "details" },
  );
});

test("an explicitly saved empty modern profile section does not revive stale legacy answers", () => {
  const draft = {
    profiles_data: { applicant: { details: {} } },
    temporary_work_details: { family_name: "Stale legacy value" },
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, promotedProfilePage, "applicant"),
    {},
  );
});

test("promoted child pages never inherit a root applicant legacy section", () => {
  const childPage = {
    ...promotedProfilePage,
    route: "/intake/temporary-work/children/child-profile/details",
    metadata: {
      ...promotedProfilePage.metadata,
      builtInPageId: "temporary-work-children-child-profile-details",
      profileRole: "child",
    },
  };
  const olderChildPage = {
    ...childPage,
    route: "/intake/temporary-work/children/child-1/details",
    metadata: {
      ...childPage.metadata,
    },
  };
  delete olderChildPage.metadata.profileRole;
  const draft = {
    profiles_data: { "child-1": {} },
    temporary_work_details: { family_name: "Main applicant" },
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, childPage, "child-1"),
    {},
  );
  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, olderChildPage, "child-1"),
    {},
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(childPage, "child-1"),
    { type: "profile", profileId: "child-1", sectionKey: "details" },
  );
});

test("promoted profile pages fall back to their legacy path and keep saving there without a profile", () => {
  const draft = {
    temporary_work_details: { family_name: "Existing answer" },
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, promotedProfilePage, "applicant"),
    { family_name: "Existing answer" },
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(promotedProfilePage),
    { type: "section", sectionKey: "temporary_work_details" },
  );
});

test("built-in profile pages without a modern profileSection continue using legacy storage", () => {
  const legacyOnlyPage = {
    scope: "profile",
    sectionKey: "protection_employment",
    metadata: {
      renderer: "dynamic",
      storagePath: "protection_employment",
    },
  };
  const draft = {
    profiles_data: {
      applicant: { protection_employment: { employer: "Wrong location" } },
    },
    protection_employment: { employer: "Legacy location" },
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, legacyOnlyPage, "applicant"),
    { employer: "Legacy location" },
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(legacyOnlyPage, "applicant"),
    { type: "section", sectionKey: "protection_employment" },
  );
});

test("Partner spouse Details keeps its per-profile storage even in older built-in definitions", () => {
  const page = {
    id: "partner-spouse-partner-details",
    route: "/intake/partner/spouse-partner/details",
    scope: "profile",
    sectionKey: "partner_spouse_partner_details",
    metadata: {
      renderer: "dynamic",
      builtInPageId: "partner-spouse-partner-details",
      storagePath: "spousePartner.details",
      profileRole: "spouse",
    },
  };
  const draft = {
    profiles_data: {
      spouse: { details: { family_name: "Current spouse" } },
    },
    spousePartner: { details: { family_name: "Stale legacy spouse" } },
  };

  assert.deepEqual(
    getQuestionnairePageStorageTarget(page, "spouse"),
    { type: "profile", profileId: "spouse", sectionKey: "details" },
  );
  assert.deepEqual(
    getQuestionnairePageSavedValues(draft, page, "spouse"),
    { family_name: "Current spouse" },
  );
});

test("legacy dotted paths support nested and historically literal partner storage", () => {
  const page = {
    ...promotedProfilePage,
    sectionKey: "partner_main_applicant_details",
    metadata: {
      ...promotedProfilePage.metadata,
      storagePath: "mainApplicant.details",
    },
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(
      { mainApplicant: { details: { family_name: "Nested" } } },
      page,
      "applicant",
    ),
    { family_name: "Nested" },
  );
  assert.deepEqual(
    getQuestionnairePageSavedValues(
      { "mainApplicant.details": { family_name: "Literal" } },
      page,
      "applicant",
    ),
    { family_name: "Literal" },
  );
  assert.deepEqual(
    getQuestionnairePageSavedValues(
      {
        mainApplicant: { details: { family_name: "Latest nested save" } },
        "mainApplicant.details": { family_name: "Stale literal value" },
      },
      page,
      "applicant",
    ),
    { family_name: "Latest nested save" },
  );
});

test("shared promoted pages use legacy storage while native JSON pages keep sectionKey storage", () => {
  const promotedSharedPage = {
    scope: "shared",
    sectionKey: "partner_family_sponsor_contact",
    metadata: {
      renderer: "dynamic",
      storagePath: "familySponsor.details",
    },
  };
  const nativeProfilePage = {
    scope: "profile",
    sectionKey: "character",
    metadata: { renderer: "dynamic" },
  };
  const nativeSharedPage = {
    scope: "shared",
    sectionKey: "temporary_work_character",
  };

  assert.deepEqual(
    getQuestionnairePageSavedValues(
      { familySponsor: { details: { email: "client@example.com" } } },
      promotedSharedPage,
    ),
    { email: "client@example.com" },
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(promotedSharedPage),
    { type: "section", sectionKey: "familySponsor.details" },
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(nativeProfilePage, "applicant"),
    { type: "profile", profileId: "applicant", sectionKey: "character" },
  );
  assert.deepEqual(
    getQuestionnairePageStorageTarget(nativeSharedPage),
    { type: "section", sectionKey: "temporary_work_character" },
  );
  assert.deepEqual(
    getQuestionnairePageSavedValues(
      {
        profiles_data: { applicant: { character: { answer: "yes" } } },
        temporary_work_character: { answer: "no" },
      },
      nativeProfilePage,
      "applicant",
    ),
    { answer: "yes" },
  );
  assert.deepEqual(
    getQuestionnairePageSavedValues(
      { temporary_work_character: { answer: "no" } },
      nativeSharedPage,
    ),
    { answer: "no" },
  );
});

test("promoted sponsor Character loads canonical declarations without dropping shared sponsor data", () => {
  const canonicalEvent = { country: "Australia", details: "Canonical event" };
  const legacyEvent = { country: "Canada", details: "Legacy event" };
  const draft = {
    familySponsor: {
      details: {
        given_names: "Asha",
        family_name: "Sponsor",
        email: "asha@example.com",
        convicted_child_offence: "yes",
        convicted_child_offence_details: [{ details: "Existing conviction" }],
        national_security_risk: "yes",
        national_security_risk_details: [canonicalEvent],
        national_security_details: [{ ...canonicalEvent }, legacyEvent],
      },
    },
  };
  const originalDraft = structuredClone(draft);

  const values = getQuestionnairePageSavedValues(draft, promotedSponsorCharacterPage);

  assert.equal(values.email, "asha@example.com");
  assert.equal(values.convicted_child_offence, "yes");
  assert.deepEqual(values.convicted_child_offence_details, [{ details: "Existing conviction" }]);
  assert.deepEqual(values.national_security_risk_details, [canonicalEvent, legacyEvent]);
  assert.deepEqual(values.national_security_details, [{ ...canonicalEvent }, legacyEvent]);
  assert.equal(values.charged_child_offence, "no");
  assert.deepEqual(values.charged_child_offence_details, []);
  assert.equal(Object.hasOwn(values.convicted_child_offence_details[0], "applicant_name"), false);
  assert.deepEqual(draft, originalDraft);
});

test("promoted sponsor Character attributes every declaration row and keeps the legacy alias synchronized", () => {
  assert.equal(SPONSOR_CHARACTER_KEYS.length, 14);
  const values = Object.fromEntries(SPONSOR_CHARACTER_KEYS.flatMap((key, index) => [
    [key, "yes"],
    [`${key}_details`, [{
      details: `Details for ${key}`,
      applicant_name: "Stale sponsor",
      ...(index % 2 === 0 ? { name: "Legacy sponsor" } : {}),
    }]],
  ]));
  const draft = {
    familySponsor: {
      details: {
        given_names: "Asha",
        family_name: "Sponsor",
        email: "keep@example.com",
        national_security_details: [{ details: "Old legacy value" }],
      },
    },
  };
  const originalValues = structuredClone(values);
  const originalDraft = structuredClone(draft);

  const stored = getQuestionnairePageStorageValues(
    promotedSponsorCharacterPage,
    values,
    draft,
  );

  assert.equal(stored.email, "keep@example.com");
  SPONSOR_CHARACTER_KEYS.forEach((key, index) => {
    const row = stored[`${key}_details`][0];
    assert.equal(row.applicant_name, "Asha Sponsor");
    if (index % 2 === 0) assert.equal(row.name, "Asha Sponsor");
    else assert.equal(Object.hasOwn(row, "name"), false);
  });
  assert.deepEqual(
    stored.national_security_details,
    stored.national_security_risk_details,
  );
  assert.deepEqual(values, originalValues);
  assert.deepEqual(draft, originalDraft);
});

test("promoted sponsor Character does not create a legacy national-security array for newer drafts", () => {
  const values = {
    national_security_risk: "yes",
    national_security_risk_details: [{ details: "Current event", name: "" }],
    national_security_details: [{ details: "Form-only stale alias" }],
  };
  const draft = {
    familySponsor: {
      details: { email: "keep@example.com" },
    },
  };

  const stored = getQuestionnairePageStorageValues(
    promotedSponsorCharacterPage,
    values,
    draft,
  );

  assert.equal(stored.email, "keep@example.com");
  assert.equal(Object.hasOwn(stored, "national_security_details"), false);
  assert.deepEqual(stored.national_security_risk_details, [{
    details: "Current event",
    name: "Family Sponsor",
    applicant_name: "Family Sponsor",
  }]);
});

test("applicant language pages adapt the profile-keyed legacy contract without losing rows", () => {
  const currentYear = new Date().getFullYear();
  const page = {
    scope: "shared",
    sectionKey: "protection_languages",
    metadata: {
      renderer: "dynamic",
      storagePath: "protection_languages",
      answerLayout: "applicantLanguages",
    },
    questions: [],
  };
  const draft = {
    profiles: [
      { id: "adult", given_names: "Adult", family_name: "Applicant", birth_day: "1", birth_month: "January", birth_year: String(currentYear - 30) },
      { id: "child", given_names: "Child", birth_day: "1", birth_month: "1", birth_year: String(currentYear - 10) },
      { id: "unknown", given_names: "Unknown" },
    ],
    protection_languages: {
      adult: [{ language: "English", speak: true, read: false, write: true, preference_order: 1 }],
      orphan: [{ language: "French", speak: true }],
    },
  };

  const formValues = getQuestionnairePageSavedValues(draft, page);
  assert.deepEqual(formValues.applicants.map(({ id, _languageEligibility }) => ({ id, _languageEligibility })), [
    { id: "adult", _languageEligibility: "required" },
    { id: "unknown", _languageEligibility: "unknown" },
    { id: "orphan", _languageEligibility: "optional" },
  ]);
  assert.deepEqual(getQuestionnairePageStorageValues(page, formValues), {
    adult: [{ language: "English", speak: true, read: false, write: true, preference_order: 1 }],
    unknown: [],
    orphan: [{ language: "French", speak: true, read: false, write: false, preference_order: 1 }],
  });
  assert.ok(
    getQuestionnairePageValidationIssues(page, formValues)
      .some((issue) => issue.fieldName === "applicants.1.languages"),
  );
});

test("applicant selectors use stable profile ids while showing client names", () => {
  const options = getQuestionnaireApplicantIdOptions({
    profiles: [
      { id: "profile-main", relationship: "main_applicant" },
      { id: "profile-child", relationship: "child", given_names: "Asha", family_name: "Lee" },
    ],
    profiles_data: {
      "profile-main": { details: { given_names: "Mina", family_name: "Lee" } },
    },
  });

  assert.deepEqual(options, [
    { value: "profile-main", label: "Mina Lee (Main Applicant)", relationship: "main_applicant" },
    { value: "profile-child", label: "Asha Lee (Child)", relationship: "child" },
  ]);
});

test("temporary-work applicant selectors retain legacy no-profile identifiers", () => {
  const page = {
    route: "/intake/temporary-work/all-applicants/travel-history",
    metadata: { builtInPageId: "temporary-work-all-applicants-travel-history" },
  };
  const options = getQuestionnaireApplicantIdOptions({
    temporary_work_details: { given_names: "Main", family_name: "Applicant" },
    temporary_work_spouse_details: { given_names: "Sam", family_name: "Partner" },
    temporary_work_children: {
      children: [
        { given_names: "Included", family_name: "Child", included_in_application: "Yes" },
        { given_names: "Excluded", family_name: "Child", included_in_application: "No" },
      ],
    },
  }, page);

  assert.deepEqual(options.map(({ value, label }) => ({ value, label })), [
    { value: "legacy_main", label: "Main Applicant" },
    { value: "legacy_spouse", label: "Sam Partner (Spouse/Partner)" },
    { value: "legacy_child_0", label: "Included Child (Child)" },
  ]);
});

test("promoted Protection addresses preserve per-applicant maps and shared-address semantics", () => {
  const page = {
    metadata: {
      renderer: "dynamic",
      builtInPageId: "protection-all-applicants-addresses",
      storagePath: "protection_addresses",
    },
  };
  const draft = {
    profiles: [
      { id: "main", relationship: "main_applicant", given_names: "Main" },
      { id: "child", relationship: "child", given_names: "Child" },
    ],
    protection_addresses: {
      all_same_address: "no",
      addresses_by_applicant: {
        main: [{ address_line1: "1 Old Street" }],
        child: [{ address_line1: "2 Child Street" }],
      },
    },
  };

  const formValues = getQuestionnairePageSavedValues(draft, page);
  assert.deepEqual(formValues.main_applicant_addresses, [{ address_line1: "1 Old Street" }]);
  assert.deepEqual(formValues.addresses_by_applicant.child, [{ address_line1: "2 Child Street" }]);

  const separate = getQuestionnairePageStorageValues(page, {
    ...formValues,
    main_applicant_addresses: [{ address_line1: "1 New Street" }],
  }, draft);
  assert.deepEqual(separate.addresses_by_applicant, {
    main: [{ address_line1: "1 New Street" }],
    child: [{ address_line1: "2 Child Street" }],
  });

  const shared = getQuestionnairePageStorageValues(page, {
    ...separate,
    all_same_address: "yes",
  }, draft);
  assert.deepEqual(shared.addresses_by_applicant, {
    main: [{ address_line1: "1 New Street" }],
  });
});

test("new legacy Protection address pages default to separate addresses and persist the fallback main applicant", () => {
  const page = {
    metadata: {
      builtInPageId: "protection-all-applicants-addresses",
      storagePath: "protection_addresses",
    },
  };
  const draft = { protection_details: { given_names: "Legacy", family_name: "Applicant" } };
  const formValues = getQuestionnairePageSavedValues(draft, page);

  assert.equal(formValues.all_same_address, "no");
  assert.deepEqual(formValues.addresses_by_applicant, { "main-applicant": [] });

  const stored = getQuestionnairePageStorageValues(page, {
    ...formValues,
    all_same_address: "yes",
    main_applicant_addresses: [{ address_line1: "1 Legacy Street" }],
  }, draft);
  assert.deepEqual(stored.addresses_by_applicant, {
    "main-applicant": [{ address_line1: "1 Legacy Street" }],
  });
});

test("promoted Protection addresses require continuous 20-year coverage for every applicant", () => {
  const page = {
    metadata: {
      renderer: "dynamic",
      builtInPageId: "protection-all-applicants-addresses",
      storagePath: "protection_addresses",
    },
    questions: [],
  };
  const draft = {
    profiles: [
      { id: "main", relationship: "main_applicant", given_names: "Main" },
      { id: "child", relationship: "child", given_names: "Child" },
    ],
  };
  const empty = getQuestionnairePageSavedValues(draft, page);
  assert.deepEqual(empty.addresses_by_applicant, { main: [], child: [] });
  assert.ok(getQuestionnairePageValidationIssues(page, empty).length >= 2);

  const today = new Date();
  const coveringRow = {
    date_from_day: String(today.getDate()),
    date_from_month: String(today.getMonth() + 1),
    date_from_year: String(today.getFullYear() - 20),
  };
  const complete = {
    ...empty,
    main_applicant_addresses: [coveringRow],
    // The visible main-applicant field is authoritative while its legacy map
    // alias remains stale until persistence adapts the form values.
    addresses_by_applicant: { main: [], child: [coveringRow] },
  };
  assert.deepEqual(getQuestionnairePageValidationIssues(page, complete), []);

  assert.equal(
    Object.hasOwn(getQuestionnairePageStorageValues(page, complete, draft), "_questionnaireMainApplicantId"),
    false,
  );

  assert.deepEqual(
    getQuestionnairePageValidationIssues(page, {
      ...complete,
      all_same_address: "yes",
      main_applicant_addresses: [{ ...coveringRow, date_to_day: "1" }],
    }).map((issue) => issue.fieldName),
    ["main_applicant_addresses"],
  );
});

test("extracted date controls retain legacy month names while native JSON dates stay numeric", () => {
  const extracted = {
    monthOptions: [{ value: "1", label: "January" }, { value: "2", label: "February" }],
    metadata: { originalLabel: "Date issued" },
  };
  assert.deepEqual(getQuestionnaireMonthOptions(extracted, ""), extracted.monthOptions);
  assert.deepEqual(getQuestionnaireMonthOptions(extracted, "2"), extracted.monthOptions);
  assert.deepEqual(getQuestionnaireMonthOptions(extracted, "January"), [
    ...extracted.monthOptions,
    { value: "January", label: "January" },
  ]);
  assert.equal(
    getQuestionnaireMonthOptions({ metadata: { originalLabel: "Date issued" } }, "")[0].value,
    "January",
  );
  assert.equal(getQuestionnaireMonthOptions({ metadata: {} }, "")[0].value, "1");
});

test("non-migrating pages read and update the selected member without touching root applicant data", () => {
  const page = {
    route: "/intake/temporary-work/non-migrating/member-1/details",
    scope: "profile",
    sectionKey: "temporary_work_details",
    metadata: {
      renderer: "dynamic",
      profileRole: "non_migrating",
      storagePath: "temporary_work_details",
    },
  };
  const member = {
    id: "member-1",
    relationship: "parent",
    relationship_status: "Married",
    passport: { number: "KEEP", sex: "Female", dob_day: "2", dob_month: "May", dob_year: "1970" },
    place_of_birth: { town_city: "Paris", state_province: "Ile-de-France", country: "France" },
  };
  const draft = {
    temporary_work_details: { relationship: "main applicant data" },
    non_migrating_members: [member],
  };

  assert.deepEqual(getQuestionnairePageStorageTarget(page, null, "member-1"), {
    type: "nonMigratingMember",
    memberId: "member-1",
    sectionKey: "temporary_work_details",
  });
  const values = getQuestionnairePageSavedValues(draft, page, null, "member-1");
  assert.equal(values.relationship, "parent");
  assert.equal(values.dob_month, "May");
  assert.equal(values.place_of_birth_country, "France");

  const updates = getQuestionnaireNonMigratingMemberUpdates(
    page,
    { ...values, relationship_status: "Widowed", place_of_birth_country: "Canada" },
    member,
  );
  assert.equal(updates.relationship_status, "Widowed");
  assert.equal(updates.passport.number, "KEEP");
  assert.equal(updates.place_of_birth.country, "Canada");
  assert.deepEqual(getQuestionnairePageSavedValues(draft, page), {});
});
