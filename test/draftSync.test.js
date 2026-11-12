import assert from "node:assert/strict";
import { test } from "node:test";
import { dedupeInFlight, diffDraftKeys, draftSignatures } from "../src/lib/draftSync.js";

test("dedupeInFlight runs one task for concurrent callers and shares its result", async () => {
  const inflight = new Map();
  let runs = 0;
  const task = async () => { runs += 1; await new Promise((r) => setTimeout(r, 5)); return { ok: true }; };

  const [a, b] = await Promise.all([
    dedupeInFlight(inflight, "app-1", task),
    dedupeInFlight(inflight, "app-1", task),
  ]);

  assert.equal(runs, 1);
  assert.equal(a, b);
});

test("dedupeInFlight runs separate tasks for different keys and after completion", async () => {
  const inflight = new Map();
  let runs = 0;
  const task = async () => { runs += 1; };

  await Promise.all([dedupeInFlight(inflight, "a", task), dedupeInFlight(inflight, "b", task)]);
  await dedupeInFlight(inflight, "a", task);

  assert.equal(runs, 3);
  assert.equal(inflight.size, 0);
});

test("dedupeInFlight clears a failed task so it can be retried", async () => {
  const inflight = new Map();
  await assert.rejects(dedupeInFlight(inflight, "a", async () => { throw new Error("boom"); }), /boom/);
  assert.equal(inflight.size, 0);
  assert.equal(await dedupeInFlight(inflight, "a", async () => "retry"), "retry");
});

test("dedupeInFlight without a key never shares", async () => {
  const inflight = new Map();
  let runs = 0;
  await Promise.all([dedupeInFlight(inflight, null, async () => { runs += 1; }), dedupeInFlight(inflight, null, async () => { runs += 1; })]);
  assert.equal(runs, 2);
});

test("diffDraftKeys sends everything when there is no baseline", () => {
  const draft = { profiles: [{ id: 1 }], visaContext: "482" };
  const { changed, signatures } = diffDraftKeys(draft, undefined);
  assert.deepEqual(changed, draft);
  assert.deepEqual(Object.keys(signatures), ["profiles", "visaContext"]);
});

test("diffDraftKeys sends only top-level keys that differ from the baseline", () => {
  const baseline = draftSignatures({ profiles: [{ id: 1 }], visaContext: "482", notes: "a" });
  const { changed } = diffDraftKeys({ profiles: [{ id: 1 }], visaContext: "186", notes: "a" }, baseline);
  assert.deepEqual(changed, { visaContext: "186" });
});

test("diffDraftKeys reports nothing when the draft is unchanged", () => {
  const draft = { a: { nested: [1, 2] }, b: null };
  const { changed } = diffDraftKeys(draft, draftSignatures(draft));
  assert.deepEqual(changed, {});
});

test("diffDraftKeys treats a key added since the baseline as changed", () => {
  const { changed } = diffDraftKeys({ a: 1, b: 2 }, draftSignatures({ a: 1 }));
  assert.deepEqual(changed, { b: 2 });
});
