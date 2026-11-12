import zohoClient from "./zohoClient.js";
import { getClientSharedFolderAccess } from "./clientSharedFolder.js";

const CLIENT_SHARED_FOLDER_FIELDS = "id,Matter_Workdrive_Folder_URL";

export async function loadClientSharedFolderAccess(application, client = zohoClient) {
  const dealId = String(application?.zohoId || "").trim();
  if (!/^\d+$/.test(dealId)) {
    return getClientSharedFolderAccess(application?.clientSharedFolderUrl);
  }

  // The CRM field is authoritative, including when the team clears the link.
  const deal = await client.getRecord("Deals", dealId, CLIENT_SHARED_FOLDER_FIELDS);
  if (!deal) throw new Error("Unable to load the shared folder from Zoho");
  return getClientSharedFolderAccess(deal.Matter_Workdrive_Folder_URL);
}
