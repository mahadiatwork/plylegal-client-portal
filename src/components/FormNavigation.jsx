import { Button } from "@/components/ui/button";
import { StickyNav } from "@/components/StickyNav";
import { Loader2 } from "lucide-react";

export function FormNavigation({
    onPrev,
    onNext,
    onSave,
    loading = false,
    showPrev = true,
    disabledNext = false,
    nextLabel = "Next",
    saveLabel = "Save Draft",
}) {
    return (
        <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
                {showPrev && onPrev ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onPrev}
                        className="min-h-9"
                        data-testid="button-previous"
                        disabled={loading}
                    >
                        ← Previous
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
                            disabled={loading}
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
                        disabled={loading || disabledNext}
                        className="min-h-9 bg-[#285646] hover:bg-[#1e4336] text-white"
                        data-testid="button-next"
                    >
                        {nextLabel} →
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <StickyNav
                onPrev={onPrev}
                onNext={onNext}
                onSave={onSave}
                loading={loading}
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
