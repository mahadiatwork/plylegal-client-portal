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
      { href: "/intake/partner/spouse-partner/personal-details", title: "Personal Details" },
    ],
  },
  { href: "/intake/partner/children/start", title: "Children" },
  { href: "/intake/partner/family-sponsor/details", title: "Family Sponsor" },
  { href: "/intake/partner/family", title: "Family Members" },
  {
    href: "/intake/partner/all-applicants/addresses",
    title: "All Applicants",
    subpages: [
      { href: "/intake/partner/all-applicants/addresses", title: "Addresses" },
      { href: "/intake/partner/all-applicants/contact-details", title: "Contact Details" },
      { href: "/intake/partner/all-applicants/future-addresses", title: "Future Addresses" },
      { href: "/intake/partner/all-applicants/contacts", title: "Contacts" },
      { href: "/intake/partner/all-applicants/visas", title: "Visas" },
      { href: "/intake/partner/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/partner/all-applicants/future-travel", title: "Future Travel" },
      { href: "/intake/partner/all-applicants/health", title: "Health" },
      { href: "/intake/partner/all-applicants/character", title: "Character" },
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
      { href: "/intake/protection/main-applicant/skills", title: "Skills" },
      { href: "/intake/protection/main-applicant/language", title: "Language" },
    ],
  },
  {
    href: "/intake/protection/spouse-partner/details",
    title: "Spouse/Partner",
    subpages: [
      { href: "/intake/protection/spouse-partner/details", title: "Details" },
      { href: "/intake/protection/spouse-partner/other-details", title: "Other Details" },
    ],
  },
  { href: "/intake/protection/children", title: "Children" },
  { href: "/intake/protection/relationships", title: "Relationships" },
  {
    href: "/intake/protection/all-applicants/addresses",
    title: "All Applicants",
    subpages: [
      { href: "/intake/protection/all-applicants/addresses", title: "Addresses" },
      { href: "/intake/protection/all-applicants/contact-details", title: "Contact Details" },
      { href: "/intake/protection/all-applicants/visas", title: "Visas" },
      { href: "/intake/protection/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/protection/all-applicants/health", title: "Health" },
      { href: "/intake/protection/all-applicants/character", title: "Character" },
    ],
  },
  { href: "/intake/protection/submit", title: "Submit" },
];

// Temporary Work Visa Routes (482 visa)
export const TEMPORARY_WORK_VISA_ROUTES = [
  { href: "/intake/temporary-work/start", title: "Getting Started" },
  {
    href: "/intake/temporary-work/main-applicant/details",
    title: "Main Applicant",
    subpages: [
      { href: "/intake/temporary-work/main-applicant/details", title: "Details" },
      { href: "/intake/temporary-work/main-applicant/other", title: "Other" },
      { href: "/intake/temporary-work/main-applicant/identity", title: "Identity" },
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
      { href: "/intake/temporary-work/spouse-partner/other-details", title: "Other Details" },
    ],
  },
  { href: "/intake/temporary-work/children", title: "Children" },
  { href: "/intake/temporary-work/relationships", title: "Relationships" },
  {
    href: "/intake/temporary-work/all-applicants/addresses",
    title: "All Applicants",
    subpages: [
      { href: "/intake/temporary-work/all-applicants/addresses", title: "Addresses" },
      { href: "/intake/temporary-work/all-applicants/contact-details", title: "Contact Details" },
      { href: "/intake/temporary-work/all-applicants/visas", title: "Visas" },
      { href: "/intake/temporary-work/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/temporary-work/all-applicants/health", title: "Health" },
      { href: "/intake/temporary-work/all-applicants/character", title: "Character" },
    ],
  },
  { href: "/intake/temporary-work/submit", title: "Submit" },
];

// Extract visa type from pathname
export function getVisaTypeFromPath(pathname) {
  if (pathname.includes('/intake/partner/')) return 'partner';
  if (pathname.includes('/intake/protection/')) return 'protection';
  if (pathname.includes('/intake/temporary-work/')) return 'temporary-work';
  return 'partner'; // default
}

// Get routes based on visa type
export function getIntakeRoutes(visaType) {
  switch (visaType) {
    case 'partner':
      return PARTNER_VISA_ROUTES;
    case 'protection':
      return PROTECTION_VISA_ROUTES;
    case 'temporary-work':
      return TEMPORARY_WORK_VISA_ROUTES;
    default:
      return PARTNER_VISA_ROUTES;
  }
}

// Legacy export for backward compatibility
export const INTAKE_ROUTES = PARTNER_VISA_ROUTES;

export function getAllRoutes(visaType) {
  const routes = getIntakeRoutes(visaType);
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

export function getNextRoute(currentHref, visaType, applicationId = null) {
  const allRoutes = getAllRoutes(visaType);
  const currentIndex = allRoutes.indexOf(currentHref);
  if (currentIndex === -1 || currentIndex === allRoutes.length - 1) {
    return null;
  }
  const nextRoute = allRoutes[currentIndex + 1];
  
  // Append applicationId as query parameter if provided
  if (applicationId) {
    return `${nextRoute}?applicationId=${applicationId}`;
  }
  return nextRoute;
}

export function getPreviousRoute(currentHref, visaType, applicationId = null) {
  const allRoutes = getAllRoutes(visaType);
  const currentIndex = allRoutes.indexOf(currentHref);
  if (currentIndex <= 0) {
    return null;
  }
  const previousRoute = allRoutes[currentIndex - 1];
  
  // Append applicationId as query parameter if provided
  if (applicationId) {
    return `${previousRoute}?applicationId=${applicationId}`;
  }
  return previousRoute;
}

export function calculateProgress(currentHref, visaType) {
  const allRoutes = getAllRoutes(visaType);
  const currentIndex = allRoutes.indexOf(currentHref);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / allRoutes.length) * 100);
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
