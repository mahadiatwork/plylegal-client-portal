import assert from "node:assert/strict";
import { test } from "node:test";
import { planApplicationCleanup, shouldSyncDeals } from "../src/lib/dealSync.js";

test("shouldSyncDeals syncs when there is no previous sync", () => {
  assert.equal(shouldSyncDeals({ lastSyncedAt: 0, now: 1_000_000, minIntervalMs: 300_000 }), true);
  assert.equal(shouldSyncDeals({ lastSyncedAt: NaN, now: 1_000_000, minIntervalMs: 300_000 }), true);
});

test("shouldSyncDeals skips inside the interval and syncs at its boundary", () => {
  assert.equal(shouldSyncDeals({ lastSyncedAt: 1_000_000, now: 1_299_999, minIntervalMs: 300_000 }), false);
  assert.equal(shouldSyncDeals({ lastSyncedAt: 1_000_000, now: 1_300_000, minIntervalMs: 300_000 }), true);
});

test("shouldSyncDeals tolerates a clock that moved backwards", () => {
  assert.equal(shouldSyncDeals({ lastSyncedAt: 2_000_000, now: 1_000_000, minIntervalMs: 300_000 }), true);
});

const deals = [{ id: "d1" }, { id: 2 }];

test("planApplicationCleanup keeps one app per zohoId and flags later ones as duplicates", () => {
  const apps = [
    { id: "a", zohoId: "d1" },
    { id: "b", zohoId: "d1" },
    { id: "c", zohoId: "2" },
  ];
  const plan = planApplicationCleanup(apps, deals);
  assert.deepEqual(plan.duplicates.map((a) => a.id), ["b"]);
  assert.deepEqual(plan.orphans, []);
});

test("planApplicationCleanup flags CRM-linked apps whose deal is gone as orphans", () => {
  const apps = [{ id: "a", zohoId: "d1" }, { id: "x", zohoId: "gone" }];
  const plan = planApplicationCleanup(apps, deals);
  assert.deepEqual(plan.orphans.map((a) => a.id), ["x"]);
  assert.deepEqual(plan.duplicates, []);
});

test("planApplicationCleanup never plans the same app as both duplicate and orphan", () => {
  const apps = [{ id: "x1", zohoId: "gone" }, { id: "x2", zohoId: "gone" }];
  const plan = planApplicationCleanup(apps, deals);
  assert.deepEqual(plan.orphans.map((a) => a.id), ["x1"]);
  assert.deepEqual(plan.duplicates.map((a) => a.id), ["x2"]);
});

test("planApplicationCleanup leaves apps without a zohoId alone", () => {
  const plan = planApplicationCleanup([{ id: "local" }, { id: "local2", zohoId: "" }], deals);
  assert.deepEqual(plan, { duplicates: [], orphans: [] });
});

test("planApplicationCleanup tolerates empty input", () => {
  assert.deepEqual(planApplicationCleanup(undefined, undefined), { duplicates: [], orphans: [] });
});
