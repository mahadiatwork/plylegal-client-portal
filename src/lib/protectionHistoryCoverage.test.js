import assert from "node:assert/strict";
import { getContinuousHistoryIssues, getProtectionHistoryDate } from "./protectionHistoryCoverage.js";

const today = new Date(2026, 7, 10);
const start = new Date(2006, 7, 10);
const fullCoverage = [
  { date_from_day: "10", date_from_month: "8", date_from_year: "2006", date_to_day: "09", date_to_month: "8", date_to_year: "2016" },
  { date_from_day: "10", date_from_month: "8", date_from_year: "2016" },
];

assert.deepEqual(getContinuousHistoryIssues(fullCoverage, { startDate: start, label: "Address history", today }), []);
assert.match(
  getContinuousHistoryIssues(fullCoverage.slice(0, 1), { startDate: start, label: "Address history", today })[0],
  /Gap in address history/
);
assert.equal(getProtectionHistoryDate("31", "February", "2020"), null);

console.log("protection history coverage checks passed");
