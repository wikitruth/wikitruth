import {
  listEmailTemplates,
  renderEmailTemplate,
  SYNTHETIC_EMAIL_FIXTURE,
} from '../../server/src/services/emailCatalog';

describe('email catalog', () => {
  it('publishes the complete supported transactional and digest catalog', () => {
    expect(listEmailTemplates().map((template) => template.key)).toEqual([
      'sign_in_code',
      'password_reset',
      'account_verification',
      'welcome',
      'contact_form',
      'daily_digest',
      'weekly_digest',
    ]);
  });

  it('renders HTML and plain text while escaping untrusted values', () => {
    const rendered = renderEmailTemplate('contact_form', {
      ...SYNTHETIC_EMAIL_FIXTURE,
      senderName: '<script>alert(1)</script>',
      message: '<b>not trusted markup</b>',
    });
    expect(rendered.subject).toContain('<script>');
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.html).toContain('&lt;b&gt;not trusted markup&lt;/b&gt;');
    expect(rendered.text).toContain('<b>not trusted markup</b>');
  });

  it('includes both code and trusted action link in a sign-in message', () => {
    const rendered = renderEmailTemplate('sign_in_code', SYNTHETIC_EMAIL_FIXTURE);
    expect(rendered.subject).toContain('482913');
    expect(rendered.html).toContain('482913');
    expect(rendered.html).toContain('https://example.wikitruth.invalid/action/sample');
    expect(rendered.text).toContain('Code: 482913');
  });
});
