import assert from "node:assert/strict";
import { test } from "node:test";
import { createTtlCache } from "../src/lib/ttlCache.js";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test("returns the cached value without reloading within the ttl", async () => {
  const c = clock();
  const cache = createTtlCache({ ttlMs: 1000, now: c.now });
  let loads = 0;
  const load = async () => ++loads;

  assert.equal(await cache.get("k", load), 1);
  c.advance(999);
  assert.equal(await cache.get("k", load), 1);
  assert.equal(loads, 1);
});

test("reloads after the ttl expires", async () => {
  const c = clock();
  const cache = createTtlCache({ ttlMs: 1000, now: c.now });
  let loads = 0;
  const load = async () => ++loads;

  await cache.get("k", load);
  c.advance(1000);
  assert.equal(await cache.get("k", load), 2);
});

test("concurrent callers share one load", async () => {
  const cache = createTtlCache({ ttlMs: 1000 });
  let loads = 0;
  const load = async () => { loads += 1; await new Promise((r) => setTimeout(r, 5)); return "x"; };

  const results = await Promise.all([cache.get("k", load), cache.get("k", load), cache.get("k", load)]);
  assert.deepEqual(results, ["x", "x", "x"]);
  assert.equal(loads, 1);
});

test("failures are not cached", async () => {
  const cache = createTtlCache({ ttlMs: 1000 });
  await assert.rejects(cache.get("k", async () => { throw new Error("offline"); }), /offline/);
  assert.equal(await cache.get("k", async () => "recovered"), "recovered");
});

test("keys are independent and clear() drops everything", async () => {
  const cache = createTtlCache({ ttlMs: 1000 });
  let loads = 0;
  const load = async () => ++loads;

  await cache.get("a", load);
  await cache.get("b", load);
  assert.equal(loads, 2);
  cache.clear();
  await cache.get("a", load);
  assert.equal(loads, 3);
});

test("a failed load does not evict a newer entry for the same key", async () => {
  const c = clock();
  const cache = createTtlCache({ ttlMs: 10, now: c.now });
  let rejectFirst;
  const first = cache.get("k", () => new Promise((_, rej) => { rejectFirst = rej; }));
  c.advance(11);
  const second = cache.get("k", async () => "fresh");
  rejectFirst(new Error("late failure"));
  await assert.rejects(first, /late failure/);
  assert.equal(await second, "fresh");
  assert.equal(await cache.get("k", async () => "should not load"), "fresh");
});
