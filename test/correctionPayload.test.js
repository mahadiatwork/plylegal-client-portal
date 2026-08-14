import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCorrectionRecord,
  CORRECTION_REQUESTED,
} from "../src/lib/correctionPayload.js";

test("maps a portal correction to the redesigned Zoho correction record", () => {
  assert.deepEqual(buildCorrectionRecord({
    dealId: "deal-1",
    subclass: "866",
    number: 2,
    correction: {
      fieldName: "Date of Birth",
      pageNumber: "4",
      questionNumber: "12A",
      issueDescription: "Use the passport date.",
    },
  }), {
    Name: "866 - Date of Birth",
    Matter: { id: "deal-1" },
    Status: CORRECTION_REQUESTED,
    Correction_Details: [{
      Correction_No: 2,
      Page_No: "4",
      Question_No: "12A",
      Details_of_Correction: "Use the passport date.",
      Status: "To Do",
    }],
  });
});
