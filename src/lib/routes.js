// Partner Visa Routes
export const PARTNER_VISA_ROUTES = [
  { href: "/intake/partner/start", title: "Getting Started" },
  {
    href: "/intake/partner/main-applicant/details",
    title: "Main Applicant",
    subpages: [
      { href: "/intake/partner/main-applicant/details", title: "Details" },
      { href: "/intake/partner/main-applicant/other", title: "Other Names" },
      { href: "/intake/partner/main-applicant/identity", title: "Identity" },
      { href: "/intake/partner/main-applicant/employment", title: "Employment" },
      { href: "/intake/partner/main-applicant/education", title: "Education" },
      { href: "/intake/partner/main-applicant/language", title: "Language" },
      { href: "/intake/partner/main-applicant/family", title: "Family" },
    ],
  },
  {
    href: "/intake/partner/spouse-partner/details",
    title: "Spouse/Partner",
    subpages: [
      { href: "/intake/partner/spouse-partner/details", title: "Details" },
    ],
  },
  { href: "/intake/partner/children/start", title: "Children" },
  {
    href: "/intake/partner/family-sponsor/details",
    title: "Family Sponsor",
    subpages: [
      { href: "/intake/partner/family-sponsor/details", title: "Details" },
      { href: "/intake/partner/family-sponsor/other", title: "Other" },
      { href: "/intake/partner/family-sponsor/identity", title: "Identity" },
      { href: "/intake/partner/family-sponsor/family", title: "Family" },
      { href: "/intake/partner/family-sponsor/circumstances", title: "Circumstances" },
      { href: "/intake/partner/family-sponsor/addresses", title: "Addresses" },
      { href: "/intake/partner/family-sponsor/contact", title: "Contact Details" },
      { href: "/intake/partner/family-sponsor/previous-sponsorship", title: "Previous Sponsorships" },
      { href: "/intake/partner/family-sponsor/travel", title: "Travel" },
      { href: "/intake/partner/family-sponsor/character", title: "Character" },
    ],
  },
  {
    href: "/intake/partner/relationships/current-relationship",
    title: "Relationships",
    subpages: [
      { href: "/intake/partner/relationships/current-relationship", title: "Current Relationship" },
      { href: "/intake/partner/relationships/relationship-details", title: "Relationship Details" },
      { href: "/intake/partner/relationships/previous-relationships", title: "Previous Relationships" },
      { href: "/intake/partner/relationships/supporting-witnesses", title: "Supporting Witnesses" },
    ],
  },
  { href: "/intake/partner/family", title: "Family" },
  {
    href: "/intake/partner/all-applicants/addresses",
    title: "All Applicants",
    subpages: [
      { href: "/intake/partner/all-applicants/addresses", title: "Addresses" },
      { href: "/intake/partner/all-applicants/contact-details", title: "Contact Details" },
      { href: "/intake/partner/all-applicants/visas", title: "Visas" },
      { href: "/intake/partner/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/partner/all-applicants/future-travel", title: "Future Travel" },
      { href: "/intake/partner/all-applicants/future-addresses", title: "Future Addresses" },
      { href: "/intake/partner/all-applicants/health", title: "Health" },
      { href: "/intake/partner/all-applicants/character", title: "Character" },
      { href: "/intake/partner/all-applicants/contacts", title: "Contacts" },
    ],
  },
  { href: "/intake/partner/submit", title: "Submit" },
];

