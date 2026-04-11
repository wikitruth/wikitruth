import sanitizeHtml from 'sanitize-html';

/**
 * Server-side HTML sanitization for user-authored content.
 * Defense-in-depth: complements client-side DOMPurify sanitization.
 * Allows safe HTML subset matching TipTap editor output.
 */
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Block
    'p', 'br', 'hr', 'blockquote', 'pre', 'div',
    // Lists
    'ul', 'ol', 'li',
    // Inline
    'strong', 'em', 'u', 's', 'code', 'sub', 'sup', 'mark', 'span',
    // Links & images
    'a', 'img',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Other
    'figure', 'figcaption', 'details', 'summary',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    span: ['class', 'style'],
    pre: ['class'],
    code: ['class'],
    div: ['class'],
    p: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedStyles: {
    span: {
      color: [/.*/],
      'background-color': [/.*/],
    },
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: 'noopener noreferrer',
      },
    }),
  },
};

export function sanitizeContent(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(html, sanitizeOptions);
}

export default sanitizeContent;
