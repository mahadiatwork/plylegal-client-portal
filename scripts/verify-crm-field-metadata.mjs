/**
 * READ-ONLY audit of Zoho field configuration against the portal's CRM catalog.
 * It only calls GET /settings/fields. It never writes to Zoho or Firebase.
 *
 * Run by the CRM owner with real credentials in the environment:
 *   node scripts/verify-crm-field-metadata.mjs            # Contacts + Deals
 *   node scripts/verify-crm-field-metadata.mjs Contacts
 *
 * Output (stdout) is a table of: module, API name, catalog label vs live label,
 * live data type, read-only, length and picklist values. Look in particular at:
 *  - Deals City_Town_of_Birth / State_or_Province_of_Birth / Marital_Status, which
 *    the portal currently fills with citizenship / passport number / marital status;
 *  - Contacts picklists (Relationship_Status, Nationality, countries, Current_Visa).
 * No questionnaire or client data is read or printed.
 */
import { ZohoCRMClient } from "../src/lib/zohoClient.js";
import { CRM_FIELD_CATALOG } from "../src/lib/crm/crmFieldCatalog.js";

const modules = process.argv.slice(2).length ? process.argv.slice(2) : ["Contacts", "Deals"];
const zoho = new ZohoCRMClient();

for (const moduleName of modules) {
  const live = new Map((await zoho.getFieldMetadata(moduleName)).map((item) => [item.api_name, item]));
  if (!live.size) {
    console.error(`${moduleName}: no metadata returned (check credentials/scopes).`);
    process.exitCode = 1;
    continue;
  }
  console.log(`\n## ${moduleName}`);
  console.log("api_name | catalog label | live label | type | read_only | length | picklist");
  for (const entry of Object.values(CRM_FIELD_CATALOG[moduleName] || {})) {
    const meta = live.get(entry.apiName);
    if (!meta) {
      console.log(`${entry.apiName} | ${entry.label} | MISSING IN CRM`);
      continue;
    }
    const readOnly = meta.read_only === true || meta.field_read_only === true;
    const picks = (meta.pick_list_values || []).map((item) => item.actual_value).join("; ");
    const mismatch = meta.field_label && meta.field_label !== entry.label ? " <-- LABEL DIFFERS" : "";
    console.log([entry.apiName, entry.label, `${meta.field_label}${mismatch}`, meta.data_type, readOnly, meta.length ?? "", picks].join(" | "));
  }
}
