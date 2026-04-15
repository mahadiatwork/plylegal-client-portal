/**
 * Options for passport/travel document "Name on document" — aligned with Application Profile
 * (primary name) and the per-person Other tab (other names / aliases).
 */

function formatProfileFullName(profile) {
  if (!profile) return "";
  const g = String(profile.given_names || "").trim();
  const f = String(profile.family_name || "").trim();
  return [g, f].filter(Boolean).join(" ");
}

function formatOtherNameRow(row) {
  if (!row) return "";
  const g = String(row.given_names || "").trim();
  const f = String(row.family_name || "").trim();
  return [g, f].filter(Boolean).join(" ");
}

/**
 * @param {object} draft - draft snapshot (e.g. draftStore.draft)
 * @param {string|null|undefined} profileId - active profile id from URL; when null, use legacy + relationshipFallback
 * @param {{ legacyOtherKey?: string, relationshipFallback?: string }} [opts]
 * @returns {{ value: string, label: string }[]}
 */
export function buildPassportNameOptions(draft, profileId, opts = {}) {
  const { legacyOtherKey, relationshipFallback } = opts;
  const profiles = draft?.profiles || [];

  let profile = profileId ? profiles.find((p) => p.id === profileId) : null;
  if (!profile && relationshipFallback) {
    profile = profiles.find((p) => p.relationship === relationshipFallback) ?? null;
  }

  let otherSection = {};
  if (profileId) {
    otherSection = draft?.profiles_data?.[profileId]?.other ?? {};
  } else if (legacyOtherKey) {
    otherSection = draft?.[legacyOtherKey] ?? {};
  }

  const otherNames = Array.isArray(otherSection.other_names) ? otherSection.other_names : [];
  const primary = formatProfileFullName(profile);
  const aliases = otherNames.map(formatOtherNameRow).filter(Boolean);

  const seen = new Set();
  /** @type {{ value: string, label: string }[]} */
  const options = [];

  if (primary) {
    seen.add(primary);
    options.push({ value: primary, label: `${primary} (primary name)` });
  }
  for (const name of aliases) {
    if (name && !seen.has(name)) {
      seen.add(name);
      options.push({ value: name, label: `${name} (other name / alias)` });
    }
  }

  return options;
}
