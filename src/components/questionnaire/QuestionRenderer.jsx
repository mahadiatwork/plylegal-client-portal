"use client";

import { ConditionalBlock } from "@/components/questionnaire/ConditionalBlock";
import { QuestionField } from "@/components/questionnaire/QuestionField";

function getFieldDefaults(question) {
  const fields = {};
  if (question.type === "dateParts") {
    const parts = question.parts || {
      day: `${question.answerKey}_day`,
      month: `${question.answerKey}_month`,
      year: `${question.answerKey}_year`,
    };
    Object.values(parts).filter(Boolean).forEach((name) => {
      fields[name] = "";
    });
  } else if (question.answerKey) {
    fields[question.answerKey] = question.type === "checkbox"
      ? false
      : question.type === "repeater"
        ? question.metadata?.collection === "object" ? {} : []
        : "";
  }
  if (Array.isArray(question.followUps)) {
    question.followUps.forEach((followUp) => {
      Object.assign(fields, getFieldDefaults(followUp));
    });
  }
  return fields;
}

export function QuestionRenderer({ form, optionSources, questions = [], repeaterRegistry = {}, values }) {
  return (
    <>
      {questions.map((question) => (
        <ConditionalBlock
          key={question.id}
          clearWhenHidden={question.clearWhenHidden}
          fieldDefaults={getFieldDefaults(question)}
          form={form}
          values={values}
          visibleIf={question.visibleIf}
        >
          <div className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
            <QuestionField
              form={form}
              optionSources={optionSources}
              question={question}
              repeaterRegistry={repeaterRegistry}
            />
            {question.followUps?.length > 0 && (
              <div className="mt-4 space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                <QuestionRenderer
                  form={form}
                  optionSources={optionSources}
                  questions={question.followUps}
                  repeaterRegistry={repeaterRegistry}
                  values={values}
                />
              </div>
            )}
          </div>
        </ConditionalBlock>
      ))}
    </>
  );
}