// Protection Visa Routes
export const PROTECTION_VISA_ROUTES = [
  { href: "/intake/protection/start", title: "Getting Started" },
  {
    href: "/intake/protection/main-applicant/details",
    title: "Main Applicant",
    subpages: [
      { href: "/intake/protection/main-applicant/details", title: "Details" },
      { href: "/intake/protection/main-applicant/other", title: "Other" },
      { href: "/intake/protection/main-applicant/identity", title: "Identity" },
      { href: "/intake/protection/main-applicant/employment", title: "Employment" },
      { href: "/intake/protection/main-applicant/education", title: "Education" },
      { href: "/intake/protection/main-applicant/family", title: "Family" },
    ],
  },
  {
    href: "/intake/protection/spouse-partner/details",
    title: "Spouse/Partner",
    subpages: [
      { href: "/intake/protection/spouse-partner/details", title: "Details" },
      { href: "/intake/protection/spouse-partner/other-details", title: "Other Details" },
      { href: "/intake/protection/spouse-partner/identity", title: "Identity" },
    ],
  },
  { href: "/intake/protection/children", title: "Children" },
  { href: "/intake/protection/employment", title: "Employment" },
  {
    href: "/intake/protection/all-applicants/addresses",
    title: "All Applicants",
    subpages: [
      { href: "/intake/protection/all-applicants/addresses", title: "Addresses" },
      { href: "/intake/protection/all-applicants/contact-details", title: "Contact Details" },
      { href: "/intake/protection/all-applicants/visas", title: "Visas" },
      { href: "/intake/protection/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/protection/all-applicants/future-travel", title: "Future Travel" },
      { href: "/intake/protection/all-applicants/future-addresses", title: "Future Addresses" },
      { href: "/intake/protection/all-applicants/character", title: "Character" },
      { href: "/intake/protection/all-applicants/contacts", title: "Contacts" },
    ],
  },
  { href: "/intake/protection/submit", title: "Submit" },
];

// Skills in Demand (subclass 482) — intake routes under /intake/temporary-work/
export const TEMPORARY_WORK_VISA_ROUTES = [
  { href: "/intake/temporary-work/start", title: "Getting Started" },
  { href: "/intake/temporary-work/profile", title: "Included Applicants" },
  {
    href: "/intake/temporary-work/main-applicant/details",
    title: "Main Applicant",
    subpages: [
      { href: "/intake/temporary-work/main-applicant/details", title: "Details" },
      { href: "/intake/temporary-work/main-applicant/other", title: "Other Names" },
      { href: "/intake/temporary-work/main-applicant/identity", title: "Identity" },
      { href: "/intake/temporary-work/main-applicant/contact-details", title: "Contact Details" },
      { href: "/intake/temporary-work/main-applicant/employment", title: "Employment" },
      { href: "/intake/temporary-work/main-applicant/education", title: "Education" },
      { href: "/intake/temporary-work/main-applicant/skills", title: "Skills" },
      { href: "/intake/temporary-work/main-applicant/language", title: "Language" },
    ],
  },
  {
    href: "/intake/temporary-work/spouse-partner/details",
    title: "Spouse/Partner",
    subpages: [
      { href: "/intake/temporary-work/spouse-partner/details", title: "Details" },
      { href: "/intake/temporary-work/spouse-partner/identity", title: "Identity" },
    ],
  },
  // { href: "/intake/temporary-work/children", title: "Children" },
  // { href: "/intake/temporary-work/relationships", title: "Relationships" },
  {
    href: "/intake/temporary-work/all-applicants/visas",
    title: "All Applicants",
    subpages: [
      { href: "/intake/temporary-work/all-applicants/visas", title: "Visas" },
      { href: "/intake/temporary-work/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/temporary-work/all-applicants/countries-of-residence", title: "Countries of Residence" },
      { href: "/intake/temporary-work/all-applicants/health", title: "Health" },
      { href: "/intake/temporary-work/all-applicants/character", title: "Character" },
    ],
  },
  { href: "/intake/temporary-work/submit", title: "Submit" },
];

