export function getCompletionIssueDescription(result) {
  const issues = Array.isArray(result?.issues)
    ? result.issues.filter(Boolean)
    : [];

  if (!issues.length) {
    return result?.error || "Please complete the required information before continuing.";
  }

  return issues.slice(0, 6).join("\n");
}

export function showCompletionIssuesToast(toast, result) {
  toast({
    title: "Required information missing",
    description: getCompletionIssueDescription(result),
    variant: "destructive",
  });
}
