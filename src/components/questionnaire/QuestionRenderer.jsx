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

/**
 * Questions render in a two-column grid: every question spans both columns unless
 * metadata.width is "half", so consecutive half-width questions sit side by side
 * (matching the legacy pages' paired fields).
 */
export function QuestionRenderer({ answerLayout, form, nested = false, optionSources, pageQuestions, questions = [], repeaterRegistry = {}, values }) {
  const allPageQuestions = pageQuestions || questions;
  const displayedQuestions = questions.filter((question) => !question.metadata?.storageOnly);
  const groupHeadings = getQuestionnaireGroupHeadingIndexes(displayedQuestions, values);
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 ${nested ? "gap-y-6" : "gap-y-8"}`}>
      {displayedQuestions.map((question, index) => (
        <Fragment key={question.id}>
          {groupHeadings.has(index) && (
            <h3 className="text-lg font-medium border-b pb-2 md:col-span-2">
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
            <div className={question.metadata?.width === "half" ? "space-y-3 min-w-0" : "space-y-3 min-w-0 md:col-span-2"}>
              <QuestionField
                answerLayout={answerLayout}
                form={form}
                optionSources={optionSources}
                pageQuestions={allPageQuestions}
                question={question}
                repeaterRegistry={repeaterRegistry}
              />
              {question.followUps?.length > 0 && (
                <div className="mt-6">
                  <QuestionRenderer
                    answerLayout={answerLayout}
                    form={form}
                    nested
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
    </div>
  );
}
