import test from "node:test";
import assert from "node:assert/strict";
import { getCrmCoverageSummary } from "../questionnaireCrmContract.js";
import { seedDefinitionCrmMappings } from "../questionnaireCrmSeed.js";

test("seed mappings classify identity fields and leave the rest portal-only", () => {
  const seeded = seedDefinitionCrmMappings({
    id: "def",
    pages: [
      {
        id: "main-details",
        route: "/intake/temporary-work/main-applicant/details",
        scope: "profile",
        metadata: { profileRole: "main_applicant" },
        questions: [
          { id: "family", answerKey: "family_name", type: "text" },
          { id: "notes", answerKey: "city_of_birth", type: "text" },
          {
            id: "passports",
            answerKey: "passports",
            type: "repeater",
            metadata: { fields: [{ id: "number", answerKey: "document_number", type: "text" }] },
          },
        ],
      },
    ],
  });
  assert.equal(seeded.pages[0].questions[0].metadata.crm.fieldApiName, "Last_Name");
  assert.equal(seeded.pages[0].questions[1].metadata.crm.mode, "portal_only");
  assert.equal(seeded.pages[0].questions[2].metadata.crm.mode, "portal_only");
  assert.equal(seeded.pages[0].questions[2].metadata.fields[0].metadata.crm.mode, "portal_only");
  const coverage = getCrmCoverageSummary(seeded);
  assert.equal(coverage.unconfigured, 0);
  assert.equal(coverage.mapped, 1);
  assert.equal(coverage.portalOnly, 3);
});
