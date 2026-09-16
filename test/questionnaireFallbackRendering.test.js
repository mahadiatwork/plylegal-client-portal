import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bundled = await build({
  entryPoints: ["src/components/questionnaire/QuestionnaireDefinitionContent.jsx"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", jsx: "automatic", logLevel: "silent",
  plugins: [{ name: "definition-page-stub", setup(builder) {
    builder.onResolve({ filter: /^react$/, namespace: "test" }, (args) => ({ path: args.path, external: true }));
    builder.onResolve({ filter: /DynamicQuestionnairePage$/ }, () => ({ path: "page", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
      contents: 'import {createElement} from "react"; export function DynamicQuestionnairePage({pageDefinition}) { return createElement("section", {"data-remote-page":pageDefinition.id}, pageDefinition.title); }',
    }));
  } }],
});
const filename = path.resolve("test", "questionnaire-content-bundle.cjs");
const contentModule = new Module(filename);
contentModule.filename = filename;
contentModule.paths = Module._nodeModulePaths(path.dirname(filename));
contentModule._compile(bundled.outputFiles[0].text, filename);
const { QuestionnaireDefinitionContent } = contentModule.exports;
const route = "/intake/temporary-work/main-applicant/other";
const render = (props = {}) => renderToStaticMarkup(createElement(QuestionnaireDefinitionContent, { route, ...props },
  createElement("form", null, createElement("label", null, "Other Names", createElement("input", { name: "previous_name", defaultValue: "Saved client name" }))),
));

test("every definition failure retains the original questionnaire and saved form values", () => {
  for (const errorCode of ["unavailable", "permission-denied", "invalid-argument", "unauthenticated", undefined]) {
    const html = render({ hasLoadError: true, errorCode });
    assert.match(html, /built-in questionnaire/);
    assert.match(html, /Other Names/);
    assert.match(html, /value="Saved client name"/);
    if (errorCode === "unauthenticated") assert.match(html, /href="\/login"/);
    else assert.match(html, /Try loading the published questionnaire again/);
  }
});

test("absent, empty and partial published definitions keep each built-in page available", () => {
  for (const definition of [null, { pages: [] }, { pages: [{ route, questions: [] }] }, { pages: [{ route: "/intake/temporary-work/all-applicants/character" }] }]) {
    const html = render({ definition });
    assert.match(html, /Other Names/);
    assert.match(html, /Saved client name/);
  }
});

test("matching published pages render dynamically and application readiness remains a prerequisite", () => {
  const definition = { id: "published", revision: 5, pages: [{ id: "other", route, title: "Updated question wording", questions: [{ id: "remote-question" }] }] };
  assert.match(render({ definition, route: `${route}?profileId=main` }), /data-remote-page="other"/);
  assert.match(render({ definition }), /Updated question wording/);
  const loading = render({ definition, loading: true });
  assert.match(loading, /Loading questionnaire/);
  assert.doesNotMatch(loading, /Saved client name|data-remote-page/);
});
