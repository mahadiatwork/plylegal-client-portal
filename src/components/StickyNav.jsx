import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

export function StickyNav({
  onPrev,
  onSave,
  onNext,
  loading = false,
  disabledNext = false,
  showPrev = true,
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
              disabled={loading}
              data-testid="button-previous"
              className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[120px]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          ) : (
            <div className="flex-1 sm:flex-none sm:min-w-[120px]" />
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={onSave}
            disabled={loading}
            data-testid="button-save-draft"
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Draft
          </Button>

          <Button
            type="button"
            onClick={onNext}
            disabled={loading || disabledNext}
            data-testid="button-continue"
            className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[120px]"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
