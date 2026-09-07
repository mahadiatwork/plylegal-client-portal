export function parseFirebaseServiceAccount(raw) {
  const invalid = () => new Error("FIREBASE_SERVICE_ACCOUNT_KEY must contain a valid service-account JSON object");
  try {
    let value = raw;
    // Deployment dashboards sometimes wrap the JSON in another JSON string.
    for (let depth = 0; depth < 2 && typeof value === "string"; depth += 1) {
      value = value.trim();
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      value = JSON.parse(value);
    }

    if (
      !value || typeof value !== "object" || Array.isArray(value)
      || !["project_id", "client_email", "private_key"].every((key) => (
        typeof value[key] === "string" && value[key].trim()
      ))
    ) throw invalid();

    const key = value.private_key.replace(/\\n/g, "\n").trim();
    const match = key.match(/^-----BEGIN PRIVATE KEY-----\s*([\s\S]+?)\s*-----END PRIVATE KEY-----$/);
    if (!match) throw invalid();
    const body = match[1].replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) throw invalid();

    return {
      ...value,
      private_key: `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----\n`,
    };
  } catch {
    // JSON and SDK exceptions can include the entire credential in their message.
    throw invalid();
  }
}
