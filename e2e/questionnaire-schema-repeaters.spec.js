import { test, expect } from "@playwright/test";
import { build } from "esbuild";

const fixture = await build({
  stdin: { resolveDir: process.cwd(), loader: "jsx", contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {useForm} from "react-hook-form";
    import {QuestionRenderer} from "./src/components/questionnaire/QuestionRenderer.jsx";
    import {QuestionnaireCopyProvider} from "./src/components/questionnaire/QuestionnaireCopyContext.jsx";
    import {Field} from "./src/components/Field.jsx";
    import {Card,CardHeader,CardTitle,CardContent} from "./src/components/ui/card.jsx";
    import {Label} from "./src/components/ui/label.jsx";
    import {Input} from "./src/components/ui/input.jsx";
    const questions = [
      {id:"names",answerKey:"names",type:"repeater",label:"Other names",metadata:{fields:[
        {id:"name",answerKey:"name",type:"text",label:"Previous name"},
        {id:"gate",answerKey:"changed",type:"yesNo",label:"Changed name?"},
        {id:"reason",answerKey:"reason",type:"text",label:"Reason",clearWhenHidden:true,visibleIf:[{field:"changed",op:"equals",value:"yes"}]},
        {id:"date",answerKey:"date",type:"dateParts",label:"Change date"},
        {id:"documents",answerKey:"documents",type:"repeater",label:"Supporting records",metadata:{fields:[{id:"document-title",answerKey:"title",type:"text",label:"Record title"}]}}
      ]}},
      {id:"address",answerKey:"address",type:"repeater",label:"Residential address",metadata:{collection:"object",fields:[{id:"city",answerKey:"city",type:"text",label:"City"}]}}
    ];
    function Fixture(){
      const form=useForm({defaultValues:{names:[{id:"saved-row-1",name:"Smith",changed:"no",reason:"hidden",legacyNote:"preserve",documents:[{id:"saved-doc",title:"Original record"}]}],address:{city:"Sydney",legacyNote:"preserve-object"}}});
      const values=form.watch();
      return <form><QuestionRenderer form={form} questions={questions} values={values}/><output data-testid="stored-answers">{JSON.stringify(values)}</output></form>;
    }
    function LegacyFixture(){
      const form=useForm({defaultValues:{name:"Saved client name",decision:"yes"}});
      const page={title:"Updated section",metadata:{renderer:"legacy",originalTitle:"Original section",originalIntroBlocks:[{type:"paragraph",text:"Original instructions"}]},introBlocks:[{type:"paragraph",text:"Updated instructions"}],questions:[
        {id:"name-copy",answerKey:"name",type:"text",label:"Updated name label",description:"Updated standalone help",placeholder:"Updated standalone example",metadata:{originalLabel:"Original name label",originalDescription:"Original standalone help",originalPlaceholder:"Original standalone example"}},
        {id:"decision-copy",answerKey:"decision",type:"select",label:"Updated decision label",options:[{value:"yes",label:"Confirmed"},{value:"no",label:"Declined"}],metadata:{originalLabel:"Original decision label",originalOptions:[{value:"yes",label:"Yes"},{value:"no",label:"No"}]}},
        {id:"standalone-copy",answerKey:"standalone",type:"text",label:"Updated standalone label",metadata:{originalLabel:"Original standalone label"}},
        {id:"child-relationship-copy",answerKey:"relationship_to_spouse",type:"select",label:"Choose the relationship to {spouseName}",metadata:{originalLabel:"This person is the spouse or partner's:",labelTemplate:"This person is {spouseName}'s:"}}
      ]};
      return <QuestionnaireCopyProvider page={page}><Card><CardHeader><CardTitle>{"Original section — Client Person"}</CardTitle></CardHeader><CardContent><p>Original instructions</p><p>Original standalone help</p><Label>This person is {"Jill O'Neil"}'s:</Label><Label htmlFor="standalone"><span>Original standalone label</span></Label><Input id="standalone" placeholder="Original standalone example" value="Unchanged standalone value" readOnly/><Field control={form.control} name="name" type="text" label="Original name label"/><Field control={form.control} name="decision" type="select" label="Original decision label" options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]}/><output data-testid="stored-answers">{JSON.stringify(form.watch())}</output></CardContent></Card></QuestionnaireCopyProvider>;
    }
    createRoot(document.getElementById("root")).render(location.pathname.includes("legacy")?<LegacyFixture/>:<Fixture/>);
  ` },
  bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", logLevel: "silent",
  define: { "process.env.NODE_ENV": '"test"' },
});

async function openFixture(page, legacy = false) {
  await page.route("http://questionnaire.test/**", async (route) => {
    if (route.request().url().endsWith("fixture.js")) {
      await route.fulfill({ contentType: "text/javascript", body: fixture.outputFiles[0].text });
    } else {
      await route.fulfill({ contentType: "text/html; charset=utf-8", body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>' });
    }
  });
  await page.goto(`http://questionnaire.test/${legacy ? "legacy/" : ""}`);
  if (!legacy) await expect(page.getByLabel("Previous name", { exact: true })).toHaveValue("Smith");
}

test("schema repeaters edit existing arrays and objects without losing saved row properties", async ({ page }) => {
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await openFixture(page);
  await page.getByLabel("Previous name", { exact: true }).fill("Updated Smith");
  await page.getByLabel("City", { exact: true }).fill("Melbourne");
  await page.getByLabel("Record title", { exact: true }).fill("Updated record");
  const answers = await page.getByTestId("stored-answers").textContent().then(JSON.parse);
  expect(answers.names[0]).toMatchObject({ id: "saved-row-1", name: "Updated Smith", reason: "", legacyNote: "preserve", documents: [{ id: "saved-doc", title: "Updated record" }] });
  expect(answers.address).toEqual({ city: "Melbourne", legacyNote: "preserve-object" });
  expect(crashes).toEqual([]);
});

test("schema repeaters add and remove rows, apply row conditions, and edit nested lists", async ({ page }) => {
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await openFixture(page);
  await page.getByRole("button", { name: "Add Other names", exact: true }).click();
  await expect(page.getByLabel("Previous name", { exact: true })).toHaveCount(2);
  await page.getByLabel("Previous name", { exact: true }).nth(1).fill("Jones");
  await page.getByTestId("radio-names.1.changed-yes").click();
  await page.getByLabel("Reason", { exact: true }).fill("Marriage");
  await page.getByRole("button", { name: "Add Supporting records", exact: true }).nth(1).click();
  await page.getByLabel("Record title", { exact: true }).nth(1).fill("New record");
  await page.getByRole("button", { name: "Remove Other names 1", exact: true }).click();
  await expect(page.getByLabel("Previous name", { exact: true })).toHaveValue("Jones");
  await expect(page.getByLabel("Record title", { exact: true })).toHaveValue("New record");
  await page.getByTestId("radio-names.0.changed-no").click();
  await expect(page.getByLabel("Reason", { exact: true })).toHaveCount(0);
  const answers = await page.getByTestId("stored-answers").textContent().then(JSON.parse);
  expect(answers.names).toHaveLength(1);
  expect(answers.names[0]).toMatchObject({ name: "Jones", changed: "no", reason: "", documents: [{ title: "New record" }] });
  expect(answers.names[0].id).toBeTruthy();
  expect(crashes).toEqual([]);
});

test("published legacy wording updates original controls while edits retain the existing answer keys and option values", async ({ page }) => {
  const crashes = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await openFixture(page, true);
  await expect(page.getByText("Updated section — Client Person", { exact: true })).toBeVisible();
  await expect(page.getByText("Updated instructions", { exact: true })).toBeVisible();
  await expect(page.getByText("Updated standalone label", { exact: true })).toBeVisible();
  await expect(page.getByText("Updated standalone help", { exact: true })).toBeVisible();
  await expect(page.getByText("Choose the relationship to Jill O'Neil", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Updated standalone example", { exact: true })).toHaveValue("Unchanged standalone value");
  await expect(page.getByLabel("Updated name label", { exact: true })).toHaveValue("Saved client name");
  await page.getByLabel("Updated name label", { exact: true }).fill("Edited client name");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Declined", exact: true }).click();
  const answers = await page.getByTestId("stored-answers").textContent().then(JSON.parse);
  expect(answers).toEqual({ name: "Edited client name", decision: "no" });
  expect(crashes).toEqual([]);
});
