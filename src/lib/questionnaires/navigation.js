/**
 * Definition-driven questionnaire navigation.
 *
 * Historically the client sidebar, Next/Previous order, progress and the submission checklist
 * came from route tables hard-coded in `routes.js`. A questionnaire definition can now opt in to
 * owning that structure:
 *
 *   definition.navigation = {
 *     mode: "definition",
 *     groups: ["main-applicant", "all-applicants"],   // included groups, in sidebar order
 *   }
 *
 * - Groups that are not listed are excluded: they are not in the sidebar, not counted in progress,
 *   not part of the submission checklist and their routes are not reachable. Pages and saved
 *   answers are never deleted, so re-including a group restores everything.
 * - Pages inside a group follow `page.order` (then definition order).
 * - Definitions without `navigation.mode === "definition"` keep the original code-owned navigation.
 *
 * This file is pure (no React / store imports) so it can be unit tested with node --test.
 * The admin portal keeps a mirrored copy in `questionnaireNavigationModel.js`; keep them in step.
 */

export const NAVIGATION_MODE_DEFINITION = "definition";

export const NAVIGATION_GROUP_KEYS = Object.freeze([
  "main-applicant",
  "spouse-partner",
  "children",
  "non-migrating",
  "family-sponsor",
  "relationships",
  "all-applicants",
  "shared",
]);

export const NAVIGATION_GROUP_LABELS = Object.freeze({
  "main-applicant": "Main Applicant",
  "spouse-partner": "Spouse/Partner",
  children: "Child",
  "non-migrating": "Other Family",
  "family-sponsor": "Family Sponsor",
  relationships: "Relationships",
  "all-applicants": "All Applicants",
  shared: "Other sections",
});

/** Person groups expand once per applicant; the rest are shared by everyone. */
export const PERSON_GROUP_KEYS = Object.freeze(["main-applicant", "spouse-partner", "children", "non-migrating"]);

const PROFILE_RELATIONSHIPS = {
  "main-applicant": ["main_applicant"],
  "spouse-partner": ["spouse", "de_facto"],
  children: ["child"],
};

/** Route segments that are code-owned workflow screens, never content steps. */
const WORKFLOW_SEGMENTS = new Set(["start", "profile", "submit", "non-migrating", "children", "dependents"]);
const CHILD_TEMPLATE = "child-profile";
const MEMBER_TEMPLATE = "member-profile";

export function isDefinitionNavigation(definition) {
  return definition?.navigation?.mode === NAVIGATION_MODE_DEFINITION;
}

/** Included group keys, in sidebar order. Unknown / duplicate keys are ignored. */
export function getIncludedGroupKeys(definition) {
  if (!isDefinitionNavigation(definition)) return [...NAVIGATION_GROUP_KEYS];
  const seen = new Set();
  return (Array.isArray(definition.navigation.groups) ? definition.navigation.groups : [])
    .filter((key) => NAVIGATION_GROUP_KEYS.includes(key) && !seen.has(key) && seen.add(key));
}

function routeOf(page) {
  return String(page?.route || "").split("?")[0].replace(/\/+$/, "");
}

export function getPageGroupKey(page) {
  const metadataRole = page?.metadata?.profileRole;
  const role = metadataRole === "main" ? "main_applicant" : metadataRole;
  if (role === "main_applicant") return "main-applicant";
  if (role === "spouse") return "spouse-partner";
  if (role === "child") return "children";
  if (["non_migrating", "other"].includes(role)) return "non-migrating";

  const route = routeOf(page);
  if (route.includes("/main-applicant/")) return "main-applicant";
  if (route.includes("/spouse-partner/")) return "spouse-partner";
  if (/\/children\/[^/]+\/[^/]+$/.test(route)) return "children";
  if (/\/non-migrating\/[^/]+\/[^/]+$/.test(route)) return "non-migrating";
  if (route.includes("/family-sponsor/")) return "family-sponsor";
  if (route.includes("/relationships/")) return "relationships";
  if (route.includes("/all-applicants/")) return "all-applicants";
  return "shared";
}

/** Group of a route string alone (used to guard routes that have no definition page). */
export function getRouteGroupKey(route) {
  return getPageGroupKey({ route });
}

function visaTypeOfRoute(route) {
  return String(route || "").match(/^\/intake\/([^/]+)\//)?.[1] || "";
}

function isWorkflowPage(page, visaType) {
  const route = routeOf(page);
  const match = route.match(new RegExp(`^/intake/${visaType}/([^/]+)$`));
  return Boolean(match && WORKFLOW_SEGMENTS.has(match[1]));
}

function profileName(profile) {
  return [profile?.given_names, profile?.family_name].filter(Boolean).join(" ").trim();
}

function pageLabel(page) {
  return String(page?.metadata?.navigationTitle || "").trim() || page?.title || "Untitled section";
}

/** Pages that make up a group, ordered by `page.order` (stable by definition order). */
export function getGroupPages(definition, groupKey, visaType = definition?.visaType) {
  return (definition?.pages || [])
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => page && getPageGroupKey(page) === groupKey && !isWorkflowPage(page, visaType))
    .sort((left, right) => {
      const order = (Number(left.page.order) || 0) - (Number(right.page.order) || 0);
      return order || left.index - right.index;
    })
    .map(({ page }) => page);
}

