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

## Prepared production change

`.codex-temp/resources-deployed.rules` contains the retrieved deployment snapshot.
`.codex-temp/resources-fixed.rules` adds only authenticated reads of active shared
resources, active visa templates, and active items belonging to active templates.
It preserves every other deployed rule. It does not add write permissions.

The prepared rules passed Firebase's compilation check with no issues. They have
**not been published**. Before publishing, compare the current released ruleset with
the recorded snapshot and rebase the additions if it changed. Do not replace production
with the entire repository rules file: it contains unrelated changes.

## Verification

- All 61 Node tests pass, including all four visa mappings, shared fallback, hidden
  resources, authentication failures, ownership, upstream errors, and PDF authorization.
- Next.js production build passes with placeholder Firebase configuration.
- Production still needs the scoped read-rule update and a browser verification.

Firebase documents that [REST requests using Firebase ID tokens are evaluated by
Firestore Security Rules](https://firebase.google.com/docs/firestore/use-rest-api).
