export const CORRECTION_REQUESTED = "Correction Requested";

export function buildCorrectionRecord({ dealId, subclass, correction, number }) {
  return {
    Name: `${subclass} - ${correction.fieldName}`,
    Matter: { id: dealId },
    Status: CORRECTION_REQUESTED,
    Correction_Details: [{
      Correction_No: number,
      ...(correction.pageNumber ? { Page_No: correction.pageNumber } : {}),
      ...(correction.questionNumber ? { Question_No: correction.questionNumber } : {}),
      Details_of_Correction: correction.issueDescription,
      Status: "To Do",
    }],
  };
}
