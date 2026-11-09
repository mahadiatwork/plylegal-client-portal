# Client shared WorkDrive folder

The client portal reads the current Zoho Deal field `Matter_Workdrive_Folder_URL` when the client opens the **Shared Files** tab.

- A published WorkDrive permalink such as `https://workdrive.zohoexternal.com.au/file/{resource_id}` is rendered inside the portal.
- An existing custom share link such as `https://workdrive.zohopublic.com.au/external/{link_id}` remains available through **Open in WorkDrive**, but cannot be used as the inline folder viewer.
- Other URLs are rejected by the portal.

## Deluge change

Replace the `CREATE EXTERNAL SHARE LINK FOR "CLIENT SHARED"` block with the publish/embed API call below. The existing CRM write-back can remain unchanged because `clientSharedLinkUrl` will now contain the embeddable permalink.

```deluge
// ===================== CREATE EMBED LINK FOR "CLIENT SHARED" =====================
clientSharedLinkUrl = "";
if(clientSharedId != "")
{
	publishAttr = Map();
	publishAttr.put("shared_type","publish");
	publishAttr.put("role_id","34");
	publishAttr.put("resource_id",clientSharedId);

	publishData = Map();
	publishData.put("attributes",publishAttr);
	publishData.put("type","permissions");

	publishBody = Map();
	publishBody.put("data",publishData);

	publishHeaders = Map();
	publishHeaders.put("Accept","application/vnd.api+json");
	publishHeaders.put("Content-Type","application/vnd.api+json");

	publishResp = invokeurl
	[
		url :"https://www.zohoapis.com.au/workdrive/api/v1/permissions"
		type :POST
		parameters:publishBody.toString()
		headers:publishHeaders
		connection:"workdrive_conn"
	];

	if(publishResp != null)
	{
		publishResponseData = publishResp.get("data");
		if(publishResponseData != null)
		{
			publishAttributes = publishResponseData.get("attributes");
			if(publishAttributes != null)
			{
				clientSharedLinkUrl = ifnull(publishAttributes.get("permalink"),"");
			}
		}
	}
}
```

The `workdrive_conn` connection needs the `WorkDrive.files.sharing.CREATE` scope. WorkDrive external sharing and permalink/embed sharing must also be enabled for the team folder.

## Existing share-link block

If the custom `/links` call is retained for a separate new-tab link, add the required `request_user_data` value and read the documented `link` response attribute:

```deluge
linkAttr.put("request_user_data",false);
clientSharedLinkUrl = ifnull(linkAttributes.get("link"),"");
```

Do not store that custom share URL in `Matter_Workdrive_Folder_URL` when an inline published permalink is available; the portal uses that CRM field as the embed source.

## Existing matters

The current function exits when `Matter_Folder_ID` is already populated, so it will not update existing matters. Backfill `Matter_Workdrive_Folder_URL` for those Deals with a published permalink for their `CLIENT SHARED` folder, or run a separate idempotent backfill function that only creates the publish permission and updates this field.
