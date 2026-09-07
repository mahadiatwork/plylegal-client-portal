// Accepted course choices, kept local to the 820/866 alignment so the approved
// temporary-work questionnaire retains its current behavior.
export const COURSE_LANGUAGE_OPTIONS = [
  "English", "Arabic", "Bengali", "Chinese (Mandarin)", "Chinese (Cantonese)",
  "French", "German", "Hindi", "Indonesian", "Italian", "Japanese", "Korean",
  "Malay", "Portuguese", "Punjabi", "Russian", "Spanish", "Tagalog", "Thai",
  "Turkish", "Urdu", "Vietnamese", "Other",
];

export const COURSE_STATUS_OPTIONS = ["Completed", "Current/Ongoing", "Deferred", "Withdrawn"];

export function normalizeCourseStatus(value) {
  return value === "Ongoing" ? "Current/Ongoing" : value;
}

// An old answer must remain visible/editable even when it is no longer offered
// on a blank form. In particular, "Chinese" cannot identify a specific dialect.
export function optionsWithSavedValue(options, value) {
  return value && !options.includes(value) ? [...options, value] : options;
}

export function normalizeEducationRecord(row) {
  return row ? { ...row, course_status: normalizeCourseStatus(row.course_status) } : row;
}

export const SPONSOR_CHARACTER_LABELS = {
  "convicted_child_offence": "Has your Sponsor specifically been convicted of a crime or offence in any country (including any conviction which is removed from official records), relating to persons under the age of 18, including but not limited to: child abuse, child sex, endangering a child, indecent dealings with a child, or possession of child pornography?",
  "charged_child_offence": "Has your Sponsor specifically been charged with any offence that is currently awaiting legal action in any country relating to persons under the age of 18, including but not limited to: child abuse, child sex, endangering a child, indecent dealings with a child, or possession of child pornography?",
  "convicted_general_offence": "In addition to any offence disclosed above, has your Sponsor ever been convicted of an offence in any country (including any conviction which is now removed from official records)? This may include traffic and other non criminal offences. If in doubt, click Yes.",
  "charged_general_offence": "In addition to any offence disclosed above, has your Sponsor ever been charged with any offence that is currently awaiting legal action? This may include traffic and other non criminal offences. If in doubt, click Yes.",
  "acquitted_mental_illness": "Has your Sponsor ever been acquitted of any offence on the grounds of mental illness, unsoundness of mind or insanity? This may include traffic and other non criminal offences. If in doubt, click Yes.",
  "removed_deported": "Has your Sponsor been removed or deported from any country?",
  "left_to_avoid_removal": "Has your Sponsor left any country to avoid being removed or deported from that country?",
  "excluded_from_country": "Has your Sponsor been excluded from or asked to leave any country?",
  "war_crimes": "Has your Sponsor committed or been involved in the commission of war crimes against humanity or human rights?",
  "national_security_risk": "Has your Sponsor ever been involved in activities which would represent a risk to national security in Australia or any other country?",
  "outstanding_debts": "Has your Sponsor ever had any outstanding debts to the Australian Government or any public authority in Australia?",
  "people_smuggling": "Has your Sponsor been involved in any activity or been convicted of any offence relating to the illegal movement of people to any country?",
  "military_training": "Has your Sponsor ever undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?",
  "military_service": "Has your Sponsor ever served in a military force, police force, state sponsored / private militia or intelligence agency (including secret police)?"
};

export const SPONSOR_CHARACTER_KEYS = [
  "convicted_child_offence", "charged_child_offence", "convicted_general_offence",
  "charged_general_offence", "acquitted_mental_illness", "removed_deported",
  "left_to_avoid_removal", "excluded_from_country", "war_crimes",
  "national_security_risk", "outstanding_debts", "people_smuggling",
  "military_training", "military_service",
];

export function normalizeSponsorCharacter(data = {}) {
  data = data || {};
  const result = {};
  for (const key of SPONSOR_CHARACTER_KEYS) {
    result[key] = data[key] === "yes" ? "yes" : "no";
    const rows = Array.isArray(data[`${key}_details`]) ? data[`${key}_details`] : [];
    // Earlier national-security controls wrote to two different arrays.
    const legacy = key === "national_security_risk" && Array.isArray(data.national_security_details)
      ? data.national_security_details : [];
    // Remove only matching copies across the two storage fields. Identical
    // entries within a single history can still represent separate events.
    const canonicalCopies = new Map();
    for (const row of rows) {
      const signature = JSON.stringify(row);
      canonicalCopies.set(signature, (canonicalCopies.get(signature) || 0) + 1);
    }
    result[`${key}_details`] = [...rows];
    for (const row of legacy) {
      const signature = JSON.stringify(row);
      const copies = canonicalCopies.get(signature) || 0;
      if (copies) canonicalCopies.set(signature, copies - 1);
      else result[`${key}_details`].push(row);
    }
  }
  return result;
}

// Display accepted common travel categories while retaining broader sponsor
// residence reasons and the original value in untouched historical records.
export function normalizeSponsorTravelReason(value) {
  if (value === "Holiday") return "Holiday or Leisure";
  if (value === "Work" || value === "Study") return "Work, study or training";
  return value;
}
