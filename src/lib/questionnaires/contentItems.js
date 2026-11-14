/* Display content items (mirrors ply-legal-admin-portal/src/lib/questionnaireContentItems.js).
 *
 * Headings and explanatory text sit in a page's ordered `questions` array:
 *   { id, type: "heading",   label: "Personal Information" }
 *   { id, type: "paragraph", label: "Explanatory text…", visibleIf?: [...] }
 * They render in place but never collect answers: no answerKey, no validation, no
 * stored values, and they are not counted or reviewed as questions.
 */

export const QUESTIONNAIRE_DISPLAY_TYPES = new Set(["heading", "paragraph"]);

export function isQuestionnaireDisplayItem(question) {
  return QUESTIONNAIRE_DISPLAY_TYPES.has(question?.type);
}