// Employer Nomination Visa (subclass 186) — same pages, but spouse gets Education + Language
export const EMPLOYER_NOMINATION_ROUTES = [
  { href: "/intake/temporary-work/start", title: "Getting Started" },
  { href: "/intake/temporary-work/profile", title: "Included Applicants" },
  {
    href: "/intake/temporary-work/main-applicant/details",
    title: "Main Applicant",
    subpages: [
      { href: "/intake/temporary-work/main-applicant/details", title: "Details" },
      { href: "/intake/temporary-work/main-applicant/other", title: "Other Names" },
      { href: "/intake/temporary-work/main-applicant/identity", title: "Identity" },
      { href: "/intake/temporary-work/main-applicant/contact-details", title: "Contact Details" },
      { href: "/intake/temporary-work/main-applicant/employment", title: "Employment" },
      { href: "/intake/temporary-work/main-applicant/education", title: "Education" },
      { href: "/intake/temporary-work/main-applicant/skills", title: "Skills" },
      { href: "/intake/temporary-work/main-applicant/language", title: "Language" },
    ],
  },
  {
    href: "/intake/temporary-work/spouse-partner/details",
    title: "Spouse/Partner",
    subpages: [
      { href: "/intake/temporary-work/spouse-partner/details", title: "Details" },
      { href: "/intake/temporary-work/spouse-partner/identity", title: "Identity" },
      { href: "/intake/temporary-work/spouse-partner/education", title: "Education" },
      { href: "/intake/temporary-work/spouse-partner/language", title: "Language" },
    ],
  },
  // { href: "/intake/temporary-work/children", title: "Children" },
  {
    href: "/intake/temporary-work/all-applicants/visas",
    title: "All Applicants",
    subpages: [
      { href: "/intake/temporary-work/all-applicants/visas", title: "Visas" },
      { href: "/intake/temporary-work/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/temporary-work/all-applicants/countries-of-residence", title: "Countries of Residence" },
      { href: "/intake/temporary-work/all-applicants/health", title: "Health" },
      { href: "/intake/temporary-work/all-applicants/character", title: "Character" },
    ],
  },
  { href: "/intake/temporary-work/submit", title: "Submit" },
];

// Per-profile sub-pages (shared definition used by sidebar + routing)
export const PROFILE_SUBPAGES = [
  { href: "/intake/temporary-work/main-applicant/details", title: "Details" },
  { href: "/intake/temporary-work/main-applicant/other", title: "Other Names" },
  { href: "/intake/temporary-work/main-applicant/identity", title: "Identity" },
  { href: "/intake/temporary-work/main-applicant/contact-details", title: "Contact Details" },
  { href: "/intake/temporary-work/main-applicant/employment", title: "Employment" },
  { href: "/intake/temporary-work/main-applicant/education", title: "Education" },
  { href: "/intake/temporary-work/main-applicant/skills", title: "Skills" },
  { href: "/intake/temporary-work/main-applicant/language", title: "Language" },
];

/** Spouse/Partner — subclass 482 (Skills in Demand): Details + Other Names + Identity. */
export const TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES = [
  { href: "/intake/temporary-work/spouse-partner/details", title: "Details" },
  { href: "/intake/temporary-work/spouse-partner/other-details", title: "Other Names" },
  { href: "/intake/temporary-work/spouse-partner/identity", title: "Identity" },
];

// Per-profile sub-pages for 186 spouse (Education + Language in addition to the 482 spouse pages)
export const EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES = [
  { href: "/intake/temporary-work/spouse-partner/details", title: "Details" },
  { href: "/intake/temporary-work/spouse-partner/other-details", title: "Other Names" },
  { href: "/intake/temporary-work/spouse-partner/identity", title: "Identity" },
  { href: "/intake/temporary-work/spouse-partner/education", title: "Education" },
  { href: "/intake/temporary-work/spouse-partner/language", title: "Language" },
];

// Extract visa type from pathname
export function getVisaTypeFromPath(pathname) {
  const internalPathname = getInternalIntakeHref(pathname);
  if (internalPathname.includes('/intake/partner/')) return 'partner';
  if (internalPathname.includes('/intake/protection/')) return 'protection';
  if (internalPathname.includes('/intake/temporary-work/')) return 'temporary-work';
  return 'partner'; // default
}

// Get routes based on visa type and optional visa context (subclass)
export function getIntakeRoutes(visaType, visaContext) {
  switch (visaType) {
    case 'partner':
      return PARTNER_VISA_ROUTES;
    case 'protection':
      return PROTECTION_VISA_ROUTES;
    case 'temporary-work':
      if (visaContext === '186') return EMPLOYER_NOMINATION_ROUTES;
      return TEMPORARY_WORK_VISA_ROUTES;
    default:
      return PARTNER_VISA_ROUTES;
  }
}

// Legacy export for backward compatibility
export const INTAKE_ROUTES = PARTNER_VISA_ROUTES;

// Use late-bound getter for profiles to avoid circular dependency with draftStore
let profilesGetter = () => [];

