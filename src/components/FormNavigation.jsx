import { Button } from "@/components/ui/button";
import { StickyNav } from "@/components/StickyNav";
import { Loader2 } from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

export function FormNavigation({
    onPrev,
    onNext,
    onSave,
    loading = false,
    submitting = false,
    showPrev = true,
    disabledNext = false,
    nextLabel = "Next",
    saveLabel = "Save Draft",
}) {
    const { isNavigating } = useNavigationLoading();

    return (
        <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
                {showPrev && onPrev ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onPrev}
                        className="min-h-9 min-w-[110px]"
                        data-testid="button-previous"
                        disabled={loading || submitting || isNavigating}
                    >
                        {isNavigating ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : loading ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                            <span className="mr-1">←</span>
                        )}
                        Previous
                    </Button>
                ) : (
                    <div /> /* Spacer */
                )}

                <div className="flex gap-3">
                    {onSave && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onSave}
                            disabled={loading || submitting || isNavigating}
                            className="min-h-9"
                            data-testid="button-save"
                        >
                            {loading && (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            )}
                            {saveLabel}
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={onNext}
                        disabled={loading || submitting || disabledNext || isNavigating}
                        className="min-h-9 min-w-[120px] bg-[#285646] hover:bg-[#1e4336] text-white"
                        data-testid="button-next"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Saving…
                            </>
                        ) : isNavigating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Loading…
                            </>
                        ) : (
                            <>{nextLabel} →</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <StickyNav
                onPrev={onPrev}
                onNext={onNext}
                onSave={onSave}
                loading={loading}
                submitting={submitting}
                showPrev={showPrev}
                disabledNext={disabledNext}
                nextLabel={nextLabel}
                saveLabel={saveLabel}
                previousTestId="button-previous-mobile"
                nextTestId="button-next-mobile"
                saveTestId="button-save-mobile"
            />
        </>
    );
}
