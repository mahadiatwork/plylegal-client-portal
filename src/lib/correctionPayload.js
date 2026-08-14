export const CORRECTION_REQUESTED = "Correction Requested";

export function buildCorrectionRecord({ dealId, subclass, corrections }) {
  return {
    Name: `${subclass} - ${corrections[0].fieldName}`,
    Matter: { id: dealId },
    Status: CORRECTION_REQUESTED,
    Correction_Details: corrections.map((correction, index) => ({
      Correction_No: index + 1,
      ...(correction.pageNumber ? { Page_No: correction.pageNumber } : {}),
      ...(correction.questionNumber ? { Question_No: correction.questionNumber } : {}),
      Details_of_Correction: correction.issueDescription,
      Status: "To Do",
    })),
  };
}