/**
 * Register a function that returns the current profiles from the draft store.
 * This is called by draftStore.js to provide its data to route calculations
 * without creating a circular static import.
 */
export function setProfilesGetter(getter) {
  profilesGetter = getter;
}

// Use late-bound getter for non-migrating members to avoid circular dependency
let nonMigratingMembersGetter = () => [];

/**
 * Register a function that returns the current non-migrating members from the draft store.
 */
export function setNonMigratingMembersGetter(getter) {
  nonMigratingMembersGetter = getter;
}


export function getIntakeSlugFromPathname(pathname) {
  if (!pathname || typeof pathname !== "string") return null;
  const match = pathname.match(/^\/applications\/([^/]+)\/[^/]+\/intake(?:\/|$)/);
  return match?.[1] || null;
}

export function getApplicationIdFromPathname(pathname) {
  if (!pathname || typeof pathname !== "string") return null;
  const match = pathname.match(/^\/applications\/[^/]+\/([^/]+)\/intake(?:\/|$)/);
  return match?.[1] || null;
}

export function getInternalIntakeHref(href) {
  if (!href) return "";
  const [rawPath, queryStr] = String(href).split("?", 2);
  const match = rawPath.match(/^\/applications\/([^/]+)\/[^/]+\/intake(?:\/(.*))?$/);
  if (!match) return href;

  const slug = match[1];
  const rest = match[2] || "start";
  const prefix =
    slug === "186" || slug === "482"
      ? "/intake/temporary-work"
      : `/intake/${slug}`;
  return queryStr ? `${prefix}/${rest}?${queryStr}` : `${prefix}/${rest}`;
}

export function getIntakeSlugForContext(visaType, visaContext = null, explicitSlug = null) {
  if (explicitSlug) return explicitSlug;
  if (visaType === "temporary-work") return visaContext === "186" ? "186" : "482";
  return visaType || "partner";
}

function temporaryWorkPathname(href) {
  if (!href) return "";
  try {
    return getInternalIntakeHref(new URL(href, "http://localhost").pathname);
  } catch {
    return getInternalIntakeHref(String(href).split("?")[0]);
  }
}

/** Index of first `/intake/temporary-work/children/:childId/details` in the dynamic route list (-1 if none). */
function firstTemporaryWorkChildDetailsIndex(allRoutes) {
  return allRoutes.findIndex((r) => {
    const p = r.split("?")[0];
    return /\/intake\/temporary-work\/children\/[^/]+\/details$/.test(p);
  });
}

