"use client";

import { proxy } from "valtio";
import { getAdapter } from "@/lib/adapters";
import { getAllRoutes, getIntakeRoutes, setProfilesGetter, setNonMigratingMembersGetter } from "@/lib/routes";
import { authStore } from "./authStore";

// Get database adapter (Firebase or localStorage based on env)
const db = getAdapter();

const TEMPORARY_WORK_PROFILE_SECTIONS = {
  main_applicant: ["details", "other", "identity", "contact_details", "employment", "education", "skills", "language"],
  spouse: ["details", "other", "identity", "education", "language"],
  child: ["details", "other", "identity", "custody"],
  other: ["details", "other", "identity", "contact_details", "employment", "education", "skills", "language"],
};

const TEMPORARY_WORK_LEGACY_SECTION_KEYS = {
  main_applicant: {
    details: "temporary_work_details",
    other: "temporary_work_other",
    identity: "temporary_work_identity",
    contact_details: "temporary_work_contact_details",
    employment: "temporary_work_employment",
    education: "temporary_work_education",
    skills: "temporary_work_skills",
    language: "temporary_work_language",
  },
  spouse: {
    details: "temporary_work_spouse_details",
    other: "temporary_work_spouse_other",
    identity: "temporary_work_spouse_identity",
    education: "temporary_work_spouse_education",
    language: "temporary_work_spouse_language",
  },
};

const TEMPORARY_WORK_SHARED_IMPORTERS = {
  temporary_work_visas: remapTemporaryWorkVisasSection,
  temporary_work_travel: remapTemporaryWorkTravelSection,
  temporary_work_countries_of_residence: remapTemporaryWorkResidenceSection,
  temporary_work_health: remapTemporaryWorkHealthSection,
  temporary_work_character: remapTemporaryWorkCharacterSection,
};

const HEALTH_REPEATER_FLAG_BY_KEY = {
  health_examinations: "has_health_examinations",
  visited_outside_details: "visited_outside_passport_country",
  hospital_details: "intends_hospital_entry",
  healthcare_work_details: "intends_healthcare_work",
  aged_care_work_details: "intends_aged_care",
  childcare_work_details: "intends_childcare",
  classroom_work_details: "intends_classroom",
  tuberculosis_details: "had_tuberculosis",
  health_conditions_details: "medical_condition",
  medical_assistance_details: "requires_assistance",
  tuberculosis_exposure_details: "close_contact_tb",
  health_insurance_details: "health_insurance",
};

const COMPLETION_PAGE_PREFIXES = ["temporary-work/", "partner/", "protection/"];

