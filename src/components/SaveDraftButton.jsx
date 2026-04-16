// src/components/SaveDraftButton.jsx

import { Button } from "@/components/ui/button";

export default function SaveDraftButton({ onSave, isSaving }) {
  return (
    <Button type="button" onClick={onSave} disabled={isSaving}>
      {isSaving ? "Saving…" : "Save Draft"}
    </Button>
  );
}