export function buildIntakeHref({ slug, appId, internalHref, profileId, visaType, visaContext }) {
  if (!internalHref) return internalHref;
  const [pathOnly, queryStr] = getInternalIntakeHref(internalHref).split("?", 2);
  const params = new URLSearchParams(queryStr || undefined);
  if (profileId) params.set("profileId", profileId);

  if (!appId) {
    const q = params.toString();
    return q ? `${pathOnly}?${q}` : pathOnly;
  }

  const effectiveVisaType = visaType || getVisaTypeFromPath(pathOnly);
  const effectiveSlug = getIntakeSlugForContext(effectiveVisaType, visaContext, slug);
  const prefix =
    effectiveSlug === "186" || effectiveSlug === "482"
      ? "/intake/temporary-work"
      : `/intake/${effectiveSlug}`;
  const rest = pathOnly.startsWith(`${prefix}/`)
    ? pathOnly.slice(prefix.length + 1)
    : pathOnly.replace(/^\/intake\/[^/]+\//, "");
  const q = params.toString();
  return `/applications/${effectiveSlug}/${encodeURIComponent(appId)}/intake/${rest}${q ? `?${q}` : ""}`;
}

/** Build intake URLs while preserving profile identity for dynamic applicant pages. */
function appendTemporaryWorkQueryParams(path, applicationId, slug = null, visaContext = null) {
  if (!path) return path;
  const [pathOnly, queryStr] = getInternalIntakeHref(path).includes("?")
    ? getInternalIntakeHref(path).split("?", 2)
    : [getInternalIntakeHref(path), ""];
  const params = new URLSearchParams(queryStr || undefined);
  const childMatch = pathOnly.match(/^\/intake\/temporary-work\/children\/([^/]+)\/(?:details|other|identity|custody)$/);
  if (childMatch?.[1]) params.set("profileId", childMatch[1]);
  return buildIntakeHref({
    slug,
    appId: applicationId,
    internalHref: `${pathOnly}${params.toString() ? `?${params.toString()}` : ""}`,
    visaContext,
  });
}

export function getDynamicTemporaryWorkRoutes(visaContext) {
  const allRoutes = [];
  allRoutes.push("/intake/temporary-work/start");
  allRoutes.push("/intake/temporary-work/profile");

  const profiles = profilesGetter();
  const sortedProfiles = [...profiles].sort((a, b) => {
    const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
    return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
  });

  sortedProfiles.forEach((profile) => {
    if (profile.relationship === "child") {
      return;
    }
    if (profile.relationship === "spouse" && visaContext === "186") {
      EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES.forEach((sub) => {
        allRoutes.push(`${sub.href}?profileId=${profile.id}`);
      });
    } else if (profile.relationship === "spouse") {
      TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES.forEach((sub) => {
        allRoutes.push(`${sub.href}?profileId=${profile.id}`);
      });
    } else if (profile.relationship === "main_applicant" && visaContext === "186") {
      // 186 main applicant: split subpages around Other Family
      const beforeOtherFamily = PROFILE_SUBPAGES.slice(0, 4); // details, other, identity, contact-details
      const afterOtherFamily = PROFILE_SUBPAGES.slice(4); // employment, education, skills, language

      beforeOtherFamily.forEach((sub) => {
        allRoutes.push(`${sub.href}?profileId=${profile.id}`);
      });

      // Other Family index page
      allRoutes.push("/intake/temporary-work/non-migrating");

      // Non-migrating member subpages
      const nonMigratingMembers = nonMigratingMembersGetter();
      nonMigratingMembers.forEach((member) => {
        NON_MIGRATING_MEMBER_SUBPAGES.forEach((sub) => {
          allRoutes.push(buildNonMigratingHref(member.id, sub.pathSuffix));
        });
      });

      afterOtherFamily.forEach((sub) => {
        allRoutes.push(`${sub.href}?profileId=${profile.id}`);
      });
    } else {
      PROFILE_SUBPAGES.forEach((sub) => {
        allRoutes.push(`${sub.href}?profileId=${profile.id}`);
      });
    }
  });

  // Intentionally omit `/intake/temporary-work/children` from the linear flow: after spouse Identity,
  // Next goes straight to the first dependent child's Details. The Children list page remains
  // reachable from the sidebar; getNextRoute/getPreviousRoute/calculateProgress handle it explicitly.

  sortedProfiles
    .filter((p) => p.relationship === "child")
    .forEach((profile) => {
      TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.forEach((sub) => {
        allRoutes.push(`/intake/temporary-work/children/${profile.id}/${sub.pathSuffix}`);
      });
    });

  // Non-migrating members for 186 are now handled inline with the main applicant profile above.

  // Then static all-applicants sections
  const baseRoutes = visaContext === '186' ? EMPLOYER_NOMINATION_ROUTES : TEMPORARY_WORK_VISA_ROUTES;
  const allApplicants = baseRoutes.find(r => r.title === "All Applicants");
  if (allApplicants) {
    allApplicants.subpages.forEach(sub => allRoutes.push(sub.href));
  }
  allRoutes.push("/intake/temporary-work/submit");
  
  return allRoutes;
}

/**
 * @param {string|null|undefined} visaContext For temporary-work only: '186' uses employer-nomination route order; omit or '482' uses Skills in Demand (482) order.
 */
export function getAllRoutes(visaType, visaContext = null) {
  if (visaType === 'temporary-work') {
    return getDynamicTemporaryWorkRoutes(visaContext);
  }

  const routes = getIntakeRoutes(visaType, visaContext);
  const allRoutes = [];
  routes.forEach((route) => {
    if (route.subpages) {
      route.subpages.forEach((sub) => allRoutes.push(sub.href));
    } else {
      allRoutes.push(route.href);
    }
  });
  return allRoutes;
}

/**
 * @param {string|null|undefined} visaContext Pass draftStore.visaContext for Employer Nomination (186) so next step matches 186 sidebar.
 */
export function getNextRoute(currentHref, visaType, applicationId = null, visaContext = null, slug = null) {
  const allRoutes = getAllRoutes(visaType, visaContext);
  const internalCurrentHref = getInternalIntakeHref(currentHref);

  if (visaType === "temporary-work" && temporaryWorkPathname(internalCurrentHref) === "/intake/temporary-work/children") {
    const childIdx = firstTemporaryWorkChildDetailsIndex(allRoutes);
    if (childIdx !== -1) {
      return appendTemporaryWorkQueryParams(allRoutes[childIdx], applicationId, slug, visaContext);
    }
    const visasIdx = allRoutes.findIndex((r) => r.split("?")[0].includes("/all-applicants/visas"));
    if (visasIdx !== -1) {
      return appendTemporaryWorkQueryParams(allRoutes[visasIdx], applicationId, slug, visaContext);
    }
    return null;
  }

  let searchHref = internalCurrentHref;
  let currentProfileId = null;
  if (typeof window !== 'undefined') {
    currentProfileId = new URLSearchParams(window.location.search).get('profileId');
  }

  // Routes that embed IDs in the path have no query params in allRoutes
  if (visaType === 'temporary-work' && internalCurrentHref.includes('/children/')) {
    searchHref = internalCurrentHref.split('?')[0];
  } else if (visaType === 'temporary-work' && internalCurrentHref.includes('/non-migrating/')) {
    searchHref = internalCurrentHref.split('?')[0];
  } else if (visaType === 'temporary-work' && temporaryWorkPathname(internalCurrentHref) === "/intake/temporary-work/non-migrating") {
    searchHref = "/intake/temporary-work/non-migrating";
  } else if (visaType === 'temporary-work' && currentProfileId && (internalCurrentHref.includes('main-applicant') || internalCurrentHref.includes('spouse-partner'))) {
    const existingProfileId = new URLSearchParams(internalCurrentHref.split('?')[1] || '').get('profileId');
    if (!existingProfileId) {
      const separator = internalCurrentHref.includes('?') ? '&' : '?';
      searchHref = `${internalCurrentHref}${separator}profileId=${currentProfileId}`;
    }
  }

  const currentIndex = allRoutes.indexOf(searchHref);
  console.log("[ROUTES] getNextRoute searchHref:", searchHref, "currentIndex:", currentIndex, "allRoutes.length:", allRoutes.length);
  if (currentIndex === -1 || currentIndex === allRoutes.length - 1) {
    return null;
  }
  
  let nextRoute = allRoutes[currentIndex + 1];
  console.log("[ROUTES] nextRoute:", nextRoute);
  return appendTemporaryWorkQueryParams(nextRoute, applicationId, slug, visaContext);
}

export function getPreviousRoute(currentHref, visaType, applicationId = null, visaContext = null, slug = null) {
  const allRoutes = getAllRoutes(visaType, visaContext);
  const internalCurrentHref = getInternalIntakeHref(currentHref);

  if (visaType === "temporary-work" && temporaryWorkPathname(internalCurrentHref) === "/intake/temporary-work/children") {
    const childIdx = firstTemporaryWorkChildDetailsIndex(allRoutes);
    const visasIdx = allRoutes.findIndex((r) => r.split("?")[0].includes("/all-applicants/visas"));
    let previousRoute = null;
    if (childIdx > 0) {
      previousRoute = allRoutes[childIdx - 1];
    } else if (visasIdx > 0) {
      previousRoute = allRoutes[visasIdx - 1];
    }
    if (previousRoute) {
      return appendTemporaryWorkQueryParams(previousRoute, applicationId, slug, visaContext);
    }
    return null;
  }

  let searchHref = internalCurrentHref;
  let currentProfileId = null;
  if (typeof window !== 'undefined') {
    currentProfileId = new URLSearchParams(window.location.search).get('profileId');
  }

  // Routes that embed IDs in the path have no query params in allRoutes
  if (visaType === 'temporary-work' && internalCurrentHref.includes('/children/')) {
    searchHref = internalCurrentHref.split('?')[0];
  } else if (visaType === 'temporary-work' && internalCurrentHref.includes('/non-migrating/')) {
    searchHref = internalCurrentHref.split('?')[0];
  } else if (visaType === 'temporary-work' && temporaryWorkPathname(internalCurrentHref) === "/intake/temporary-work/non-migrating") {
    searchHref = "/intake/temporary-work/non-migrating";
  } else if (visaType === 'temporary-work' && currentProfileId && (internalCurrentHref.includes('main-applicant') || internalCurrentHref.includes('spouse-partner'))) {
    const existingProfileId = new URLSearchParams(internalCurrentHref.split('?')[1] || '').get('profileId');
    if (!existingProfileId) {
      const separator = internalCurrentHref.includes('?') ? '&' : '?';
      searchHref = `${internalCurrentHref}${separator}profileId=${currentProfileId}`;
    }
  }

  const currentIndex = allRoutes.indexOf(searchHref);
  if (currentIndex <= 0) {
    return null;
  }
  
  let previousRoute = allRoutes[currentIndex - 1];
  return appendTemporaryWorkQueryParams(previousRoute, applicationId, slug, visaContext);
}

export function calculateProgress(currentHref, visaType, visaContext = null) {
  const allRoutes = getAllRoutes(visaType, visaContext);
  
  const internalCurrentHref = getInternalIntakeHref(currentHref);
  let searchHref = internalCurrentHref;
  let currentProfileId = null;
  if (typeof window !== 'undefined') {
    currentProfileId = new URLSearchParams(window.location.search).get('profileId');
  }

  if (visaType === 'temporary-work' && currentProfileId && (internalCurrentHref.includes('main-applicant') || internalCurrentHref.includes('spouse-partner'))) {
    const existingProfileId = new URLSearchParams(internalCurrentHref.split('?')[1] || '').get('profileId');
    if (!existingProfileId) {
      const separator = internalCurrentHref.includes('?') ? '&' : '?';
      searchHref = `${internalCurrentHref}${separator}profileId=${currentProfileId}`;
    }
  }

  if (visaType === 'temporary-work' && internalCurrentHref.includes('/non-migrating/')) {
    searchHref = internalCurrentHref.split('?')[0];
  } else if (visaType === 'temporary-work' && temporaryWorkPathname(internalCurrentHref) === "/intake/temporary-work/non-migrating") {
    searchHref = "/intake/temporary-work/non-migrating";
  }

  if (visaType === "temporary-work" && temporaryWorkPathname(internalCurrentHref) === "/intake/temporary-work/children") {
    const childIdx = firstTemporaryWorkChildDetailsIndex(allRoutes);
    const visasIdx = allRoutes.findIndex((r) => r.split("?")[0].includes("/all-applicants/visas"));
    const virtualIndex = childIdx > 0 ? childIdx - 1 : (visasIdx > 0 ? visasIdx - 1 : 0);
    return Math.round(((virtualIndex + 1) / allRoutes.length) * 100);
  }

  const currentIndex = allRoutes.indexOf(searchHref);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / allRoutes.length) * 100);
}