function getCompletionPageKeys(completionStatus) {
  return Object.keys(completionStatus || {}).filter((key) =>
    COMPLETION_PAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function cloneDraftValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function hasMeaningfulValue(value) {
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value).some((nestedValue) => hasMeaningfulValue(nestedValue));
  }
  return value !== null && value !== undefined;
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function normalizeTextValue(value) {
  return firstTextValue(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeMonthValue(value) {
  const text = normalizeTextValue(value);
  if (!text) return "";
  const monthMap = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  if (monthMap[text]) return monthMap[text];
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? String(number).padStart(2, "0") : "";
}

function normalizeDayValue(value) {
  const text = firstTextValue(value);
  if (!text) return "";
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? String(number).padStart(2, "0") : text;
}

function normalizeProfileDob(profile) {
  return {
    day: normalizeDayValue(profile?.birth_day ?? profile?.dob_day),
    month: normalizeMonthValue(profile?.birth_month ?? profile?.dob_month),
    year: firstTextValue(profile?.birth_year ?? profile?.dob_year),
  };
}

function profileHasCompleteDob(profile) {
  const dob = normalizeProfileDob(profile);
  return Boolean(dob.day && dob.month && dob.year);
}

function getProfileFullName(profile) {
  return [profile?.given_names, profile?.family_name]
    .map((value) => firstTextValue(value))
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getProfileDisplayName(profile) {
  return getProfileFullName(profile) || "Unnamed applicant";
}

function getProfileHealthLabel(profile) {
  const name = getProfileDisplayName(profile);
  const dobParts = [profile?.birth_day, profile?.birth_month, profile?.birth_year]
    .map((value) => firstTextValue(value))
    .filter(Boolean);
  return dobParts.length > 0 ? `${name} (DOB: ${dobParts.join(" ")})` : name;
}

function getProfileIdentityKey(profile) {
  if (!profileHasCompleteDob(profile)) return "";
  const familyName = normalizeTextValue(profile?.family_name);
  const givenNames = normalizeTextValue(profile?.given_names);
  if (!familyName || !givenNames) return "";
  const dob = normalizeProfileDob(profile);
  return `${givenNames}|${familyName}|${dob.year}-${dob.month}-${dob.day}`;
}

function getApplicantNameVariants(profile) {
  const name = getProfileFullName(profile);
  if (!name) return [];
  const dob = [profile?.birth_day, profile?.birth_month, profile?.birth_year]
    .map((value) => firstTextValue(value))
    .filter(Boolean)
    .join(" ");
  return [
    name,
    dob ? `${name} (DOB: ${dob})` : "",
    `${name} (Main Applicant)`,
    `${name} (Spouse/Partner)`,
    `${name} (Spouse / Partner)`,
    `${name} (Child)`,
    `${name} (Dependent)`,
  ].filter(Boolean);
}

function buildLegacyProfileFromSection(id, relationship, sectionData) {
  if (!hasMeaningfulValue(sectionData)) return null;
  return {
    id,
    relationship,
    given_names: sectionData?.given_names || "",
    family_name: sectionData?.family_name || "",
    gender: sectionData?.gender || "",
    birth_day: sectionData?.birth_day || "",
    birth_month: sectionData?.birth_month || "",
    birth_year: sectionData?.birth_year || "",
  };
}

function getImportableSourceProfiles(sourceDraft) {
  if (Array.isArray(sourceDraft?.profiles) && sourceDraft.profiles.length > 0) {
    return sourceDraft.profiles;
  }

  const profiles = [];
  const mainApplicant = buildLegacyProfileFromSection("legacy_main", "main_applicant", sourceDraft?.temporary_work_details);
  const spouse = buildLegacyProfileFromSection("legacy_spouse", "spouse", sourceDraft?.temporary_work_spouse_details);
  if (mainApplicant) profiles.push(mainApplicant);
  if (spouse) profiles.push(spouse);

  const legacyChildren = sourceDraft?.temporary_work_children?.children;
  if (Array.isArray(legacyChildren)) {
    legacyChildren.forEach((child, index) => {
      const included = String(child?.included_in_application || "").toLowerCase();
      if (included && included !== "yes" && included !== "true") return;
      const profile = buildLegacyProfileFromSection(`legacy_child_${index}`, "child", child);
      if (profile) profiles.push(profile);
    });
  }

  return profiles;
}

function getProfileSectionsFromDraft(sourceDraft, sourceProfile) {
  const profileSections = cloneDraftValue(sourceDraft?.profiles_data?.[sourceProfile?.id] || {}) || {};
  const legacySectionKeys = TEMPORARY_WORK_LEGACY_SECTION_KEYS[sourceProfile?.relationship] || {};

  Object.entries(legacySectionKeys).forEach(([sectionName, legacyKey]) => {
    if (profileSections[sectionName] !== undefined) return;
    if (hasMeaningfulValue(sourceDraft?.[legacyKey])) {
      profileSections[sectionName] = cloneDraftValue(sourceDraft[legacyKey]);
    }
  });

  return profileSections;
}

function findMatchingSourceProfile(targetProfile, sourceProfiles, usedSourceIds) {
  const targetZohoId = firstTextValue(targetProfile?.zohoDependentId);
  if (targetZohoId) {
    const zohoMatch = sourceProfiles.find((sourceProfile) => (
      !usedSourceIds.has(sourceProfile.id) &&
      firstTextValue(sourceProfile?.zohoDependentId) === targetZohoId
    ));
    if (zohoMatch) return zohoMatch;
  }

  const targetIdentityKey = getProfileIdentityKey(targetProfile);
  if (!targetIdentityKey) return null;

  return sourceProfiles.find((sourceProfile) => (
    !usedSourceIds.has(sourceProfile.id) &&
    getProfileIdentityKey(sourceProfile) === targetIdentityKey
  )) || null;
}

function buildProfileImportMatches(sourceProfiles, targetProfiles) {
  const usedSourceIds = new Set();
  const matchedApplicants = [];
  const unmatchedTargetApplicants = [];

  targetProfiles.forEach((targetProfile) => {
    const sourceProfile = findMatchingSourceProfile(targetProfile, sourceProfiles, usedSourceIds);
    if (!sourceProfile) {
      unmatchedTargetApplicants.push({
        id: targetProfile.id,
        name: getProfileDisplayName(targetProfile),
        relationship: targetProfile.relationship,
      });
      return;
    }

    usedSourceIds.add(sourceProfile.id);
    matchedApplicants.push({
      sourceProfile,
      targetProfile,
      sourceName: getProfileDisplayName(sourceProfile),
      targetName: getProfileDisplayName(targetProfile),
      sourceRelationship: sourceProfile.relationship,
      targetRelationship: targetProfile.relationship,
    });
  });

  const skippedSourceApplicants = sourceProfiles
    .filter((sourceProfile) => !usedSourceIds.has(sourceProfile.id))
    .map((sourceProfile) => ({
      id: sourceProfile.id,
      name: getProfileDisplayName(sourceProfile),
      relationship: sourceProfile.relationship,
    }));

  return { matchedApplicants, unmatchedTargetApplicants, skippedSourceApplicants };
}

function getCompletionKeyFromTemporaryWorkRoute(route) {
  if (!route || route.includes("/submit")) return null;

  const [pathOnly, queryString] = String(route).split("?", 2);
  const params = new URLSearchParams(queryString || "");
  const pathWithoutPrefix = pathOnly.replace("/intake/temporary-work/", "");
  const baseKey = `temporary-work/${pathWithoutPrefix}`;

  const profileId = params.get("profileId");
  if (profileId && /^(main-applicant|spouse-partner)\//.test(pathWithoutPrefix)) {
    return `${baseKey}__${profileId}`;
  }

  const childMatch = pathWithoutPrefix.match(/^children\/([^/]+)\/[^/]+$/);
  if (childMatch?.[1]) {
    return `${baseKey}__${childMatch[1]}`;
  }

  const nonMigratingMatch = pathWithoutPrefix.match(/^non-migrating\/([^/]+)\/[^/]+$/);
  if (nonMigratingMatch?.[1]) {
    return `${baseKey}__${nonMigratingMatch[1]}`;
  }

  return baseKey;
}

function isCompletionKeyComplete(completionStatus, key) {
  if (completionStatus?.[key] === true) return true;

  if (key?.startsWith("temporary-work/") && key.includes("__")) {
    const legacyKey = key.split("__")[0];
    return completionStatus?.[legacyKey] === true;
  }

  return false;
}

function buildApplicantRemap(matchedApplicants) {
  const sourceIdToTargetId = new Map();
  const sourceNameToTargetId = new Map();
  const sourceNameToTargetName = new Map();
  const sourceNameToTargetHealthLabel = new Map();

  matchedApplicants.forEach(({ sourceProfile, targetProfile }) => {
    sourceIdToTargetId.set(String(sourceProfile.id), targetProfile.id);
    getApplicantNameVariants(sourceProfile).forEach((variant) => {
      const normalizedVariant = normalizeTextValue(variant);
      if (!normalizedVariant) return;
      sourceNameToTargetId.set(normalizedVariant, targetProfile.id);
      sourceNameToTargetName.set(normalizedVariant, getProfileDisplayName(targetProfile));
      sourceNameToTargetHealthLabel.set(normalizedVariant, getProfileHealthLabel(targetProfile));
    });
  });

  return {
    remapApplicantId(value) {
      const direct = sourceIdToTargetId.get(String(value || ""));
      if (direct) return direct;
      return sourceNameToTargetId.get(normalizeTextValue(value)) || null;
    },
    remapApplicantName(value) {
      return sourceNameToTargetName.get(normalizeTextValue(value)) || null;
    },
    remapHealthApplicantName(value) {
      return sourceNameToTargetHealthLabel.get(normalizeTextValue(value)) || null;
    },
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function remapTemporaryWorkVisasSection(sourceSection, applicantRemap) {
  const nextSection = cloneDraftValue(sourceSection) || {};
  const sourceEntries = Array.isArray(sourceSection?.visa_grant_entries) ? sourceSection.visa_grant_entries : [];
  nextSection.visa_grant_entries = sourceEntries
    .map((entry) => {
      const targetApplicantId = applicantRemap.remapApplicantId(entry?.applicantId);
      if (!targetApplicantId) return null;
      return { ...cloneDraftValue(entry), applicantId: targetApplicantId };
    })
    .filter(Boolean);
  return nextSection;
}

function remapTemporaryWorkTravelSection(sourceSection, applicantRemap) {
  const nextSection = cloneDraftValue(sourceSection) || {};
  const sourceRows = Array.isArray(sourceSection?.travel_history) ? sourceSection.travel_history : [];
  nextSection.travel_history = sourceRows
    .map((row) => {
      const sourceApplicantIds = Array.isArray(row?.applicant_ids)
        ? row.applicant_ids
        : row?.applicant_name
          ? [row.applicant_name]
          : [];
      const targetApplicantIds = uniqueValues(sourceApplicantIds.map((sourceApplicantId) =>
        applicantRemap.remapApplicantId(sourceApplicantId)
      ));
      if (targetApplicantIds.length === 0) return null;
      const nextRow = { ...cloneDraftValue(row), applicant_ids: targetApplicantIds };
      delete nextRow.applicant_name;
      return nextRow;
    })
    .filter(Boolean);
  if (sourceRows.length > 0 && nextSection.travel_history.length === 0) {
    nextSection.has_travel_history = "no";
  }
  return nextSection;
}

function remapTemporaryWorkResidenceSection(sourceSection, applicantRemap) {
  const nextSection = cloneDraftValue(sourceSection) || {};
  const sourceRows = Array.isArray(sourceSection?.residence_records) ? sourceSection.residence_records : [];
  nextSection.residence_records = sourceRows
    .map((row) => {
      const targetApplicantName = applicantRemap.remapApplicantName(row?.applicant_name);
      if (!targetApplicantName) return null;
      return { ...cloneDraftValue(row), applicant_name: targetApplicantName };
    })
    .filter(Boolean);
  return nextSection;
}

function remapTemporaryWorkHealthSection(sourceSection, applicantRemap) {
  const nextSection = cloneDraftValue(sourceSection) || {};

  Object.entries(HEALTH_REPEATER_FLAG_BY_KEY).forEach(([arrayKey, flagKey]) => {
    const sourceRows = Array.isArray(sourceSection?.[arrayKey]) ? sourceSection[arrayKey] : [];
    if (!Array.isArray(sourceSection?.[arrayKey])) return;
    nextSection[arrayKey] = sourceRows
      .map((row) => {
        const targetApplicantName = applicantRemap.remapHealthApplicantName(row?.applicant_name);
        if (!targetApplicantName) return null;
        return { ...cloneDraftValue(row), applicant_name: targetApplicantName };
      })
      .filter(Boolean);
    if (sourceRows.length > 0 && nextSection[arrayKey].length === 0 && nextSection[flagKey] === "yes") {
      nextSection[flagKey] = "no";
    }
  });

  return nextSection;
}

function remapTemporaryWorkCharacterSection(sourceSection, applicantRemap) {
  const nextSection = cloneDraftValue(sourceSection) || {};

  Object.keys(nextSection).forEach((key) => {
    if (!key.endsWith("_applicant_name")) return;
    const sourceApplicantName = nextSection[key];
    if (!sourceApplicantName) return;
    const targetApplicantName = applicantRemap.remapApplicantName(sourceApplicantName);
    if (targetApplicantName) {
      nextSection[key] = targetApplicantName;
      return;
    }

    const baseKey = key.slice(0, -"_applicant_name".length);
    nextSection[key] = "";
    if (`${baseKey}_details` in nextSection) nextSection[`${baseKey}_details`] = "";
    if (baseKey in nextSection) nextSection[baseKey] = "";
  });

  return nextSection;
}

function copyMatchedProfileSections(sourceDraft, candidateDraft, matchedApplicants) {
  const copiedSections = [];
  const nextProfilesData = cloneDraftValue(candidateDraft.profiles_data || {}) || {};

  matchedApplicants.forEach(({ sourceProfile, targetProfile }) => {
    const sourceSections = getProfileSectionsFromDraft(sourceDraft, sourceProfile);
    const targetSections = cloneDraftValue(nextProfilesData[targetProfile.id] || {}) || {};
    const targetAllowedSections = TEMPORARY_WORK_PROFILE_SECTIONS[targetProfile.relationship] || TEMPORARY_WORK_PROFILE_SECTIONS.other;
    const sourceAllowedSections = TEMPORARY_WORK_PROFILE_SECTIONS[sourceProfile.relationship] || TEMPORARY_WORK_PROFILE_SECTIONS.other;
    const importableSections = targetAllowedSections.filter((sectionName) =>
      sourceAllowedSections.includes(sectionName) && hasMeaningfulValue(sourceSections[sectionName])
    );

    importableSections.forEach((sectionName) => {
      targetSections[sectionName] = cloneDraftValue(sourceSections[sectionName]);
    });

    nextProfilesData[targetProfile.id] = targetSections;

    if (importableSections.length > 0) {
      copiedSections.push({
        applicantId: targetProfile.id,
        applicantName: getProfileDisplayName(targetProfile),
        sections: importableSections,
      });
    }
  });

  candidateDraft.profiles_data = nextProfilesData;
  return copiedSections;
}

function copySharedTemporaryWorkSections(sourceDraft, candidateDraft, applicantRemap) {
  const copiedSharedSections = [];

  Object.entries(TEMPORARY_WORK_SHARED_IMPORTERS).forEach(([sectionKey, remapSection]) => {
    if (!hasMeaningfulValue(sourceDraft?.[sectionKey])) return;
    const remappedSection = remapSection(sourceDraft[sectionKey], applicantRemap);
    candidateDraft[sectionKey] = remappedSection;
    copiedSharedSections.push(sectionKey);
  });

  return copiedSharedSections;
}

function clearProfileCompletionKeys(completionStatus, profileIds) {
  const profileIdSet = new Set(profileIds.filter(Boolean));
  const nextCompletionStatus = {};

  Object.entries(completionStatus || {}).forEach(([key, value]) => {
    const profileId = String(key).split("__")[1];
    const isProfileScopedTemporaryWorkKey =
      profileIdSet.has(profileId) &&
      (
        key.startsWith("temporary-work/main-applicant/") ||
        key.startsWith("temporary-work/spouse-partner/") ||
        key.startsWith("temporary-work/children/")
      );

    nextCompletionStatus[key] = isProfileScopedTemporaryWorkKey ? false : value;
  });

  return nextCompletionStatus;
}

export const draftStore = proxy({
  draft: {},
  completionStatus: {}, // Track which pages are completed: { "start": true, "main-applicant/details": true, ... }
  currentApplicationId: null, // Track which application this draft belongs to
  activeProfileId: null, // Currently selected profile in the questionnaire
  visaContext: null, // '482' or '186' — determines visa-specific behaviour
  shouldPrefill: false,
  lastSaved: null,
  isLoading: false,
  isSaving: false,

  /** Set the visa context (subclass) for the current application */
  setVisaContext(context) {
    this.visaContext = context;
  },

  isZohoSyncableProfile(profile) {
    return ["spouse", "child", "other"].includes(profile?.relationship);
  },

  formatProfileDateOfBirth(profile) {
    const year = String(profile?.birth_year || "").trim();
    const day = String(profile?.birth_day || "").trim().padStart(2, "0");
    const rawMonth = String(profile?.birth_month || "").trim();
    if (!year || !day || !rawMonth) return "";

    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const month =
      monthMap[rawMonth.toLowerCase()] ||
      (Number.isFinite(Number(rawMonth)) ? String(Number(rawMonth)).padStart(2, "0") : "");

    if (!month) return "";
    return `${year}-${month}-${day}`;
  },

  async syncMainApplicantProfileToZoho(profile) {
    try {
      if (typeof window === "undefined") return null;
      if (profile?.relationship !== "main_applicant") return null;

      const userId = authStore.user?.id;
      const email = authStore.user?.email;
      const zohoContactId = authStore.userProfile?.zohoContactId || null;
      if (!userId || (!zohoContactId && !email)) return null;

      const payload = { userId };
      if (zohoContactId) payload.contactId = zohoContactId;
      if (email) payload.email = email;

      if (String(profile?.given_names || "").trim()) payload.firstName = profile.given_names;
      if (String(profile?.family_name || "").trim()) payload.lastName = profile.family_name;
      if (String(profile?.gender || "").trim()) payload.gender = profile.gender;

      const dateOfBirth = this.formatProfileDateOfBirth(profile);
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;

      const response = await fetch("/api/profile/sync-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        console.warn("Main applicant Zoho sync skipped/failed:", result);
        return null;
      }

      try {
        await authStore.loadUserProfile();
      } catch (reloadErr) {
        console.warn("Could not refresh user profile after main applicant sync:", reloadErr?.message);
      }

      return result;
    } catch (error) {
      console.warn("Main applicant Zoho sync failed:", error.message);
      return null;
    }
  },

  async syncDependentProfileToZoho(profile, action) {
    try {
      if (typeof window === "undefined") return null;
      const userId = authStore.user?.id;
      if (!userId || !this.currentApplicationId || !this.isZohoSyncableProfile(profile)) {
        return null;
      }

      const zohoContactId = authStore.userProfile?.zohoContactId || null;
      const response = await fetch("/api/intake/sync-dependent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          applicationId: this.currentApplicationId,
          profile,
          action,
          zohoContactId,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        console.warn("Dependent Zoho sync skipped/failed:", result);
        return null;
      }
      return result.zohoDependentId || null;
    } catch (error) {
      console.warn("Dependent Zoho sync failed:", error.message);
      return null;
    }
  },

  async syncNonMigratingMemberToZoho(member, action) {
    try {
      if (typeof window === "undefined") return null;
      const userId = authStore.user?.id;
      if (!userId || !this.currentApplicationId) return null;

      const zohoContactId = authStore.userProfile?.zohoContactId || null;
      if (!zohoContactId) return null;

      // Map non-migrating member to Partner_Dependents format with isNonMigrating: true
      const profile = {
        given_names: member.passport?.given_names || "",
        family_name: member.passport?.family_name || "",
        relationship: member.relationship === "child" ? "child" : "other",
        gender: member.passport?.sex || "",
        birth_day: member.passport?.dob_day || "",
        birth_month: member.passport?.dob_month || "",
        birth_year: member.passport?.dob_year || "",
        isNonMigrating: true,
        zohoDependentId: member.zohoDependentId,
      };

      const response = await fetch("/api/intake/sync-dependent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          applicationId: this.currentApplicationId,
          profile,
          action,
          zohoContactId,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        console.warn("Non-migrating member Zoho sync skipped/failed:", result);
        return null;
      }
      return result.zohoDependentId || null;
    } catch (error) {
      console.warn("Non-migrating member Zoho sync failed:", error.message);
      return null;
    }
  },

  async persistNonMigratingZohoDependentId(memberId, zohoDependentId) {
    if (!memberId || !zohoDependentId) return;
    const members = (this.draft?.non_migrating_members || []).map((m) =>
      m.id === memberId ? { ...m, zohoDependentId } : m
    );
    this.draft = { ...this.draft, non_migrating_members: members };
    await db.saveDraft(this.draft, this.currentApplicationId);
  },

  async persistProfileZohoDependentId(profileId, zohoDependentId) {
    if (!profileId || !zohoDependentId) return;
    const profiles = (this.draft?.profiles || []).map((p) =>
      p.id === profileId ? { ...p, zohoDependentId } : p
    );
    this.draft = { ...this.draft, profiles };
    await db.saveDraft(this.draft, this.currentApplicationId);
  },

  // ─── Profile Helpers ───────────────────────────────────────────────────────

  /** Return all profiles, defaulting to empty array */
  getProfiles() {
    return this.draft?.profiles || [];
  },

  /** Set the active profile being edited */
  setActiveProfile(profileId) {
    this.activeProfileId = profileId;
  },

  /** Get a single profile by id */
  getProfile(profileId) {
    return (this.draft?.profiles || []).find(p => p.id === profileId) || null;
  },

  /** Add a new profile and persist */
  async addProfile(profile) {
    const newProfile = {
      id: profile.id || `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...profile,
    };
    const profiles = [...(this.draft?.profiles || []), newProfile];
    const newDraft = { ...this.draft, profiles };
    this.draft = newDraft;
    await db.saveDraft(this.draft, this.currentApplicationId);
    await this.persistCompletionPercentage(this.currentApplicationId);
    const action = newProfile.zohoDependentId ? "update" : "create";
    const zohoDependentId = await this.syncDependentProfileToZoho(newProfile, action);
    if (zohoDependentId) {
      await this.persistProfileZohoDependentId(newProfile.id, zohoDependentId);
      newProfile.zohoDependentId = zohoDependentId;
    }
    if (newProfile.relationship === "main_applicant") {
      await this.syncMainApplicantProfileToZoho(newProfile);
    }
    return newProfile;
  },

  /** Update an existing profile by id */
  async updateProfile(profileId, updates) {
    const existingProfile = (this.draft?.profiles || []).find((p) => p.id === profileId);
    const updatedProfile = existingProfile ? { ...existingProfile, ...updates } : null;
    const profiles = (this.draft?.profiles || []).map(p =>
      p.id === profileId ? updatedProfile : p
    );
    const newDraft = { ...this.draft, profiles };
    this.draft = newDraft;
    await db.saveDraft(this.draft, this.currentApplicationId);
    await this.persistCompletionPercentage(this.currentApplicationId);

    if (existingProfile?.zohoDependentId && !this.isZohoSyncableProfile(updatedProfile)) {
      await this.syncDependentProfileToZoho(existingProfile, "delete");
      return;
    }

    if (this.isZohoSyncableProfile(updatedProfile)) {
      const action = updatedProfile.zohoDependentId ? "update" : "create";
      const zohoDependentId = await this.syncDependentProfileToZoho(updatedProfile, action);
      if (zohoDependentId && !updatedProfile.zohoDependentId) {
        await this.persistProfileZohoDependentId(profileId, zohoDependentId);
      }
    }

    if (updatedProfile?.relationship === "main_applicant") {
      await this.syncMainApplicantProfileToZoho(updatedProfile);
    }
  },

  /** Promote a spouse/partner profile to the primary applicant for this application */
  async setPrimaryApplicant(profileId) {
    const appId = this.currentApplicationId;
    if (!appId) {
      return { success: false, error: "Application ID required" };
    }

    const profiles = this.draft?.profiles || [];
    const selectedProfile = profiles.find((profile) => profile.id === profileId);
    if (!selectedProfile) {
      return { success: false, error: "Applicant not found" };
    }
    if (selectedProfile.relationship === "main_applicant") {
      return { success: true };
    }

    const currentPrimary = profiles.find((profile) => profile.relationship === "main_applicant");
    const selectedPreviousRelationship = selectedProfile.relationship;
    const updatedProfiles = profiles.map((profile) => {
      if (profile.id === profileId) {
        return { ...profile, relationship: "main_applicant" };
      }
      if (currentPrimary && profile.id === currentPrimary.id) {
        return {
          ...profile,
          relationship: selectedPreviousRelationship === "spouse" ? "spouse" : "other",
        };
      }
      return profile;
    });

    const previousDraft = cloneDraftValue(this.draft);
    const previousCompletionStatus = cloneDraftValue(this.completionStatus);
    const profileIdsToReview = [profileId, currentPrimary?.id].filter(Boolean);
    const nextCompletionStatus = clearProfileCompletionKeys(this.completionStatus, profileIdsToReview);
    const nextDraft = { ...this.draft, profiles: updatedProfiles };

    this.draft = nextDraft;
    this.completionStatus = nextCompletionStatus;

    const draftResult = await db.saveDraft(this.draft, appId);
    if (!draftResult.success) {
      this.draft = previousDraft;
      this.completionStatus = previousCompletionStatus;
      return { success: false, error: draftResult.error || "Failed to update primary applicant" };
    }

    await this.persistCompletionPercentage(appId);
    this.activeProfileId = profileId;

    const newPrimary = updatedProfiles.find((profile) => profile.id === profileId);
    if (newPrimary) {
      await this.syncMainApplicantProfileToZoho(newPrimary);
    }

    return { success: true };
  },

  /** Delete a profile and its data */
  async deleteProfile(profileId) {
    const profileToDelete = (this.draft?.profiles || []).find((p) => p.id === profileId);
    const profiles = (this.draft?.profiles || []).filter(p => p.id !== profileId);
    const profiles_data = { ...(this.draft?.profiles_data || {}) };
    delete profiles_data[profileId];
    const newDraft = { ...this.draft, profiles, profiles_data };
    this.draft = newDraft;
    await db.saveDraft(this.draft, this.currentApplicationId);
    await this.persistCompletionPercentage(this.currentApplicationId);
    if (profileToDelete?.zohoDependentId && this.isZohoSyncableProfile(profileToDelete)) {
      await this.syncDependentProfileToZoho(profileToDelete, "delete");
    }
  },

  /** Get section data for a specific profile */
  getProfileSectionData(profileId, section) {
    return this.draft?.profiles_data?.[profileId]?.[section] || {};
  },

  /** Save section data for a specific profile.
   *  Follows save-first semantics: persist to DB, then update local state only on success.
   */
  async saveProfileSectionData(profileId, section, data) {
    try {
      this.isSaving = true;
      const appId = this.currentApplicationId;
      if (!appId) {
        this.isSaving = false;
        return { success: false, error: 'Application ID required' };
      }

      // Build the candidate draft WITHOUT mutating `this.draft` yet
      const candidateDraft = JSON.parse(JSON.stringify(this.draft));
      if (!candidateDraft.profiles_data) candidateDraft.profiles_data = {};
      if (!candidateDraft.profiles_data[profileId]) candidateDraft.profiles_data[profileId] = {};
      candidateDraft.profiles_data[profileId][section] = data;

      // Persist first — only touch local state after confirmed success
      const result = await db.saveDraft(candidateDraft, appId);
      if (result.success) {
        this.draft = candidateDraft;
        this.lastSaved = new Date().toISOString();
        this.isSaving = false;
        return { success: true };
      }
      // Save failed — do NOT update this.draft (preserves last-known-good state)
      this.isSaving = false;
      return { success: false, error: result.error };
    } catch (error) {
      this.isSaving = false;
      return { success: false, error: error.message };
    }
  },

  /** Mark a per-profile page as complete */
  async markProfilePageComplete(profileId, pageKey, applicationId) {
    const fullKey = `${pageKey}__${profileId}`;
    return this.markPageComplete(fullKey, applicationId, false);
  },

  /** Check if a per-profile page is complete */
  isProfilePageComplete(profileId, pageKey) {
    const fullKey = `${pageKey}__${profileId}`;
    return this.completionStatus[fullKey] === true;
  },

  // ─── End Profile Helpers ───────────────────────────────────────────────────

  // ─── Non-Migrating Family Member Helpers ──────────────────────────────────

  /** Return all non-migrating family members, defaulting to empty array */
  getNonMigratingMembers() {
    return this.draft?.non_migrating_members || [];
  },

  /** Get a single non-migrating member by id */
  getNonMigratingMember(memberId) {
    return (this.draft?.non_migrating_members || []).find(m => m.id === memberId) || null;
  },

  /** Add a new non-migrating member and persist */
  async addNonMigratingMember(member) {
    const appId = this.currentApplicationId;
    if (!appId) {
      console.warn("[draftStore] addNonMigratingMember: Application ID required");
      return null;
    }

    const previousDraft = JSON.parse(JSON.stringify(this.draft));
    const newMember = {
      id: member.id || `nmf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...member,
    };
    const members = [...(this.draft?.non_migrating_members || []), newMember];
    this.draft = { ...this.draft, non_migrating_members: members };

    const result = await db.saveDraft(this.draft, appId);
    if (!result.success) {
      console.warn("[draftStore] addNonMigratingMember: save failed", result.error);
      this.draft = previousDraft;
      return null;
    }
    await this.persistCompletionPercentage(appId);

    // Sync to Zoho CRM as non-migrating dependent
    const zohoDependentId = await this.syncNonMigratingMemberToZoho(newMember, "create");
    if (zohoDependentId) {
      await this.persistNonMigratingZohoDependentId(newMember.id, zohoDependentId);
      newMember.zohoDependentId = zohoDependentId;
    }

    return newMember;
  },

  /** Update an existing non-migrating member by id */
  async updateNonMigratingMember(memberId, updates) {
    const appId = this.currentApplicationId;
    if (!appId) {
      console.warn("[draftStore] updateNonMigratingMember: Application ID required");
      return false;
    }

    const previousDraft = JSON.parse(JSON.stringify(this.draft));
    const existingMember = (this.draft?.non_migrating_members || []).find(m => m.id === memberId);
    const updatedMember = existingMember ? { ...existingMember, ...updates } : null;

    const members = (this.draft?.non_migrating_members || []).map(m =>
      m.id === memberId ? { ...m, ...updates } : m
    );
    this.draft = { ...this.draft, non_migrating_members: members };

    const result = await db.saveDraft(this.draft, appId);
    if (!result.success) {
      console.warn("[draftStore] updateNonMigratingMember: save failed", result.error);
      this.draft = previousDraft;
      return false;
    }
    await this.persistCompletionPercentage(appId);

    // Sync to Zoho CRM
    if (updatedMember) {
      const action = updatedMember.zohoDependentId ? "update" : "create";
      const zohoDependentId = await this.syncNonMigratingMemberToZoho(updatedMember, action);
      if (zohoDependentId && !updatedMember.zohoDependentId) {
        await this.persistNonMigratingZohoDependentId(memberId, zohoDependentId);
      }
    }

    return true;
  },

  /** Delete a non-migrating member */
  async deleteNonMigratingMember(memberId) {
    const appId = this.currentApplicationId;
    if (!appId) {
      console.warn("[draftStore] deleteNonMigratingMember: Application ID required");
      return false;
    }

    const previousDraft = JSON.parse(JSON.stringify(this.draft));
    const memberToDelete = (this.draft?.non_migrating_members || []).find(m => m.id === memberId);
    const members = (this.draft?.non_migrating_members || []).filter(m => m.id !== memberId);
    this.draft = { ...this.draft, non_migrating_members: members };

    const result = await db.saveDraft(this.draft, appId);
    if (!result.success) {
      console.warn("[draftStore] deleteNonMigratingMember: save failed", result.error);
      this.draft = previousDraft;
      return false;
    }
    await this.persistCompletionPercentage(appId);

    // Delete from Zoho CRM if synced
    if (memberToDelete?.zohoDependentId) {
      await this.syncNonMigratingMemberToZoho(memberToDelete, "delete");
    }

    return true;
  },

  // ─── End Non-Migrating Family Member Helpers ──────────────────────────────

  // Set the current application context
  setApplicationId(appId) {
    this.currentApplicationId = appId;
  },


  // Actions
  async saveDraft(data, applicationId) {
    console.log('[DEBUG draftStore] saveDraft called');
    const startTime = performance.now();

    try {
      this.isSaving = true;

      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('[DEBUG draftStore] No application ID set for draft save');
        this.isSaving = false;
        return { success: false, error: 'Application ID required' };
      }
      console.log(`[DEBUG draftStore] App ID: ${appId}`);

      // Merge with existing draft
      console.log('[DEBUG draftStore] Merging data with existing draft...');
      this.draft = { ...this.draft, ...data };

      // Save to Firebase immediately (no debouncing per user request)
      console.log('[DEBUG draftStore] Saving to database...');
      const dbStartTime = performance.now();
      const result = await db.saveDraft(this.draft, appId);
      const dbEndTime = performance.now();
      console.log(`[DEBUG draftStore] Database save completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`);

      if (result.success) {
        this.lastSaved = new Date().toISOString();
        this.isSaving = false;
        console.log(`[DEBUG draftStore] saveDraft total time: ${(performance.now() - startTime).toFixed(2)}ms`);
        return { success: true };
      }

      this.isSaving = false;
      console.log(`[DEBUG draftStore] saveDraft failed, total time: ${(performance.now() - startTime).toFixed(2)}ms`);
      return { success: false, error: result.error };
    } catch (error) {
      console.error("[DEBUG draftStore] Error saving draft to Firebase:", error);
      this.isSaving = false;
      return { success: false, error: error.message };
    }
  },

  async loadDraft(applicationId) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'draftStore.js:57', message: 'loadDraft entry', data: { applicationId, currentAppId: this.currentApplicationId, currentDraftKeys: Object.keys(this.draft || {}) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      this.isLoading = true;

      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for draft load');
        this.isLoading = false;
        return {};
      }

      const data = await db.loadDraft(appId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'draftStore.js:68', message: 'After db.loadDraft', data: { hasData: !!data, dataKeys: Object.keys(data || {}), hasTemporaryWorkDetails: !!data?.temporary_work_details, temporaryWorkDetailsKeys: Object.keys(data?.temporary_work_details || {}), birth_day: data?.temporary_work_details?.birth_day, marital_status: data?.temporary_work_details?.marital_status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      this.draft = data || {};

      // Restore visaContext from persisted draft data
      if (this.draft.visaContext) {
        this.visaContext = this.draft.visaContext;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'draftStore.js:69', message: 'After setting this.draft', data: { draftKeys: Object.keys(this.draft || {}), hasTemporaryWorkDetails: !!this.draft?.temporary_work_details, birth_day: this.draft?.temporary_work_details?.birth_day, marital_status: this.draft?.temporary_work_details?.marital_status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion

      // Load completion status
      const completionData = await db.loadCompletionStatus(appId);

      // If there is no draft data, clear any stale completion status
      if (!this.draft || Object.keys(this.draft).length === 0) {
        this.completionStatus = {};
        // Persist the cleared status so the UI does not show completed steps
        await db.saveCompletionStatus({}, appId);
      } else {
        this.completionStatus = completionData || {};
      }

      // Load prefill setting
      const prefill = await db.getPrefill();
      this.shouldPrefill = prefill;

      this.isLoading = false;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/519dbf1a-c78f-43ac-bfdc-ba79f1bb9226', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'draftStore.js:88', message: 'loadDraft exit', data: { returnDraftKeys: Object.keys(this.draft || {}), hasTemporaryWorkDetails: !!this.draft?.temporary_work_details, birth_day: this.draft?.temporary_work_details?.birth_day, marital_status: this.draft?.temporary_work_details?.marital_status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      return this.draft;
    } catch (error) {
      console.error("Error loading draft:", error);
      this.isLoading = false;
      return {};
    }
  },

  async clearDraft(applicationId) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for draft clear');
        return { success: false, error: 'Application ID required' };
      }

      await db.clearDraft(appId);
      // Immutable update - replace with new empty object
      this.draft = {};
      this.lastSaved = null;
      return { success: true };
    } catch (error) {
      console.error("Error clearing draft:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Copy questionnaire answers from another application into the current one.
   * The target application's profile list is authoritative: source applicants are matched by
   * Zoho dependent id first, then normalized name + DOB, and only matched people are copied.
   * Completion status is intentionally not copied.
   */
  async importQuestionnaireFromApplication(sourceApplicationId, options = {}) {
    const targetId = this.currentApplicationId;
    if (!targetId) {
      return { success: false, error: 'No application selected' };
    }
    const targetVisaContext = options.targetVisaContext ?? this.visaContext ?? this.draft?.visaContext;
    if (targetVisaContext !== '186') {
      return { success: false, error: 'Import is only available for Employer Nomination (subclass 186) applications' };
    }
    if (!sourceApplicationId || sourceApplicationId === targetId) {
      return { success: false, error: 'Choose a different application to import from' };
    }

    const targetProfiles = Array.isArray(options.targetProfiles)
      ? options.targetProfiles
      : (this.draft?.profiles || []);
    if (targetProfiles.length === 0) {
      return { success: false, error: 'Add the applicants included in this application before importing answers' };
    }

    try {
      const sourceData = await db.loadDraft(sourceApplicationId);
      if (!sourceData || Object.keys(sourceData).length === 0) {
        return { success: false, error: 'The selected application has no saved questionnaire data' };
      }

      const sourceProfiles = getImportableSourceProfiles(sourceData);
      if (sourceProfiles.length === 0) {
        return { success: false, error: 'The selected application has no importable applicant data' };
      }

      const matchSummary = buildProfileImportMatches(sourceProfiles, targetProfiles);
      const applicantRemap = buildApplicantRemap(matchSummary.matchedApplicants);
      const candidateDraft = cloneDraftValue(this.draft) || {};
      candidateDraft.profiles = cloneDraftValue(
        Array.isArray(this.draft?.profiles) && this.draft.profiles.length > 0
          ? this.draft.profiles
          : targetProfiles
      ) || [];
      candidateDraft.visaContext = '186';

      const copiedProfileSections = copyMatchedProfileSections(sourceData, candidateDraft, matchSummary.matchedApplicants);
      const copiedSharedSections = copySharedTemporaryWorkSections(sourceData, candidateDraft, applicantRemap);

      const summary = {
        matchedApplicants: matchSummary.matchedApplicants.map((match) => ({
          sourceName: match.sourceName,
          targetName: match.targetName,
          sourceRelationship: match.sourceRelationship,
          targetRelationship: match.targetRelationship,
        })),
        skippedSourceApplicants: matchSummary.skippedSourceApplicants,
        unmatchedTargetApplicants: matchSummary.unmatchedTargetApplicants,
        copiedSections: copiedProfileSections,
        copiedSharedSections,
      };

      const previousDraft = cloneDraftValue(this.draft);
      const previousVisaContext = this.visaContext;
      this.visaContext = '186';
      this.draft = candidateDraft;
      this.isSaving = true;
      const result = await db.saveDraft(this.draft, targetId);
      this.isSaving = false;
      if (!result.success) {
        this.draft = previousDraft;
        this.visaContext = previousVisaContext;
        return { success: false, error: result.error || 'Failed to save imported data' };
      }
      this.lastSaved = new Date().toISOString();
      return { success: true, summary };
    } catch (error) {
      this.isSaving = false;
      console.error('importQuestionnaireFromApplication:', error);
      return { success: false, error: error.message };
    }
  },

  async importQuestionnaireFrom482Application(sourceApplicationId) {
    return this.importQuestionnaireFromApplication(sourceApplicationId, {
      targetProfiles: this.draft?.profiles || [],
      targetVisaContext: '186',
    });
  },

  async setPrefill(value) {
    try {
      await db.setPrefill(value);
      this.shouldPrefill = value;
    } catch (error) {
      console.error("Error setting prefill:", error);
    }
  },

  updateField(path, value) {
    // Create a deep copy to avoid in-place mutation
    const newDraft = JSON.parse(JSON.stringify(this.draft));

    // Update nested field using path notation (e.g., "details.firstName")
    const keys = path.split('.');
    let obj = newDraft;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;

    // Replace draft object entirely (triggers Valtio reactivity)
    this.draft = newDraft;
  },

  // Helper: Set nested value using dot notation path
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  },

  // Helper: Get nested value using dot notation path
  getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }

    return current;
  },

  // Save data to a specific section (e.g., 'mainApplicant.details')
  // Follows save-first semantics: persist to DB, then update local state only on success.
  async saveSectionData(section, data, applicationId) {
    try {
      this.isSaving = true;

      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for section save');
        this.isSaving = false;
        return { success: false, error: 'Application ID required' };
      }

      // Build candidate draft WITHOUT mutating `this.draft` yet
      const candidateDraft = JSON.parse(JSON.stringify(this.draft));

      // Set the section data using nested path
      this.setNestedValue(candidateDraft, section, data);

      // Persist first — only touch local state after confirmed success
      const result = await db.saveDraft(candidateDraft, appId);

      if (result.success) {
        this.draft = candidateDraft;
        this.lastSaved = new Date().toISOString();
        this.isSaving = false;
        return { success: true };
      }

      // Save failed — do NOT update this.draft
      this.isSaving = false;
      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error saving section data:", error);
      this.isSaving = false;
      return { success: false, error: error.message };
    }
  },

  // Get data from a specific section
  getSectionData(section) {
    return this.getNestedValue(this.draft, section) || {};
  },

  async persistCompletionPercentage(applicationId) {
    const appId = applicationId || this.currentApplicationId;
    if (!appId) {
      return { success: false, error: "Application ID required" };
    }

    const { percentage } = this.getCompletionPercentage();
    this.completionStatus = {
      ...this.completionStatus,
      completionPercentage: percentage,
    };

    return db.saveCompletionStatus(this.completionStatus, appId);
  },

  // Mark a page as complete
  async markPageComplete(pageKey, applicationId, sectionKeyToCheck = null) {
    console.log(`[DEBUG draftStore] markPageComplete called for: ${pageKey}`);
    const startTime = performance.now();

    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('[DEBUG draftStore] No application ID set for marking page complete');
        return { success: false };
      }
      console.log(`[DEBUG draftStore] App ID: ${appId}`);

      // Validation: Check if section has meaningful data
      // If a specific section key is provided, use it. Otherwise try to guess.
      if (sectionKeyToCheck !== false) {
        const sectionKey = sectionKeyToCheck || this.getSectionKeyFromPageKey(pageKey);
        const sectionData = this.getSectionData(sectionKey);
        console.log(`[DEBUG draftStore] Checking section data for key: ${sectionKey}`);

        // Check if section has meaningful data
        const hasData = Object.values(sectionData).some(value => {
          if (typeof value === 'string') return value.trim() !== '';
          if (typeof value === 'boolean') return true;
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
          return value !== null && value !== undefined;
        });

        if (!hasData) {
          console.warn(`[DEBUG draftStore] Cannot mark ${pageKey} as complete - no data inside section (${sectionKey})`);
          return { success: false, error: 'No data to save' };
        }
        console.log(`[DEBUG draftStore] Section has data, proceeding...`);
      }

      // Update completion status
      console.log(`[DEBUG draftStore] Updating local completion status...`);
      this.completionStatus = { ...this.completionStatus, [pageKey]: true };

      // Save to Firebase
      console.log(`[DEBUG draftStore] Saving completion status to database...`);
      const dbStartTime = performance.now();
      await this.persistCompletionPercentage(appId);
      const dbEndTime = performance.now();
      console.log(`[DEBUG draftStore] Database save completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`);

      console.log(`[DEBUG draftStore] markPageComplete total time: ${(performance.now() - startTime).toFixed(2)}ms`);
      return { success: true };
    } catch (error) {
      console.error("[DEBUG draftStore] Error marking page complete:", error);
      return { success: false, error: error.message };
    }
  },

  // Helper to map page key to section key
  getSectionKeyFromPageKey(pageKey) {
    // Map completion keys to section keys
    // e.g., "temporary-work/main-applicant/details" -> "temporary_work_details"
    const parts = pageKey.split('/');
    return parts.join('_').replace(/-/g, '_');
  },

  // Clear all completion status
  async clearCompletionStatus(applicationId) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for clearing completion status');
        return { success: false };
      }

      this.completionStatus = {};
      await this.persistCompletionPercentage(appId);

      return { success: true };
    } catch (error) {
      console.error("Error clearing completion status:", error);
      return { success: false, error: error.message };
    }
  },

  // Mark a page as incomplete
  async markPageIncomplete(pageKey, applicationId) {
    try {
      const appId = applicationId || this.currentApplicationId;
      if (!appId) {
        console.warn('No application ID set for marking page incomplete');
        return { success: false };
      }

      // Update completion status
      this.completionStatus = { ...this.completionStatus, [pageKey]: false };

      // Save to Firebase
      await this.persistCompletionPercentage(appId);

      return { success: true };
    } catch (error) {
      console.error("Error marking page incomplete:", error);
      return { success: false, error: error.message };
    }
  },

  // Check if a page is complete
  isPageComplete(pageKey) {
    return this.completionStatus[pageKey] === true;
  },

  // Get completion percentage
  getCompletionPercentage() {
    // Auto-detect visa type from existing completion keys
    let visaType = null;
    const completionKeys = getCompletionPageKeys(this.completionStatus);

    if (completionKeys.length > 0) {
      // Check for visa type prefix in existing keys
      const firstKey = completionKeys[0];
      if (firstKey.startsWith('temporary-work/')) {
        visaType = 'temporary-work';
      } else if (firstKey.startsWith('partner/')) {
        visaType = 'partner';
      } else if (firstKey.startsWith('protection/')) {
        visaType = 'protection';
      }
    }

    if (!visaType && (this.draft?.visaContext || Object.keys(this.draft || {}).some((k) => k.startsWith('temporary_work_')))) {
      visaType = 'temporary-work';
    }

    // If no visa type detected, return empty
    if (!visaType) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const visaContextForRoutes =
      visaType === 'temporary-work' ? (this.visaContext ?? this.draft?.visaContext ?? null) : null;

    if (visaType === 'temporary-work') {
      const completionKeys = getAllRoutes("temporary-work", visaContextForRoutes)
        .map((route) => getCompletionKeyFromTemporaryWorkRoute(route))
        .filter(Boolean);
      const uniqueCompletionKeys = [...new Set(completionKeys)];
      const completedCount = uniqueCompletionKeys.filter(
        (key) => isCompletionKeyComplete(this.completionStatus, key)
      ).length;
      const totalPages = uniqueCompletionKeys.length;

      return {
        completed: completedCount,
        total: totalPages,
        percentage: totalPages > 0 ? Math.round((completedCount / totalPages) * 100) : 0
      };
    }

    // Get routes for the detected visa type (186 vs 482 order for temporary-work)
    const routes = getIntakeRoutes(visaType, visaContextForRoutes);

    // Extract all page paths from routes (excluding submit page)
    const allPagePaths = [];
    routes.forEach((route) => {
      // Skip submit page
      if (route.href.includes('/submit')) {
        return;
      }

      if (route.subpages) {
        // Add all subpages
        route.subpages.forEach((sub) => {
          allPagePaths.push(sub.href);
        });
      } else {
        // Add main route
        allPagePaths.push(route.href);
      }
    });

    // Convert paths to completion keys format
    // e.g., "/intake/protection/main-applicant/details" -> "protection/main-applicant/details"
    const allPages = allPagePaths.map(path => {
      // Remove "/intake/" prefix and visa type prefix
      const pathWithoutPrefix = path.replace(`/intake/${visaType}/`, '');
      return `${visaType}/${pathWithoutPrefix}`;
    });

    // Count completed pages
    const completedCount = allPages.filter(page => this.isPageComplete(page)).length;
    const totalPages = allPages.length;

    return {
      completed: completedCount,
      total: totalPages,
      percentage: totalPages > 0 ? Math.round((completedCount / totalPages) * 100) : 0
    };
  },
  // ─── Dependent Selection Helpers ───────────────────────────────────────────

  /** Get selected dependent IDs for the current application */
  getSelectedDependentIds() {
    return this.draft?.selectedDependentIds || [];
  },

  /** Get excluded dependent IDs for the current application */
  getExcludedDependentIds() {
    return this.draft?.excludedDependentIds || [];
  },

  /** Save dependent selection (selected + excluded IDs) to draft and persist */
  async saveDependentSelection(selectedIds, excludedIds) {
    const newDraft = {
      ...this.draft,
      selectedDependentIds: Array.isArray(selectedIds) ? selectedIds : [],
      excludedDependentIds: Array.isArray(excludedIds) ? excludedIds : [],
    };
    this.draft = newDraft;
    if (this.currentApplicationId) {
      await db.saveDraft(this.draft, this.currentApplicationId);
    }
  },

  // ─── End Dependent Selection Helpers ───────────────────────────────────────

  // Debounced auto‑save for form changes (native implementation)
  autoSaveDebounced: (function() {
    // Simple debounce implementation using setTimeout
    const debounceFn = (fn, wait) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
      };
    };
    // 500ms debounce interval
    const saveFn = debounceFn(async (profileId, sectionKey, data) => {
      await draftStore.saveProfileSectionData(profileId, sectionKey, data);
    }, 500);
    return (profileId, sectionKey, data) => {
      if (!profileId || !sectionKey) return;
      saveFn(profileId, sectionKey, data);
    };
  })(),
});
// Register the profiles getter to break circular dependency with routes.js
setProfilesGetter(() => draftStore.draft?.profiles || []);
// Register the non-migrating members getter to include them in linear navigation flow
setNonMigratingMembersGetter(() => draftStore.draft?.non_migrating_members || []);
