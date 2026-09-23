import sanitizeHtml from "sanitize-html";

// Keep raw-text and SVG elements (notably textarea, xmp, svg, animate, and set)
// outside this allowlist. The route regression suite covers the sanitizer
// bypasses that depend on those elements, so schema changes require matching
// dependency and test review.
const ALLOWED_TAGS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "mark",
  "a",
];

const ALIGNABLE_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
];

const allowedAttributes = Object.fromEntries(
  ALIGNABLE_TAGS.map((tag) => [tag, ["style"]]),
);
allowedAttributes.a = ["href", "title", "target", "rel"];

const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function normalizeAllowedLink(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const url = new URL(value.trim());
    return ALLOWED_LINK_PROTOCOLS.has(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  allowedStyles: {
    "*": {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
  transformTags: {
    a(tagName, attribs) {
      const href = normalizeAllowedLink(attribs.href);
      return {
        tagName,
        attribs: {
          ...(href ? { href } : {}),
          ...(attribs.title ? { title: attribs.title } : {}),
          target: "_blank",
          rel: "noopener noreferrer",
        },
      };
    },
  },
  exclusiveFilter(frame) {
    return frame.tag === "a" && !frame.attribs.href ? "excludeTag" : false;
  },
  nestingLimit: 20,
};

export function sanitizeResourceNoteHtml(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  return sanitizeHtml(value, SANITIZE_OPTIONS).trim();
}
