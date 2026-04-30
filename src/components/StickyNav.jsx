import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";

export function StickyNav({
  onPrev,
  onSave,
  onNext,
  loading = false,
  submitting = false,
  disabledNext = false,
  showPrev = true,
  nextLabel = "Continue",
  saveLabel = "Save Draft",
  previousTestId,
  nextTestId,
  saveTestId,
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-between gap-3 p-4 max-w-7xl mx-auto">
          {showPrev && onPrev ? (
            <Button
              type="button"
              variant="outline"
              onClick={onPrev}
              disabled={loading || submitting}
              data-testid={previousTestId || "button-previous"}
              className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[120px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ChevronLeft className="w-4 h-4 mr-1" />
              )}
              Previous
            </Button>
          ) : (
            <div className="flex-1 sm:flex-none sm:min-w-[120px]" />
          )}

          {onSave && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSave}
              disabled={loading || submitting}
              data-testid={saveTestId || "button-save-draft"}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              <span className="hidden xs:inline">{saveLabel}</span>
              <span className="xs:hidden">Save</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onNext}
            disabled={loading || submitting || disabledNext}
            data-testid={nextTestId || "button-continue"}
            className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[120px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