function withProfileKey(completionKey, profileId) {
  return profileId ? `${completionKey}__${profileId}` : completionKey;
}

function pageCompletionKey(page) {
  return page.completionKey || routeOf(page).replace(/^\/intake\//, "");
}

function templateToConcrete(page, id, visaType, groupKey) {
  const route = routeOf(page);
  const token = groupKey === "children" ? CHILD_TEMPLATE : MEMBER_TEMPLATE;
  const section = groupKey === "children" ? "children" : "non-migrating";
  const slug = route.split("/").pop();
  const concreteRoute = route.includes(`/${section}/${token}/`)
    ? route.replace(`/${section}/${token}/`, `/${section}/${id}/`)
    : `/intake/${visaType}/${section}/${id}/${slug}`;
  const baseKey = pageCompletionKey(page).replace(`/${token}/`, `/${id}/`);
  return { href: concreteRoute, completionKey: withProfileKey(baseKey, id) };
}

/**
 * Build the navigation for a definition-driven questionnaire.
 *
 * @param {object} definition
 * @param {{ draft?: object, visaType?: string }} [options] `draft.profiles` / `draft.non_migrating_members`
 * @returns {{
 *   steps: Array<object>,   // every step in order, including start/profile/submit
 *   entries: Array<object>, // sidebar: { type: "step", step } | { type: "group", key, label, profile, steps }
 *   progressSteps: Array<object>, // steps counted by progress / the checklist (everything but submit)
 * }}
 */
export function buildDefinitionNavigation(definition, { draft = {}, visaType = definition?.visaType } = {}) {
  const base = `/intake/${visaType}`;
  const steps = [];
  const entries = [];
  const fixed = (slug, title) => ({
    kind: "workflow",
    id: `workflow:${slug}`,
    href: `${base}/${slug}`,
    completionKey: `${visaType}/${slug}`,
    title,
    groupKey: "",
    checklistLabel: title,
  });
  const pushStep = (step) => { steps.push(step); return step; };
  const pushEntryStep = (step) => entries.push({ type: "step", step: pushStep(step) });

  pushEntryStep(fixed("start", "Getting Started"));
  pushEntryStep(fixed("profile", "Included Applicants"));

  const profiles = Array.isArray(draft?.profiles) ? draft.profiles : [];
  const members = Array.isArray(draft?.non_migrating_members) ? draft.non_migrating_members : [];

  getIncludedGroupKeys(definition).forEach((groupKey) => {
    const pages = getGroupPages(definition, groupKey, visaType);

    if (groupKey === "main-applicant" || groupKey === "spouse-partner") {
      const roles = PROFILE_RELATIONSHIPS[groupKey];
      profiles.filter((profile) => roles.includes(profile.relationship) && profile.id).forEach((profile) => {
        const groupSteps = pages.map((page) => ({
          kind: "page",
          id: `${page.id}:${profile.id}`,
          page,
          groupKey,
          profileId: profile.id,
          profile,
          href: `${routeOf(page)}?profileId=${encodeURIComponent(profile.id)}`,
          route: routeOf(page),
          completionKey: withProfileKey(pageCompletionKey(page), profile.id),
          title: pageLabel(page),
          checklistLabel: `${profileName(profile) || NAVIGATION_GROUP_LABELS[groupKey]}: ${pageLabel(page)}`,
        }));
        groupSteps.forEach(pushStep);
        entries.push({ type: "group", key: groupKey, label: NAVIGATION_GROUP_LABELS[groupKey], profile, steps: groupSteps });
      });
      return;
    }

    if (groupKey === "children") {
      profiles.filter((profile) => profile.relationship === "child" && profile.id).forEach((profile) => {
        const groupSteps = pages.map((page) => {
          const concrete = templateToConcrete(page, profile.id, visaType, groupKey);
          return {
            kind: "page",
            id: `${page.id}:${profile.id}`,
            page,
            groupKey,
            profileId: profile.id,
            profile,
            href: concrete.href,
            route: concrete.href,
            completionKey: concrete.completionKey,
            title: pageLabel(page),
            checklistLabel: `${profileName(profile) || "Child"}: ${pageLabel(page)}`,
          };
        });
        groupSteps.forEach(pushStep);
        entries.push({ type: "group", key: groupKey, label: NAVIGATION_GROUP_LABELS[groupKey], profile, steps: groupSteps });
      });
      return;
    }

    if (groupKey === "non-migrating") {
      // The Other Family list screen is code-owned; member pages hang off each member.
      pushEntryStep(fixed("non-migrating", "Other Family"));
      members.filter((member) => member.id).forEach((member) => {
        const name = [member.passport?.given_names, member.passport?.family_name].filter(Boolean).join(" ") || "Unnamed Member";
        const groupSteps = pages.map((page) => {
          const concrete = templateToConcrete(page, member.id, visaType, groupKey);
          return {
            kind: "page",
            id: `${page.id}:${member.id}`,
            page,
            groupKey,
            profileId: member.id,
            member,
            href: concrete.href,
            route: concrete.href,
            completionKey: concrete.completionKey,
            title: pageLabel(page),
            checklistLabel: `Other Family (${name}): ${pageLabel(page)}`,
          };
        });
        groupSteps.forEach(pushStep);
        entries.push({ type: "group", key: groupKey, label: `Other Family`, member, steps: groupSteps });
      });
      return;
    }

    // Shared groups (family sponsor, relationships, all applicants, other).
    if (!pages.length) return;
    const groupSteps = pages.map((page) => ({
      kind: "page",
      id: page.id,
      page,
      groupKey,
      href: routeOf(page),
      route: routeOf(page),
      completionKey: pageCompletionKey(page),
      title: pageLabel(page),
      checklistLabel: `${NAVIGATION_GROUP_LABELS[groupKey]}: ${pageLabel(page)}`,
    }));
    groupSteps.forEach(pushStep);
    entries.push({ type: "group", key: groupKey, label: NAVIGATION_GROUP_LABELS[groupKey], steps: groupSteps });
  });

  pushEntryStep({ ...fixed("submit", "Review and Submit"), completionKey: null });

  return {
    steps,
    entries,
    progressSteps: steps.filter((step) => step.completionKey),
  };
}

/**
 * Whether a concrete intake route belongs to the questionnaire.
 * Returns `{ reachable: true }`, or `{ reachable: false, reason, groupKey }`.
 * Legacy (non-definition) navigation never blocks a route.
 */
export function getRouteAvailability(definition, route) {
  if (!isDefinitionNavigation(definition)) return { reachable: true };
  const pathOnly = String(route || "").split("?")[0].replace(/\/+$/, "");
  const visaType = definition.visaType || visaTypeOfRoute(pathOnly);
  const groups = getIncludedGroupKeys(definition);

  const workflow = pathOnly.match(new RegExp(`^/intake/${visaType}/([^/]+)$`))?.[1];
  if (workflow === "start" || workflow === "profile" || workflow === "submit") return { reachable: true };
  // Code-owned list screens belong to the group they manage.
  const listScreenGroup = { "non-migrating": "non-migrating", children: "children", dependents: "children" }[workflow];
  if (listScreenGroup) {
    return groups.includes(listScreenGroup)
      ? { reachable: true }
      : { reachable: false, reason: "group-excluded", groupKey: listScreenGroup };
  }

  const groupKey = getRouteGroupKey(pathOnly);
  if (!groups.includes(groupKey)) return { reachable: false, reason: "group-excluded", groupKey };

  const page = findPageForRoute(definition, pathOnly);
  if (!page) return { reachable: false, reason: "not-in-questionnaire", groupKey };
  return { reachable: true, page };
}

/** Exact route, or a child / member route resolved through its template page. */
export function findPageForRoute(definition, route) {
  const pages = definition?.pages || [];
  const exact = pages.find((page) => routeOf(page) === route);
  if (exact) return exact;
  for (const [section, token] of [["children", CHILD_TEMPLATE], ["non-migrating", MEMBER_TEMPLATE]]) {
    const match = route.match(new RegExp(`^(/intake/[^/]+/${section}/)([^/]+)(/[^/]+)$`));
    if (!match) continue;
    const template = pages.find((page) => routeOf(page) === `${match[1]}${token}${match[3]}`);
    if (template) return template;
  }
  return null;
}

/** First content step the applicant should land on after "Included Applicants". */
export function getFirstContentStep(navigation) {
  return navigation.steps.find((step) => step.kind === "page" || step.id === "workflow:non-migrating") || null;
}

/** Relationships the "Included Applicants" screen may offer for this questionnaire. */
export function getAllowedProfileRelationships(definition) {
  if (!isDefinitionNavigation(definition)) return null;
  const groups = getIncludedGroupKeys(definition);
  const allowed = new Set(["main_applicant"]);
  if (groups.includes("spouse-partner")) { allowed.add("spouse"); allowed.add("de_facto"); }
  if (groups.includes("children")) allowed.add("child");
  if (groups.includes("non-migrating")) allowed.add("other");
  return allowed;
}

/** Progress counted over the included steps only. */
export function getDefinitionNavigationProgress(navigation, isComplete) {
  const total = navigation.progressSteps.length;
  const completed = navigation.progressSteps.filter((step) => isComplete(step.completionKey)).length;
  return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
}
