import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  hasIdentityExtras,
  makeIdentityDefaults,
} from "../src/lib/mainApplicantIdentity.js";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("482 main-applicant identity includes citizenship and residence fields", () => {
  assert.equal(hasIdentityExtras("temporary-work"), true);
  const defaults = makeIdentityDefaults("temporary-work");
  assert.equal(defaults.citizen_of_country, "no");
  assert.deepEqual(defaults.citizenships, []);
  assert.equal(defaults.permanent_residency_rights, "no");
  assert.deepEqual(defaults.pr_countries, []);
});

test("482 legacy dialogs expose the fields from the published questionnaire contract", async () => {
  const [mainOther, spouseOther, citizenship, education, childIdentity] = await Promise.all([
    source("../app/intake/temporary-work/main-applicant/other/page.js"),
    source("../app/intake/temporary-work/spouse-partner/other-details/page.js"),
    source("../src/components/intake/temporary-work/CitizenshipDialog.jsx"),
    source("../app/intake/temporary-work/main-applicant/education/page.js"),
    source("../app/intake/temporary-work/children/[childId]/identity/page.js"),
  ]);

  assert.match(mainOther, /data-testid="select-issuing-country"/);
  assert.match(spouseOther, /data-testid="select-issuing-country"/);
  assert.match(citizenship, /data-testid="select-citizenship-country"/);
  assert.match(education, /data-testid="input-certificate-number"/);
  assert.match(childIdentity, /Do you have sole custody of this child\?/);
  assert.doesNotMatch(childIdentity, /childAge\s*!==\s*null/);
});

test("active questionnaire groups can be collapsed after being auto-expanded", async () => {
  const layout = await source("../app/intake/layout.js");
  assert.match(layout, /open=\{isProfileExpanded\}/);
  assert.match(layout, /open=\{isNmfExpanded\}/);
  assert.doesNotMatch(layout, /open=\{isProfileExpanded \|\| isThisProfileActive\}/);
  assert.doesNotMatch(layout, /open=\{isNmfExpanded \|\| isNmfActive\}/);
});
