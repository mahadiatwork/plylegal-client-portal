export const CLIENT_SHARED_FOLDER_URL = "https://workdrive.zohopublic.com.au/external/c11f82790e89f675a5e4eb885e5e14b385b36b7822a467637b1f32f495b416d1";

// The client folder is intentionally separate from the admin matter's CRM folder.
export async function loadClientSharedFolderAccess() {
  return { url: CLIENT_SHARED_FOLDER_URL, mode: "embed" };
}
