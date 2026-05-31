import {
  EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES,
  NON_MIGRATING_MEMBER_SUBPAGES,
  PROFILE_SUBPAGES,
  TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES,
  TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES,
  getIntakeRoutes,
} from "@/lib/routes";

function getProfileDisplayName(profile) {
  const rawName = `${profile?.given_names || ""} ${profile?.family_name || ""}`.trim();
  const name = rawName || "Unnamed";
  const relationship = profile?.relationship;

  if (relationship === "main_applicant") return `Main Applicant (${name})`;
  if (relationship === "spouse") return `Spouse/Partner (${name})`;
  if (relationship === "child") return `Child (${name})`;
  return `Dependent (${name})`;
}

function normalizeKeyFromPath(path, visaType) {
  return path.replace(`/intake/${visaType}/`, `${visaType}/`);
}

function getSortedProfiles(profiles) {
  const order = {
    main_applicant: 0,
    spouse: 1,
    child: 2,
    other: 3,
  };

  return [...profiles].sort(
    (a, b) => (order[a?.relationship] ?? 4) - (order[b?.relationship] ?? 4)
  );
}

export function getIncompleteChecklist({
  visaType,
  visaContext = null,
  completionStatus = {},
  draft = {},
}) {
  const completion = completionStatus || {};
  const items = [];

  const addIncomplete = (key, label) => {
    if (!key || !label) return;
    if (completion[key] === true) return;
    items.push(label);
  };

  if (visaType !== "temporary-work") {
    const routes = getIntakeRoutes(visaType, visaContext);

    routes.forEach((route) => {
      if (route.href.includes("/submit")) return;

      if (route.subpages?.length) {
        route.subpages.forEach((subpage) => {
          const key = normalizeKeyFromPath(subpage.href, visaType);
          addIncomplete(key, `${route.title}: ${subpage.title}`);
        });
        return;
      }

      const key = normalizeKeyFromPath(route.href, visaType);
      addIncomplete(key, route.title);
    });

    return items;
  }

  addIncomplete("temporary-work/start", "Getting Started");
  addIncomplete("temporary-work/profile", "Included Applicants");

  const profiles = getSortedProfiles(draft?.profiles || []);

  profiles.forEach((profile) => {
    const profileId = profile?.id;
    if (!profileId) return;

    const profileLabel = getProfileDisplayName(profile);

    if (profile.relationship === "child") {
      TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.forEach((subpage) => {
        const key = `temporary-work/children/${profileId}/${subpage.pathSuffix}__${profileId}`;
        addIncomplete(key, `${profileLabel}: ${subpage.title}`);
      });
      return;
    }

    const subpages =
      profile.relationship === "spouse"
        ? visaContext === "186"
          ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES
          : TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES
        : PROFILE_SUBPAGES;

    subpages.forEach((subpage) => {
      const suffix = subpage.href.split(/\/(?:main-applicant|spouse-partner)\//)[1];
      const routePrefix = profile.relationship === "spouse" ? "spouse-partner" : "main-applicant";
      const key = `temporary-work/${routePrefix}/${suffix}__${profileId}`;

      addIncomplete(key, `${profileLabel}: ${subpage.title}`);

      if (
        visaContext === "186" &&
        profile.relationship === "main_applicant" &&
        subpage.title === "Contact Details"
      ) {
        addIncomplete("temporary-work/non-migrating", "Other Family");
      }
    });
  });

  if (visaContext === "186") {
    (draft?.non_migrating_members || []).forEach((member) => {
      const memberId = member?.id;
      if (!memberId) return;

      const name = [member?.passport?.given_names, member?.passport?.family_name]
        .filter(Boolean)
        .join(" ")
        .trim() || "Unnamed Member";

      NON_MIGRATING_MEMBER_SUBPAGES.forEach((subpage) => {
        const key = `temporary-work/non-migrating/${memberId}/${subpage.pathSuffix}__${memberId}`;
        addIncomplete(key, `Other Family (${name}): ${subpage.title}`);
      });
    });
  }

  const allApplicantsRoute = getIntakeRoutes("temporary-work", visaContext).find(
    (route) => route.title === "All Applicants"
  );

  allApplicantsRoute?.subpages?.forEach((subpage) => {
    const key = normalizeKeyFromPath(subpage.href, "temporary-work");
    addIncomplete(key, `All Applicants: ${subpage.title}`);
  });

  return items;
}
