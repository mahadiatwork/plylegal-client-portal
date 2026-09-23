import { ExternalLink, FileText, Link as LinkIcon, ScrollText } from "lucide-react";
import { getResourceViewerUrl } from "@/lib/resourceAccess";
import { ResourceNoteViewer } from "@/components/ResourceNoteViewer";

function fileTypeLabel(item) {
  const extension = String(item.name || "").split(".").pop().toLowerCase();
  const mimeType = String(item.mimeType || "").toLowerCase();
  if (extension === "pdf" || mimeType === "application/pdf") return "PDF document";
  if (["doc", "docx"].includes(extension) || /msword|wordprocessingml/.test(mimeType)) return "Word document";
  if (["xls", "xlsx", "ods", "csv"].includes(extension) || /spreadsheet|excel|text\/csv/.test(mimeType)) return "Spreadsheet";
  if (["ppt", "pptx", "odp"].includes(extension) || /presentation|powerpoint/.test(mimeType)) return "Presentation";
  if (["txt", "rtf", "odt"].includes(extension) || /text\/plain|application\/rtf|opendocument\.text/.test(mimeType)) return "Text document";
  if (mimeType.startsWith("image/")) return "Image";
  return "File";
}

function formatFileSize(size) {
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResourceCenterItem({ item }) {
  const isNote = item.kind === "note";
  const isFile = item.kind === "file";
  const Icon = isFile ? FileText : isNote ? ScrollText : LinkIcon;
  const viewerUrl = isFile ? getResourceViewerUrl(item) : "";
  const actionUrl = isFile ? viewerUrl : item.kind === "link" ? item.externalUrl : "";
  const meta = [
    isFile ? fileTypeLabel(item) : isNote ? "Note" : "Link",
    formatFileSize(item.size),
  ].filter(Boolean).join(" | ");
  const testId = `link-resource-${String(item.name || "resource").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  return (
    <article className="flex flex-col gap-3 rounded-md border border-[#DFE9E3] bg-[#F8FBF6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-[#D7E3DD] bg-white text-[#4F726B]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 break-words">
          <h3 className="truncate text-sm font-semibold text-gray-900">{item.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
          {isNote && item.noteHtml ? (
            <ResourceNoteViewer sanitizedHtml={item.noteHtml} />
          ) : isNote && item.noteText ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{item.noteText}</p>
          ) : null}
          {isFile && !viewerUrl ? (
            <p className="mt-2 text-sm text-muted-foreground">Document preview is not available yet.</p>
          ) : null}
        </div>
      </div>

      {actionUrl ? (
        <a
          href={actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 flex-shrink-0 items-center justify-center gap-2 rounded-md border border-[#D7E3DD] bg-white px-3 text-sm font-medium text-[#255E4A] transition-colors hover:bg-[#EEF7F2]"
          data-testid={testId}
        >
          <ExternalLink className="h-4 w-4" />
          {isFile ? "View document" : "Open"}
        </a>
      ) : null}
    </article>
  );
}
