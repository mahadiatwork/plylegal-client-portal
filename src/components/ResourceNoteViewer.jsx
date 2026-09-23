export function ResourceNoteViewer({ sanitizedHtml }) {
  if (!sanitizedHtml) return null;

  return (
    <div className="mt-2 text-muted-foreground">
      <div
        className="rich-text-content"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