/** Non-migrating family member subpages — shown in sidebar and included in 186 linear flow */
export const NON_MIGRATING_MEMBER_SUBPAGES = [
  { pathSuffix: "details",     title: "Details" },
  { pathSuffix: "passport",    title: "Passport" },
  { pathSuffix: "identity",    title: "Identity Documents" },
  { pathSuffix: "other-names", title: "Other Names" },
  { pathSuffix: "citizenship", title: "Citizenship" },
  { pathSuffix: "health",      title: "Health" },
];

export function buildNonMigratingHref(memberId, pathSuffix) {
  return `/intake/temporary-work/non-migrating/${memberId}/${pathSuffix}`;
}

/** Per dependent child under Application Profile — Skills in Demand (482) */
export const TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES = [
  { pathSuffix: "details", title: "Details" },
  { pathSuffix: "other", title: "Other Names" },
  { pathSuffix: "identity", title: "Identity" },
  { pathSuffix: "custody", title: "Custody" },
];

const TEMPORARY_WORK_CHILD_FLOW = ["details", "other", "identity", "custody"];

export function buildTemporaryWorkChildHref(childId, pathSuffix) {
  return `/intake/temporary-work/children/${childId}/${pathSuffix}`;
}

/** Completion key segment (before `__profileId`) */
export function getTemporaryWorkChildProfileCompletionKey(childId, pathSuffix) {
  return `temporary-work/children/${childId}/${pathSuffix}`;
}

