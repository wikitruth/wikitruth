import { sanitizeContent } from '../../server/src/utils/sanitizeHtml';

describe('sanitizeContent (server-side)', () => {
  it('returns empty string for null/undefined', () => {
    expect(sanitizeContent(null)).toBe('');
    expect(sanitizeContent(undefined)).toBe('');
    expect(sanitizeContent('')).toBe('');
  });

  it('preserves safe HTML tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeContent(html)).toBe(html);
  });

  it('strips script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeContent(html)).toBe('<p>Hello</p>');
  });

  it('strips onerror attributes', () => {
    const html = '<img src="x" onerror="alert(1)">';
    const result = sanitizeContent(html);
    expect(result).not.toContain('onerror');
  });

  it('strips javascript: URIs from links', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeContent(html);
    expect(result).not.toContain('javascript:');
  });

  it('preserves allowed heading tags', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    expect(sanitizeContent(html)).toBe(html);
  });

  it('preserves table structure', () => {
    const html = '<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
    expect(sanitizeContent(html)).toBe(html);
  });

  it('preserves safe links with href', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = sanitizeContent(html);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('preserves images with safe src', () => {
    const html = '<img src="https://example.com/img.png" alt="Photo">';
    const result = sanitizeContent(html);
    expect(result).toContain('src="https://example.com/img.png"');
    expect(result).toContain('alt="Photo"');
  });

  it('strips iframe tags', () => {
    const html = '<iframe src="https://evil.com"></iframe>';
    expect(sanitizeContent(html)).toBe('');
  });

  it('strips event handler attributes', () => {
    const html = '<div onclick="alert(1)">Click me</div>';
    const result = sanitizeContent(html);
    expect(result).not.toContain('onclick');
  });
});
