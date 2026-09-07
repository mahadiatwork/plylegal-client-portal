import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const IDENTITY_APP_NAME = "plylegal-identity-verifier";

export function getFirebaseIdentityAuth() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("Firebase project is not configured");

  // ID tokens are verified with Google's public keys, without service-account credentials.
  const app = getApps().find((candidate) => candidate.name === IDENTITY_APP_NAME)
    || initializeApp({ projectId }, IDENTITY_APP_NAME);
  return getAuth(app);
}