function appendQueryParams(path, applicationId, profileId) {
  return buildIntakeHref({
    appId: applicationId,
    internalHref: path,
    profileId,
    visaType: "temporary-work",
    visaContext: draftStore.visaContext,
  });
}

export function getNextTemporaryWorkChildRoute(pathname, applicationId, childId) {
  const m = pathname.match(/\/children\/([^/]+)\/(details|identity|custody)/);
  const id = childId || m?.[1];
  const section = m?.[2];
  if (!id || !section) return null;
  const i = TEMPORARY_WORK_CHILD_FLOW.indexOf(section);
  if (i === -1 || i === TEMPORARY_WORK_CHILD_FLOW.length - 1) return null;
  const next = buildTemporaryWorkChildHref(id, TEMPORARY_WORK_CHILD_FLOW[i + 1]);
  return appendQueryParams(next, applicationId, id);
}

export function getPreviousTemporaryWorkChildRoute(pathname, applicationId, childId) {
  const m = pathname.match(/\/children\/([^/]+)\/(details|identity|custody)/);
  const id = childId || m?.[1];
  const section = m?.[2];
  if (!id || !section) return null;
  const i = TEMPORARY_WORK_CHILD_FLOW.indexOf(section);
  if (i <= 0) return null;
  const prev = buildTemporaryWorkChildHref(id, TEMPORARY_WORK_CHILD_FLOW[i - 1]);
  return appendQueryParams(prev, applicationId, id);
}

