"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Baby, User, UserMinus, Loader2, AlertCircle } from "lucide-react";

const RELATIONSHIP_LABELS = {
  spouse: "Spouse / Partner",
  child: "Dependent Child",
  other: "Other Dependent",
};

const RELATIONSHIP_ORDER = { spouse: 0, child: 1, other: 2 };

function getRelationshipIcon(rel) {
  switch (rel) {
    case "spouse": return Users;
    case "child": return Baby;
    default: return User;
  }
}

function formatDate(year, month, day) {
  if (!year && !month && !day) return "—";
  const parts = [day, month, year].filter(Boolean);
  return parts.join("/") || "—";
}

function getInitials(firstName, lastName) {
  const f = (firstName || "").trim().charAt(0).toUpperCase();
  const l = (lastName || "").trim().charAt(0).toUpperCase();
  return f + l || "?";
}

/**
 * DependentSelector — fetches dependents from CRM and lets the user
 * select which to include or exclude for the current application.
 *
 * Props:
 * - userId: string (Firebase UID)
 * - selectedIds: string[] — currently selected zohoDependentIds
 * - excludedIds: string[] — currently excluded zohoDependentIds
 * - onChange: (selectedIds, excludedIds) => void
 * - onLoadingChange: (isLoading) => void (optional)
 */
export default function DependentSelector({
  userId,
  zohoContactId,
  selectedIds = [],
  excludedIds = [],
  onChange,
  onLoadingChange,
}) {
  const [dependents, setDependents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDependents = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    onLoadingChange?.(true);

    try {
      const params = new URLSearchParams({ userId });
      if (zohoContactId) params.set('zohoContactId', zohoContactId);
      const res = await fetch(`/api/intake/dependents?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to load dependents");
        setDependents([]);
      } else {
        setDependents(data.dependents || []);
      }
    } catch (err) {
      setError(err.message || "Network error");
      setDependents([]);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }, [userId, zohoContactId, onLoadingChange]);

  useEffect(() => {
    fetchDependents();
  }, [fetchDependents]);

  const handleToggleSelect = (dependentId) => {
    const isCurrentlySelected = selectedIds.includes(dependentId);
    const isCurrentlyExcluded = excludedIds.includes(dependentId);

    let newSelected = [...selectedIds];
    let newExcluded = [...excludedIds];

    if (isCurrentlySelected) {
      // Deselecting → move to excluded
      newSelected = newSelected.filter((id) => id !== dependentId);
      if (!isCurrentlyExcluded) {
        newExcluded.push(dependentId);
      }
    } else if (isCurrentlyExcluded) {
      // Re-including from excluded
      newExcluded = newExcluded.filter((id) => id !== dependentId);
      newSelected.push(dependentId);
    } else {
      // Not selected, not excluded → select
      newSelected.push(dependentId);
    }

    onChange(newSelected, newExcluded);
  };

  const handleRemoveExclusion = (dependentId) => {
    const newExcluded = excludedIds.filter((id) => id !== dependentId);
    const newSelected = [...selectedIds, dependentId];
    onChange(newSelected, newExcluded);
  };

  // Group dependents by relationship
  const grouped = dependents.reduce((acc, dep) => {
    const key = dep.relationship || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(dep);
    return acc;
  }, {});

  // Sort groups
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => (RELATIONSHIP_ORDER[a] ?? 3) - (RELATIONSHIP_ORDER[b] ?? 3)
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading dependents from CRM...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-red-600">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm font-medium">Failed to load dependents</p>
        <p className="text-xs text-gray-500 mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchDependents}>
          Retry
        </Button>
      </div>
    );
  }

  // Empty state — no dependents found in CRM
  if (dependents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <UserMinus className="w-10 h-10 mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">No existing dependents found</p>
        <p className="text-xs mt-1">
          Dependents you add in this application will be saved for future use.
        </p>
      </div>
    );
  }

  const selectedDependents = dependents.filter((d) => selectedIds.includes(d.zohoDependentId));
  const excludedDependents = dependents.filter((d) => excludedIds.includes(d.zohoDependentId));
  const unselectedDependents = dependents.filter(
    (d) => !selectedIds.includes(d.zohoDependentId) && !excludedIds.includes(d.zohoDependentId)
  );

  return (
    <div className="space-y-6">
      {/* Selected Dependents */}
      {selectedDependents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Included in this application ({selectedDependents.length})
          </h3>
          <div className="space-y-2">
            {selectedDependents.map((dep) => (
              <DependentCard
                key={dep.zohoDependentId}
                dependent={dep}
                isSelected
                onToggle={() => handleToggleSelect(dep.zohoDependentId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unselected (available) Dependents */}
      {unselectedDependents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Available dependents ({unselectedDependents.length})
          </h3>
          <div className="space-y-2">
            {unselectedDependents.map((dep) => (
              <DependentCard
                key={dep.zohoDependentId}
                dependent={dep}
                isSelected={false}
                onToggle={() => handleToggleSelect(dep.zohoDependentId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Excluded Dependents */}
      {excludedDependents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Excluded from this application ({excludedDependents.length})
          </h3>
          <div className="space-y-2">
            {excludedDependents.map((dep) => (
              <DependentCard
                key={dep.zohoDependentId}
                dependent={dep}
                isSelected={false}
                isExcluded
                onToggle={() => handleRemoveExclusion(dep.zohoDependentId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {selectedIds.length} of {dependents.length} dependents included
          </span>
          {excludedIds.length > 0 && (
            <span className="text-orange-600">
              {excludedIds.length} excluded
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Dependent Card
 */
function DependentCard({ dependent, isSelected, isExcluded, onToggle }) {
  const Icon = getRelationshipIcon(dependent.relationship);
  const initials = getInitials(dependent.given_names, dependent.family_name);
  const relLabel = RELATIONSHIP_LABELS[dependent.relationship] || dependent.relationship;

  return (
    <Card
      className={`transition-all ${
        isSelected
          ? "border-[#4F726B] bg-[#4F726B]/5"
          : isExcluded
          ? "border-orange-300 bg-orange-50/50 opacity-70"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className={isSelected ? "data-[state=checked]:bg-[#4F726B] data-[state=checked]:border-[#4F726B]" : ""}
          />

          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
              isSelected
                ? "bg-[#4F726B] text-white"
                : isExcluded
                ? "bg-orange-200 text-orange-800"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {dependent.given_names} {dependent.family_name}
              </p>
              {dependent.isApplicant && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0">
                  Migrating
                </Badge>
              )}
              {dependent.isNonMigrating && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] px-1.5 py-0">
                  Non-Migrating
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {relLabel}
              </span>
              {dependent.birth_year && (
                <span className="text-xs text-gray-500">
                  DOB: {formatDate(dependent.birth_day, dependent.birth_month, dependent.birth_year)}
                </span>
              )}
              {dependent.citizenship && (
                <span className="text-xs text-gray-500">
                  {dependent.citizenship}
                </span>
              )}
            </div>
          </div>

          {/* Exclude/include action */}
          {isSelected && (
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <UserMinus className="w-3.5 h-3.5 mr-1" />
              Exclude
            </Button>
          )}
          {isExcluded && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#4F726B] hover:text-[#4F726B] hover:bg-[#4F726B]/5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              Re-include
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
