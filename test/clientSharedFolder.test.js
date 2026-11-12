import assert from "node:assert/strict";
import { test } from "node:test";
import { getClientSharedFolderAccess } from "../src/lib/clientSharedFolder.js";
import { CLIENT_SHARED_FOLDER_URL, loadClientSharedFolderAccess } from "../src/lib/clientSharedFolder.server.js";

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

test("the client uses the configured shared folder without reading the admin CRM folder", async () => {
  let crmCalls = 0;
  const crm = { async getRecord() { crmCalls += 1; throw new Error("CRM must not be called"); } };
  for (const application of [{}, { zohoId: "123456789", clientSharedFolderUrl: "https://workdrive.zohoexternal.com.au/file/admin-folder" }]) {
    assert.deepEqual(await loadClientSharedFolderAccess(application, crm), {
      url: CLIENT_SHARED_FOLDER_URL, mode: "embed",
    });
  }
  assert.equal(crmCalls, 0);
  assert.match(CLIENT_SHARED_FOLDER_URL, /c11f82790e89f675a5e4eb885e5e14b385b36b7822a467637b1f32f495b416d1$/);
});
