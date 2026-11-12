import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientSharedFolderAccess } from "../src/lib/clientSharedFolder.js";
import { loadClientSharedFolderAccess } from "../src/lib/clientSharedFolder.server.js";

test("recognizes published WorkDrive folder permalinks as embeddable", () => {
  assert.deepEqual(
    getClientSharedFolderAccess("https://workdrive.zohoexternal.com.au/file/gu2jl92784a492a7a49ec93e8a79444d91446"),
    {
      url: "https://workdrive.zohoexternal.com.au/file/gu2jl92784a492a7a49ec93e8a79444d91446",
      mode: "embed",
    },
  );
  assert.equal(
    getClientSharedFolderAccess("https://workdrive.zohopublic.com/folder/folder-token/")?.mode,
    "embed",
  );
});

test("keeps WorkDrive external share links as new-tab fallbacks", () => {
  const url = "https://workdrive.zohopublic.com.au/external/share-token";
  assert.deepEqual(getClientSharedFolderAccess(url), { url, mode: "external" });
  assert.equal(getClientSharedFolderAccess(`  ${url}  `)?.url, url);
});

test("rejects unsafe or unsupported shared-folder URLs", () => {
  for (const value of [
    "http://workdrive.zohopublic.com.au/external/share-token",
    "https://workdrive.zohopublic.com.au.attacker.test/external/share-token",
    "https://user:password@workdrive.zohopublic.com.au/external/share-token",
    "https://workdrive.zohopublic.com.au:444/external/share-token",
    "https://workdrive.zohopublic.com.au/external/share-token?download=true",
    "https://workdrive.zohopublic.com.au/external/share-token#files",
    "https://workdrive.zohopublic.com.au/external/share-token/download",
    "https://workdrive.zohopublic.com.au/file/",
    "javascript:alert('shared-folder')",
    "",
    null,
  ]) {
    assert.equal(getClientSharedFolderAccess(value), null, String(value));
  }
});

test("loads the current shared-folder URL from the owned application's Zoho Deal", async () => {
  const calls = [];
  const client = {
    async getRecord(moduleName, recordId, fields) {
      calls.push({ moduleName, recordId, fields });
      return {
        Matter_Workdrive_Folder_URL:
          "https://workdrive.zohoexternal.com.au/file/live-client-folder",
      };
    },
  };

  assert.deepEqual(await loadClientSharedFolderAccess({ zohoId: "123456789" }, client), {
    url: "https://workdrive.zohoexternal.com.au/file/live-client-folder",
    mode: "embed",
  });
  assert.deepEqual(calls, [{
    moduleName: "Deals",
    recordId: "123456789",
    fields: "id,Matter_Workdrive_Folder_URL",
  }]);
});

test("uses a validated stored URL only for applications without a usable Deal id", async () => {
  let calls = 0;
  const client = { async getRecord() { calls += 1; } };
  const storedUrl = "https://workdrive.zohopublic.com.au/external/stored-client-folder";

  assert.deepEqual(
    await loadClientSharedFolderAccess({ clientSharedFolderUrl: storedUrl }, client),
    { url: storedUrl, mode: "external" },
  );
  assert.equal(await loadClientSharedFolderAccess({ zohoId: "../Contacts/123" }, client), null);
  assert.equal(calls, 0);
});

test("the current Zoho folder replaces a stale stored folder", async () => {
  const url = "https://workdrive.zohoexternal.com.au/file/current-folder";
  const client = { async getRecord() { return { Matter_Workdrive_Folder_URL: url }; } };

  assert.deepEqual(await loadClientSharedFolderAccess({
    zohoId: "123456789",
    clientSharedFolderUrl: "https://workdrive.zohopublic.com.au/external/stale-folder",
  }, client), { url, mode: "embed" });
});

test("clearing or invalidating the Zoho field never revives a stored folder", async () => {
  for (const field of [null, "", "https://example.test/folder"]) {
    const client = { async getRecord() { return { Matter_Workdrive_Folder_URL: field }; } };
    assert.equal(await loadClientSharedFolderAccess({
      zohoId: "123456789",
      clientSharedFolderUrl: "https://workdrive.zohopublic.com.au/external/stale-folder",
    }, client), null);
  }
});

test("a failed Zoho lookup is an error instead of an empty shared folder", async () => {
  const client = { async getRecord() { return null; } };
  await assert.rejects(
    loadClientSharedFolderAccess({ zohoId: "123456789" }, client),
    /Unable to load the shared folder from Zoho/,
  );
});
