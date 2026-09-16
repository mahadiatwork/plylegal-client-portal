/** Match person-specific routes to their published reusable page without crossing visa flows. */
export function findQuestionnaireDefinitionPage(definition, route) {
  const normalized = String(route || "").split("?")[0];
  const pages = definition?.pages || [];
  const exact = pages.find((page) => page.route === normalized);
  if (exact) return exact;
  for (const [group, token, role] of [["children", "child-profile", "child"], ["non-migrating", "member-profile", "non_migrating"]]) {
    const match = normalized.match(new RegExp(`^(\/intake\/[^/]+\/${group}\/)([^/]+)(\/[^/]+)$`));
    if (!match) continue;
    const templateRoute = `${match[1]}${token}${match[3]}`;
    const page = pages.find((candidate) => candidate.metadata?.profileRole === role && candidate.route === templateRoute);
    if (page) {
      return {
        ...page,
        route: normalized,
        completionKey: page.completionKey ? page.completionKey.replace(`/${token}/`, `/${match[2]}/`) : undefined,
      };
    }
  }
  return null;
}
