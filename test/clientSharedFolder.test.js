import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientSharedFolderAccess } from "../src/lib/clientSharedFolder.js";
import { loadClientSharedFolderAccess } from "../src/lib/clientSharedFolder.server.js";

const shareUrl = "https://workdrive.zohoexternal.com.au/external/client-folder-token";

test("accepts only public WorkDrive external share links", () => {
  assert.deepEqual(getClientSharedFolderAccess(shareUrl), { url: shareUrl, mode: "external" });
  assert.equal(getClientSharedFolderAccess(`  ${shareUrl}  `)?.url, shareUrl);
  for (const value of [
    "http://workdrive.zohoexternal.com.au/external/token",
    "https://workdrive.zohoexternal.com.au.attacker.test/external/token",
    "https://user:password@workdrive.zohoexternal.com.au/external/token",
    "https://workdrive.zohoexternal.com.au:444/external/token",
    "https://workdrive.zohoexternal.com.au/external/token?download=true",
    "https://workdrive.zohoexternal.com.au/external/token#files",
    "https://workdrive.zohoexternal.com.au/external/token/download",
    "https://workdrive.zoho.com.au/folder/internal-matter-folder",
    "https://workdrive.zohopublic.com.au/file/published-folder",
    "javascript:alert('shared-folder')",
    "", null,
  ]) {
    assert.equal(getClientSharedFolderAccess(value), null, String(value));
  }
});

test("loads each owned matter's Client_Shared_URL from its Zoho Deal", async () => {
  const calls = [];
  const crm = { async makeRequest(...args) {
    calls.push(args);
    return { data: [{ Client_Shared_URL: shareUrl }] };
  } };
  assert.deepEqual(
    await loadClientSharedFolderAccess({
      zohoId: "123456789",
      clientSharedFolderUrl: "https://workdrive.zohopublic.com.au/external/stale-link",
    }, crm),
    { url: shareUrl, mode: "external" },
  );
  assert.deepEqual(calls, [["get", "/Deals/123456789", null, { fields: "id,Client_Shared_URL" }]]);
});

test("missing or invalid CRM links do not expose a folder", async () => {
  let calls = 0;
  const crm = { async makeRequest() {
    calls += 1;
    return { data: [{ Client_Shared_URL: "https://workdrive.zoho.com.au/folder/internal-folder" }] };
  } };
  assert.equal(await loadClientSharedFolderAccess({ zohoId: "../other" }, crm), null);
  assert.equal(calls, 0);
  assert.equal(await loadClientSharedFolderAccess({ zohoId: "123456789" }, crm), null);
  assert.equal(calls, 1);
  await assert.rejects(loadClientSharedFolderAccess({ zohoId: "123456789" }, {
    async makeRequest() { return { data: [] }; },
  }), /Unable to load/);
});
