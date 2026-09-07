import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTargetIdentityDocuments, preserveEditedIdentityRows } from "../src/lib/targetVisaIdentity.js";

test("adding common identity documents preserves 866 citizenship, statelessness and residency answers", () => {
  const raw = {
    is_current_citizen: "no", stateless_reason: "Historic explanation", has_ever_been_citizen: "yes",
    previous_citizenships: [{ country: "France", how_obtained: "Grant", ceased_reason: "Relinquished", evidence_id: "original" }],
    has_permanent_residency_rights: "yes", permanent_residencies: [{ country: "Canada", evidence: "Keep" }],
    extra_legacy_answer: "Keep",
  };
  const result = normalizeTargetIdentityDocuments(raw);
  assert.equal(result.stateless_reason, raw.stateless_reason);
  assert.deepEqual(result.previous_citizenships, raw.previous_citizenships);
  assert.deepEqual(result.permanent_residencies, raw.permanent_residencies);
  assert.equal(result.extra_legacy_answer, "Keep");
  assert.deepEqual(result.passports, []);
  assert.equal(result.has_national_id, "no");
});

test("legacy document flags and optional date parts normalize without dropping names or metadata", () => {
  const raw = {
    passports: [{ document_number: "OLD-PASSPORT", evidence_id: "retain" }],
    national_id_card: { family_name: "Family", given_names: "Given", identification_number: "OLD-NID", country_of_issue: "Laos", date_issued_day: "04", date_issued_month: "09", extra: "keep" },
  };
  const result = normalizeTargetIdentityDocuments(raw);
  assert.equal(result.has_passport, "yes");
  assert.equal(result.has_national_id, "yes");
  assert.equal(result.national_id_card.date_issued_day, "4");
  assert.equal(result.national_id_card.date_issued_month, "September");
  assert.equal(result.national_id_card.extra, "keep");
  assert.equal(raw.national_id_card.date_issued_day, "04");
  const edited = preserveEditedIdentityRows(result.passports, [{ document_number: "UPDATED" }]);
  assert.deepEqual(edited, [{ document_number: "UPDATED", evidence_id: "retain" }]);
});

test("unrecognized imported identity rows remain available and do not multiply after reload", () => {
  const raw = { identity_documents: [{ doc_type: "Legacy evidence", id_number: "ABC", country_of_issue: "France", legacy_note: "Keep" }] };
  const first = normalizeTargetIdentityDocuments(raw);
  const second = normalizeTargetIdentityDocuments(first);
  assert.deepEqual(second.identity_documents, raw.identity_documents);
  assert.equal(first.identity_import_review.length, 1);
  assert.deepEqual(second.identity_import_review, first.identity_import_review);
});
