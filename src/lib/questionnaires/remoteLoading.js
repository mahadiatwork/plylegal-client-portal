/**
 * Published form definitions are shared configuration, not applicant answers.
 * A verified server read keeps them available while Firestore rules roll out,
 * without treating a denied/failed read as an absent definition.
 */
export async function loadAuthenticatedQuestionnaireDefinition({
  auth,
  loadFromFirestore,
  loadFromServer,
}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("Sign in again to load your questionnaire.");
    error.code = "unauthenticated";
    throw error;
  }

  try {
    return await loadFromFirestore();
  } catch (error) {
    const code = String(error?.code || "").replace(/^firestore\//, "");
    if (code !== "permission-denied" && code !== "unauthenticated") throw error;
    const token = await user.getIdToken(true);
    return loadFromServer(token);
  }
}

/** Bound optional definition loading so an offline read cannot hide the fallback indefinitely. */
export async function withQuestionnaireLoadTimeout(load, timeoutMs = 10000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("The published questionnaire took too long to load.");
          error.code = "unavailable";
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
