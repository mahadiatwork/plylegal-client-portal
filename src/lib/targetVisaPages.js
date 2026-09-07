import {
  getIntakeRoutes,
  NON_MIGRATING_MEMBER_SUBPAGES,
  PARTNER_CHILD_PROFILE_SUBPAGES,
  PARTNER_MAIN_APPLICANT_PROFILE_SUBPAGES,
  PARTNER_SPOUSE_PROFILE_SUBPAGES,
  PROTECTION_CHILD_PROFILE_SUBPAGES,
  PROTECTION_MAIN_APPLICANT_PROFILE_SUBPAGES,
  PROTECTION_SPOUSE_PROFILE_SUBPAGES,
} from "./routes.js";

const ROLE_LABELS = { main_applicant: "Main Applicant", spouse: "Spouse/Partner", child: "Child" };

// Keep completion and review scoped to the people actually included in this matter.
// The static route list also contains old children-index and absent-spouse routes.
export function getTargetVisaPages(visaType, draft = {}) {
  if (!["partner", "protection"].includes(visaType)) return [];
  const pages = [];
  const add = (href, title, extra = {}) => {
    const key = href.replace("/intake/", "");
    pages.push({ href, title, key: extra.profileId ? `${key}__${extra.profileId}` : key, ...extra });
  };
  add(`/intake/${visaType}/start`, "Getting Started");
  add(`/intake/${visaType}/profile`, "Included Applicants");
  const partner = visaType === "partner";
  const mainPages = partner ? PARTNER_MAIN_APPLICANT_PROFILE_SUBPAGES : PROTECTION_MAIN_APPLICANT_PROFILE_SUBPAGES;
  const spousePages = partner ? PARTNER_SPOUSE_PROFILE_SUBPAGES : PROTECTION_SPOUSE_PROFILE_SUBPAGES;
  const childPages = partner ? PARTNER_CHILD_PROFILE_SUBPAGES : PROTECTION_CHILD_PROFILE_SUBPAGES;
  const order = { main_applicant: 0, spouse: 1, child: 2 };
  const profiles = [...(draft.profiles || [])].sort((a, b) => (order[a.relationship] ?? 3) - (order[b.relationship] ?? 3));
  const hasProfiles = profiles.length > 0;
  const applicants = hasProfiles ? profiles : [{ relationship: "main_applicant" }];

  applicants.forEach((profile) => {
    const role = profile.relationship;
    if (!ROLE_LABELS[role] || (role === "child" && !profile.id)) return;
    const name = [profile.given_names, profile.family_name].filter(Boolean).join(" ");
    const label = `${ROLE_LABELS[role]}${name ? ` (${name})` : ""}`;
    const subpages = role === "child" ? childPages : role === "spouse" ? spousePages : mainPages;
    subpages.forEach((sub) => {
      const href = sub.href || `/intake/${visaType}/children/${profile.id}/${sub.pathSuffix}`;
      add(href, `${label}: ${sub.title}`, {
        profileId: profile.id, profile, section: sub.pathSuffix || href.split("/").pop(),
        allowLegacyCompletion: role === "child" || applicants.filter((person) => person.relationship === role).length === 1,
      });
    });
    if (role === "main_applicant") {
      add(`/intake/${visaType}/non-migrating`, "Other Family");
      (draft.non_migrating_members || []).forEach((member) => {
        if (!member.id) return;
        const memberName = [member.passport?.given_names, member.passport?.family_name].filter(Boolean).join(" ") || "Unnamed Member";
        NON_MIGRATING_MEMBER_SUBPAGES.forEach((sub) => {
          add(`/intake/${visaType}/non-migrating/${member.id}/${sub.pathSuffix}`, `Other Family (${memberName}): ${sub.title}`, {
            profileId: member.id, member, section: sub.pathSuffix,
          });
        });
      });
    }
  });

  getIntakeRoutes(visaType).filter((section) => ["Family Sponsor", "Relationships", "Employment", "All Applicants"].includes(section.title)).forEach((section) => {
    (section.subpages || [section]).forEach((sub) => add(sub.href, sub === section ? section.title : `${section.title}: ${sub.title}`));
  });
  return pages;
}

export function isTargetVisaPageComplete(page, completion = {}) {
  if (Object.prototype.hasOwnProperty.call(completion, page.key)) return completion[page.key] === true;
  // Legacy forms saved an unsuffixed key. Never let that override an explicit
  // incomplete per-person key after the applicant edits an answer.
  return page.allowLegacyCompletion !== false && completion[page.href.replace("/intake/", "")] === true;
}

export function getTargetVisaProgress(visaType, draft, completion) {
  const pages = getTargetVisaPages(visaType, draft);
  const completed = pages.filter((page) => isTargetVisaPageComplete(page, completion)).length;
  return { completed, total: pages.length, percentage: pages.length ? Math.round(completed / pages.length * 100) : 0 };
}
