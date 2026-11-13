import { ZohoCRMClient } from "./zohoClient.js";
import { getClientSharedFolderAccess } from "./clientSharedFolder.js";

export async function loadClientSharedFolderAccess(application, crm = new ZohoCRMClient()) {
  const dealId = String(application?.zohoId || application?.zohoDealId || application?.dealId || "").trim();
  if (!/^\d+$/.test(dealId)) return null;

  // The caller must verify ownership of the Firestore application first.
  const response = await crm.makeRequest("get", `/Deals/${dealId}`, null, { fields: "id,Client_Shared_URL" });
  const deal = response?.data?.[0];
  if (!deal) throw new Error("Unable to load the matter's shared folder from Zoho CRM");
  return getClientSharedFolderAccess(deal.Client_Shared_URL);
}
