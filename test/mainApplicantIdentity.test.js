import assert from "node:assert/strict";
import test from "node:test";
import {
  getIdentityLegacyRoot,
  normalizeIdentityForVisa,
  resolveIdentityDraftData,
  validateIdentityForVisa,
} from "../src/lib/mainApplicantIdentity.js";

const profile = {
  id: "profile-main",
  relationship: "main_applicant",
  given_names: "Alex",
  family_name: "Minimal",
};

const completeBase = {
  has_passport: "no",
  passports: [],
  has_national_id: "yes",
  national_id_card: {
    family_name: "Minimal",
    given_names: "Alex",
    identification_number: "NID-1",
    country_of_issue: "Bangladesh",
  },
  other_identity_documents: [],
};

test("canonical identity data stays canonical", () => {
  const normalized = normalizeIdentityForVisa(completeBase, "temporary-work", profile);
  assert.equal(normalized.has_national_id, "yes");
  assert.equal(normalized.national_id_card.identification_number, "NID-1");
  assert.deepEqual(normalized.other_identity_documents, []);
});

test("820 legacy root falls back and profile data wins", () => {
  const draft = {
    mainApplicant: {
      identity: {
        has_passport: "Yes",
        has_national_id: "no",
        stateless_explanation: "legacy",
      },
    },
    profiles_data: {
      "profile-main": {
        identity: {
          has_passport: "no",
          has_national_id: "yes",
        },
      },
    },
  };

  assert.equal(getIdentityLegacyRoot("partner"), "mainApplicant.identity");
  const resolved = resolveIdentityDraftData(draft, "partner", "profile-main");
  assert.equal(resolved.has_passport, "no");
  assert.equal(resolved.stateless_explanation, "legacy");
});

test("866 legacy government IDs convert only when safe", () => {
  const normalized = normalizeIdentityForVisa({
    has_passport: "No",
    identity_documents: [
      {
        document_type: "National Identity Document",
        identification_number: "SAFE-1",
        country_of_issue: "Bangladesh",
        name: "Alex Minimal",
      },
      {
        document_type: "Village ID",
        identification_number: "REVIEW-1",
        country_of_issue: "Bangladesh",
        name: "Unknown Name",
      },
    ],
  }, "protection", profile);

  assert.equal(normalized.has_national_id, "yes");
  assert.equal(normalized.national_id_card.family_name, "Minimal");
  assert.equal(normalized.identity_import_review.length, 1);
  assert.equal(normalized.identity_import_review[0].document_type, "Village ID");
});

test("route-specific extras are validated and unknown fields are preserved", () => {
  const normalized = normalizeIdentityForVisa({
    ...completeBase,
    custom_legacy_field: { keep: true },
    citizen_of_country: "no",
    stateless_explanation: "",
    ever_been_citizen: "no",
    permanent_residency_rights: "yes",
    pr_countries: [],
  }, "partner", profile);

  assert.deepEqual(normalized.custom_legacy_field, { keep: true });
  assert.deepEqual(validateIdentityForVisa(normalized, "temporary-work"), []);
  assert(validateIdentityForVisa(normalized, "partner").includes("Statelessness details"));
  assert(validateIdentityForVisa(normalized, "partner").includes("Residence rights details"));
});
