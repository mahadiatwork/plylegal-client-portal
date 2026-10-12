# Resources loading investigation — 8 September 2026

The signed-in production Resources page initially reported `Authentication required`.
Both Resources routes used `verifyAuth`, which requires an Admin Firestore user-profile
lookup as well as verifying the client's ID token. Available local service-account
credentials failed with `Invalid JWT Signature` or a malformed private-key error.
Production's credential value was not inspected.

The resource routes now verify the Firebase identity independently and read Firestore
with the caller's ID token. They enforce application ownership, query only active
resources, and preserve the existing missing-template fallback to shared resources.
PDF resource preview authorization uses the same approach. Firestore permission
errors remain errors instead of being treated as missing resources.

After the initial resource route changes reached production, the browser error became
`Access denied`. The deployed ruleset
`projects/validify-pro-test/rulesets/c0d08e55-88f5-491f-85d8-eb919d14fc39`
has no `resources` or `resourceTemplates` match blocks. Those collections fall through
to `allow read, write: if false`. The repository's `firestore.rules` includes resource
rules, but they are absent from the deployed ruleset.

A read through the signed-in Firebase CLI account confirmed that `resourceTemplates/482`
is active and has one active file item with a saved URL.

## Published production change

`.codex-temp/resources-deployed.rules` contains the retrieved deployment snapshot.
`.codex-temp/resources-fixed.rules` adds only authenticated reads of active shared
resources, active visa templates, and active items belonging to active templates.
It preserves every other deployed rule. It does not add write permissions.

The rules passed Firebase's compilation check with no issues. After the user's
approval, the current production rules were compared with the recorded snapshot and
the scoped update was published on 8 September 2026 at 06:02 Asia/Shanghai.
The verified release is
`projects/validify-pro-test/rulesets/ff193cbd-1a11-43b5-8e58-361262080b16`.
The release receipt is saved in `.codex-temp/resource-rules-release.json`.
The entire repository rules file was not deployed because it contains unrelated changes.

## Verification

- All 61 Node tests pass, including all four visa mappings, shared fallback, hidden
  resources, authentication failures, ownership, upstream errors, and PDF authorization.
- Next.js production build passes with placeholder Firebase configuration.
- The signed-in production Resources page now displays its one active 482 file with
  Open and Download links and no resource-loading error.
- The Open link was followed to Zoho WorkDrive. The image loaded successfully
  (484 × 359 pixels), confirming that the saved resource URL works.

Firebase documents that [REST requests using Firebase ID tokens are evaluated by
Firestore Security Rules](https://firebase.google.com/docs/firestore/use-rest-api).
