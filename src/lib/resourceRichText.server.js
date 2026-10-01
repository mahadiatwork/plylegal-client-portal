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

const BLOCK_END_TAGS = ["p", "h1", "h2", "h3", "h4", "li", "blockquote", "pre"];

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

function decodePlainTextEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (entity, decimal, hex, named) => {
    if (decimal) {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }

    if (hex) {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }

    return namedEntities[named.toLowerCase()] ?? entity;
  });
}

export function resourceNoteHtmlToPlainText(value) {
  const safeHtml = sanitizeResourceNoteHtml(value);
  const withLineBreaks = safeHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n")
    .replace(new RegExp(`</(?:${BLOCK_END_TAGS.join("|")})\\s*>`, "gi"), "\n");
  const encodedText = sanitizeHtml(withLineBreaks, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return decodePlainTextEntities(encodedText)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
