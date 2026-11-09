import zohoClient from "./zohoClient.js";
import { getClientSharedFolderAccess } from "./clientSharedFolder.js";

const CLIENT_SHARED_FOLDER_FIELDS = "id,Matter_Workdrive_Folder_URL";

export async function loadClientSharedFolderAccess(application, client = zohoClient) {
  const storedAccess = getClientSharedFolderAccess(application?.clientSharedFolderUrl);
  if (storedAccess) return storedAccess;

  const dealId = String(application?.zohoId || "").trim();
  if (!/^\d+$/.test(dealId)) return null;

  const deal = await client.getRecord("Deals", dealId, CLIENT_SHARED_FOLDER_FIELDS);
  return getClientSharedFolderAccess(deal?.Matter_Workdrive_Folder_URL);
}
