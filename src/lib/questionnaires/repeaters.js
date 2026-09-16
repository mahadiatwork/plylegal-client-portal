import { getQuestionnaireDatePartNames } from "./answers.js";

export function getQuestionnaireRowDefaults(questions = []) {
  return questions.reduce((defaults, question) => {
    if (question.type === "dateParts") {
      Object.values(getQuestionnaireDatePartNames(question)).forEach((name) => { defaults[name] = ""; });
    } else if (question.answerKey) {
      defaults[question.answerKey] = question.defaultValue !== undefined
        ? structuredClone(question.defaultValue)
        : question.type === "checkbox" ? false
          : question.type === "repeater" ? question.metadata?.collection === "object" ? {} : []
            : "";
    }
    return Object.assign(defaults, getQuestionnaireRowDefaults(question.followUps));
  }, {});
}

/** Prefix form paths while leaving row-relative visibility conditions unchanged. */
export function scopeQuestionnaireRowField(question, prefix) {
  const scoped = { ...question, answerKey: `${prefix}.${question.answerKey}` };
  if (question.type === "dateParts") {
    scoped.parts = Object.fromEntries(Object.entries(getQuestionnaireDatePartNames(question))
      .map(([part, name]) => [part, `${prefix}.${name}`]));
  }
  return scoped;
}
