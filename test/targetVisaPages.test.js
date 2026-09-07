import assert from "node:assert/strict";
import test from "node:test";
import { getTargetVisaPages, getTargetVisaProgress, isTargetVisaPageComplete } from "../src/lib/targetVisaPages.js";

const main = { id: "main", relationship: "main_applicant", given_names: "Alex", family_name: "Test" };
const spouse = { id: "spouse", relationship: "spouse", given_names: "Jordan", family_name: "Test" };
const child = { id: "child", relationship: "child", given_names: "Casey", family_name: "Test" };

test("target completion includes actual people and excludes obsolete children and absent-spouse steps", () => {
  for (const visaType of ["partner", "protection"]) {
    const pages = getTargetVisaPages(visaType, { profiles: [main] });
    assert.ok(pages.some((page) => page.key === `${visaType}/main-applicant/details__main`));
    assert.ok(pages.some((page) => page.key === `${visaType}/non-migrating`));
    assert.equal(pages.some((page) => page.href.includes("/spouse-partner/")), false);
    assert.equal(pages.some((page) => page.href.includes("/children")), false);
    assert.equal(pages.some((page) => page.href.endsWith("/all-applicants/health")), visaType === "partner");
  }
});

test("spouse, child and non-migrating answers each have their own completion key", () => {
  for (const visaType of ["partner", "protection"]) {
    const draft = { profiles: [main, spouse, child], non_migrating_members: [{ id: "parent", passport: { given_names: "Morgan" } }] };
    const pages = getTargetVisaPages(visaType, draft);
    assert.ok(pages.some((page) => page.key === `${visaType}/children/child/custody__child`));
    assert.ok(pages.some((page) => page.key === `${visaType}/non-migrating/parent/health__parent`));
    const complete = Object.fromEntries(pages.map((page) => [page.key, true]));
    assert.equal(getTargetVisaProgress(visaType, draft, complete).percentage, 100);
    complete[`${visaType}/spouse-partner/details__spouse`] = false;
    complete[`${visaType}/spouse-partner/details`] = true;
    assert.equal(getTargetVisaProgress(visaType, draft, complete).completed, pages.length - 1);
  }
});

test("old unsuffixed completion works for one person but cannot complete two spouse profiles", () => {
  const completion = { "partner/spouse-partner/details": true };
  const single = getTargetVisaPages("partner", { profiles: [main, spouse] }).find((page) => page.key === "partner/spouse-partner/details__spouse");
  assert.equal(isTargetVisaPageComplete(single, completion), true);
  const multiple = getTargetVisaPages("partner", { profiles: [main, spouse, { ...spouse, id: "second" }] }).filter((page) => page.href.endsWith("/spouse-partner/details"));
  assert.equal(multiple.filter((page) => isTargetVisaPageComplete(page, completion)).length, 0);
});

test("target progress does not take ownership of approved temporary-work completion", () => {
  assert.deepEqual(getTargetVisaPages("temporary-work", { profiles: [main] }), []);
});
