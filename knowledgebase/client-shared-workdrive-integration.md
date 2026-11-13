# Matter WorkDrive folders

The admin matter header has a **Matter Folder** button beside Completion. Its session-protected `/api/matter/{matterId}/shared-folder` endpoint reads the Deal's `Matter_Folder_URL` from Zoho CRM and accepts only HTTPS WorkDrive URLs. The old Shared Folder tab URL redirects to Resources.

The client portal's **Shared Files** page loads the current matter's `Client_Shared_URL` from the Zoho Deal. The API first checks the Firebase session and confirms that the Firestore application belongs to the client. Only a public WorkDrive `/external/{token}` share URL is returned. The page embeds the link and offers **Open in WorkDrive** if the browser cannot show it in the frame. Responses use `Cache-Control: private, no-store`.

The full copy-and-paste Deluge function is maintained in the Ply-Legal workspace as `workdrive_folder_structure.deluge`. It creates or reuses the matter folder and its `CLIENT SHARED` subfolder, preserves the published link in `Matter_Workdrive_Folder_URL`, and creates or reuses a view-only custom external link in `Client_Shared_URL`. The function can be rerun for existing matters to fill missing fields without recreating their folder structure.

The `workdrive_conn` connection needs `WorkDrive.files.READ`, `WorkDrive.files.CREATE`, `WorkDrive.files.sharing.CREATE`, and `WorkDrive.links.CREATE`. The team folder must allow external share links. WorkDrive's [custom link API](https://www.zoho.com/workdrive/developer/docs/api/v1/create-external-share-custom-link.html) and [link listing API](https://www.zoho.com/workdrive/developer/docs/api/v1/get-file-folder-external-share-links.html) describe the required fields and responses.
