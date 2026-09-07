import assert from "node:assert/strict";
import test from "node:test";
import { targetPersonalDetailsSchema, targetChildDetailsSchema } from "../src/lib/targetVisaPersonalDetails.js";

test("child relationship is required in the spouse-present form while the no-spouse form permits it to be absent", () => {
  const details = { country_of_birth: "France", city_of_birth: "Paris", state_of_birth: "Ile-de-France", relationship_to_spouse: "", legacy_note: "Keep" };
  assert.equal(targetChildDetailsSchema.safeParse(details).success, false);
  assert.equal(targetPersonalDetailsSchema.safeParse(details).success, true);
  const completed = targetChildDetailsSchema.parse({ ...details, relationship_to_spouse: "Step Child" });
  assert.equal(completed.relationship_to_spouse, "Step Child");
  assert.equal(completed.legacy_note, "Keep");
});
