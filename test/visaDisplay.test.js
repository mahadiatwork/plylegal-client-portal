import assert from "node:assert/strict";
import { test } from "node:test";

import { inferQuestionnaireAudience } from "../src/lib/crm/runQuestionnaireCrmSync.js";
import {
  getApplicationSlug,
  mapZohoDealToVisaTypeCode,
  normalizeApplicationSlug,
  PARTNER_PUBLIC_SLUG,
  PARTNER_SUBCLASS_CODES,
} from "../src/lib/visaDisplay.js";

test("all supported Partner subclasses share the stable Partner questionnaire audience", () => {
  assert.deepEqual(PARTNER_SUBCLASS_CODES, ["820", "801", "309", "100"]);
  PARTNER_SUBCLASS_CODES.forEach((subclass) => {
    assert.equal(normalizeApplicationSlug(subclass), PARTNER_PUBLIC_SLUG);
    assert.equal(getApplicationSlug({ type: `Partner Visa (Subclass ${subclass})` }), PARTNER_PUBLIC_SLUG);
    assert.equal(mapZohoDealToVisaTypeCode({ Visa_Type: `Subclass ${subclass}` }), "partner");
    assert.deepEqual(inferQuestionnaireAudience({ type: `Partner Visa ${subclass}` }), { visaType: "partner", visaContext: undefined });
  });
});
