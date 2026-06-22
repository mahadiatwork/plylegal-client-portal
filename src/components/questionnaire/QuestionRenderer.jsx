"use client";

import { ConditionalBlock } from "@/components/questionnaire/ConditionalBlock";
import { QuestionField } from "@/components/questionnaire/QuestionField";

function getFieldNames(question) {
  const names = [question.answerKey].filter(Boolean);
  if (question.type === "dateParts" && question.parts) {
    names.push(...Object.values(question.parts).filter(Boolean));
  }
  if (Array.isArray(question.followUps)) {
    question.followUps.forEach((followUp) => {
      names.push(...getFieldNames(followUp));
    });
  }
  return names;
}

export function QuestionRenderer({ form, optionSources, questions = [], repeaterRegistry = {}, values }) {
  return (
    <>
      {questions.map((question) => (
        <ConditionalBlock
          key={question.id}
          clearWhenHidden={question.clearWhenHidden}
          fieldNames={getFieldNames(question)}
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
