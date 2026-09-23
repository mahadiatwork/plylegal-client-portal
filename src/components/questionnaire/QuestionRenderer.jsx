"use client";

import { Fragment } from "react";
import { ConditionalBlock } from "@/components/questionnaire/ConditionalBlock";
import { QuestionField } from "@/components/questionnaire/QuestionField";
import { getQuestionnaireGroupHeadingIndexes } from "@/lib/questionnaires/presentation";

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

export function QuestionRenderer({ answerLayout, form, optionSources, pageQuestions, questions = [], repeaterRegistry = {}, values }) {
  const allPageQuestions = pageQuestions || questions;
  const groupHeadings = getQuestionnaireGroupHeadingIndexes(questions, values);
  return (
    <>
      {questions.map((question, index) => (
        <Fragment key={question.id}>
          {groupHeadings.has(index) && (
            <h3 className="border-b border-border pb-2 pt-2 text-lg font-semibold text-foreground">
              {groupHeadings.get(index)}
            </h3>
          )}
          <ConditionalBlock
            clearWhenHidden={question.clearWhenHidden}
            fieldDefaults={getFieldDefaults(question)}
            form={form}
            values={values}
            visibleIf={question.visibleIf}
          >
            <div className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
              <QuestionField
                answerLayout={answerLayout}
                form={form}
                optionSources={optionSources}
                pageQuestions={allPageQuestions}
                question={question}
                repeaterRegistry={repeaterRegistry}
              />
              {question.followUps?.length > 0 && (
                <div className="mt-4 space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                  <QuestionRenderer
                    answerLayout={answerLayout}
                    form={form}
                    optionSources={optionSources}
                    pageQuestions={allPageQuestions}
                    questions={question.followUps}
                    repeaterRegistry={repeaterRegistry}
                    values={values}
                  />
                </div>
              )}
            </div>
          </ConditionalBlock>
        </Fragment>
      ))}
    </>
  );
}
