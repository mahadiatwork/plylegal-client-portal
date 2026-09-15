# Resource Center document viewing

Resource Center files open with **View document** in Zoho WorkDrive's viewer. This
supports PDFs, DOCX, spreadsheets, presentations, and other formats supported by
WorkDrive without a portal download button or a native PDF download toolbar.
Ordinary website links and notes retain their existing behavior.

An admin-published file must contain `downloadAllowed: false` only after its
WorkDrive external link has been verified as a view-only link with downloads
disabled. The saved URL must be an HTTPS WorkDrive `/external/{id}` viewer URL,
without query parameters, fragments, or a `/download` suffix. The client recognizes
the `zoho`, `zohopublic`, and `zohoexternal` hosts in the supported data centers.

Both resource listing APIs return the validated file URL as `viewerUrl`; file
`externalUrl` / `url` fields are empty and download URL aliases are omitted.
Unverified legacy files remain listed with their metadata and the message
“Document preview is not available yet.” Their actions become available after the
admin migration disables downloads on their WorkDrive link and updates the stored
marker. Source URLs in existing Firestore records must also be migrated because
authenticated clients can read published resource records directly.

The resource preview endpoint no longer proxies template PDF bytes. It remains
available for document-review corrections, with cookies explicitly scoped to the
`documentReview` purpose. Previously issued cookies without that purpose must be
renewed by reopening the correction page.

The download restriction is enforced by WorkDrive's external-link permission.
The client marker records that verification; it does not itself change WorkDrive
permissions. Screen capture or copying visible information cannot be prevented.

An explicitly saved empty category list is honored; default categories apply only
when the category field is absent. Items reassigned by an admin category deletion
appear in their replacement category.

This behavior supersedes the Open/Download file examples in the older Resource
Center integration documents.