/** Previous step before the first child subsection (children list page). */
export function getTemporaryWorkChildrenListHref(applicationId) {
  const path = "/intake/temporary-work/children";
  return buildIntakeHref({
    appId: applicationId,
    internalHref: path,
    visaType: "temporary-work",
    visaContext: draftStore.visaContext,
  });
}

/** After last child subsection (Custody), continue to All Applicants. */
export function getAfterTemporaryWorkChildCustodyNext(applicationId) {
  const path = "/intake/temporary-work/all-applicants/visas";
  return buildIntakeHref({
    appId: applicationId,
    internalHref: path,
    visaType: "temporary-work",
    visaContext: draftStore.visaContext,
  });
}

export const CHARACTER_QUESTIONS = [
  { slug: "q1", question: "Have you, or has any family member, ever been charged with any offence that is currently awaiting legal action?" },
  { slug: "q2", question: "Have you, or has any family member, ever been convicted of an offence in any country?" },
  { slug: "q3", question: "Have you, or has any family member, been acquitted of any offence on the grounds of mental illness?" },
  { slug: "q4", question: "Have you, or has any family member, ever been found guilty of a sexually based offence?" },
  { slug: "q5", question: "Are you, or has any family member, subject to any outstanding arrest warrant?" },
  { slug: "q6", question: "Are you, or has any family member, subject to an arrest warrant or Interpol notice?" },
  { slug: "q7", question: "Have you, or has any family member, ever been involved in war crimes, crimes against humanity or genocide?" },
  { slug: "q8", question: "Have you, or has any family member, been involved in people smuggling or trafficking?" },
  { slug: "q9", question: "Have you, or has any family member, ever been associated with a group involved in criminal conduct?" },
  { slug: "q10", question: "Have you, or has any family member, ever been associated with a person who is involved in criminal conduct?" },
  { slug: "q11", question: "Have you, or has any family member, ever had any military service?" },
  { slug: "q12", question: "Have you, or has any family member, ever undergone any weapons training?" },
  { slug: "q13", question: "Have you, or has any family member, ever been involved in acts of genocide or torture?" },
  { slug: "q14", question: "Have you, or has any family member, ever been removed or deported from any country?" },
  { slug: "q15", question: "Have you, or has any family member, been excluded from any country?" },
  { slug: "q16", question: "Have you, or has any family member, ever overstayed a visa in any country?" },
  { slug: "q17", question: "Have you, or has any family member, outstanding debts to any government?" },
];
