export interface RouteStep {
  title: string;
  href: string;
  section: string;
  subpages?: RouteStep[];
}

export const INTAKE_ROUTES: RouteStep[] = [
  {
    title: "Start",
    href: "/intake/start",
    section: "Start",
  },
  {
    title: "Main Applicant",
    href: "/intake/main-applicant",
    section: "Main Applicant",
    subpages: [
      { title: "Details", href: "/intake/main-applicant/details", section: "Main Applicant" },
      { title: "Other Names", href: "/intake/main-applicant/other", section: "Main Applicant" },
      { title: "Identity", href: "/intake/main-applicant/identity", section: "Main Applicant" },
      { title: "Employment", href: "/intake/main-applicant/employment", section: "Main Applicant" },
      { title: "Education", href: "/intake/main-applicant/education", section: "Main Applicant" },
      { title: "Language", href: "/intake/main-applicant/language", section: "Main Applicant" },
      { title: "Family", href: "/intake/main-applicant/family", section: "Main Applicant" },
    ],
  },
  {
    title: "Children",
    href: "/intake/children/start",
    section: "Children",
  },
  {
    title: "Family Sponsor",
    href: "/intake/family-sponsor/details",
    section: "Family Sponsor",
  },
  {
    title: "Family",
    href: "/intake/family",
    section: "Family",
  },
  {
    title: "All Applicants",
    href: "/intake/all-applicants",
    section: "All Applicants",
    subpages: [
      { title: "Addresses", href: "/intake/all-applicants/addresses", section: "All Applicants" },
      { title: "Contact Details", href: "/intake/all-applicants/contact-details", section: "All Applicants" },
      { title: "Visas", href: "/intake/all-applicants/visas", section: "All Applicants" },
      { title: "Travel History", href: "/intake/all-applicants/travel-history", section: "All Applicants" },
      { title: "Future Travel", href: "/intake/all-applicants/future-travel", section: "All Applicants" },
      { title: "Future Addresses", href: "/intake/all-applicants/future-addresses", section: "All Applicants" },
      { title: "Health", href: "/intake/all-applicants/health", section: "All Applicants" },
      { title: "Character", href: "/intake/all-applicants/character", section: "All Applicants" },
      { title: "Contacts", href: "/intake/all-applicants/contacts", section: "All Applicants" },
    ],
  },
  {
    title: "Review & Submit",
    href: "/intake/submit",
    section: "Submit",
  },
];

export function getAllRoutes(): string[] {
  const routes: string[] = [];
  INTAKE_ROUTES.forEach((route) => {
    routes.push(route.href);
    if (route.subpages) {
      route.subpages.forEach((sub) => routes.push(sub.href));
    }
  });
  return routes;
}

export function getNextRoute(currentHref: string): string | null {
  const allRoutes = getAllRoutes();
  const currentIndex = allRoutes.indexOf(currentHref);
  if (currentIndex >= 0 && currentIndex < allRoutes.length - 1) {
    return allRoutes[currentIndex + 1];
  }
  return null;
}

export function getPreviousRoute(currentHref: string): string | null {
  const allRoutes = getAllRoutes();
  const currentIndex = allRoutes.indexOf(currentHref);
  if (currentIndex > 0) {
    return allRoutes[currentIndex - 1];
  }
  return null;
}

export function calculateProgress(currentHref: string): number {
  const allRoutes = getAllRoutes();
  const currentIndex = allRoutes.indexOf(currentHref);
  if (currentIndex < 0) return 0;
  return Math.round(((currentIndex + 1) / allRoutes.length) * 100);
}

export const CHARACTER_QUESTIONS = [
  { slug: "convictions", question: "Have you ever been convicted of any offence in any country?" },
  { slug: "visa_refusals", question: "Have you ever been refused a visa to any country?" },
  { slug: "detentions", question: "Have you ever been detained, arrested or charged with any offence?" },
  { slug: "imprisonment", question: "Have you or any family member been imprisoned?" },
  { slug: "community_orders", question: "Have you ever been subject to a community service order or good behaviour bond?" },
  { slug: "domestic_violence", question: "Have you or any family member been subject to a domestic violence order or similar?" },
  { slug: "sexual_offences", question: "Have you or any family member been charged with or convicted of sexual offences involving children?" },
  { slug: "war_crimes", question: "Have you or any family member been associated with war crimes, crimes against humanity, or genocide?" },
  { slug: "military_service", question: "Have you served in any military, police, intelligence, or security organization?" },
  { slug: "organisations", question: "Have you been associated with any organization engaged in violence or terrorism?" },
  { slug: "people_smuggling", question: "Have you been involved in people smuggling or people trafficking?" },
  { slug: "human_trafficking", question: "Have you been involved in human trafficking?" },
  { slug: "terrorist_links", question: "Have you had any association with terrorist organizations?" },
  { slug: "intervention_orders", question: "Have you ever been subject to an intervention order, restraining order or similar?" },
  { slug: "deportations", question: "Have you or any family member been deported from any country?" },
  { slug: "charges_pending", question: "Do you have any charges pending against you in any country?" },
  { slug: "good_conduct_bonds", question: "Have you ever been subject to a good conduct bond?" },
];
