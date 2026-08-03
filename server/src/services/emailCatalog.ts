export type PublicEmailTemplateKey =
  | 'sign_in_code'
  | 'password_reset'
  | 'account_verification'
  | 'welcome'
  | 'contact_form'
  | 'daily_digest'
  | 'weekly_digest';

export type EmailTemplateKey = PublicEmailTemplateKey | 'provider_verification';

export interface EmailTemplateLocals {
  projectName?: string;
  recipientName?: string;
  code?: string;
  expiresMinutes?: string;
  actionUrl?: string;
  senderName?: string;
  senderEmail?: string;
  message?: string;
  items?: Array<{ title: string; body?: string; link?: string }>;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateSummary {
  key: PublicEmailTemplateKey;
  name: string;
  purpose: string;
  sampleSubject: string;
}

interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  purpose: string;
  subject: (locals: Required<Pick<EmailTemplateLocals, 'projectName'>> & EmailTemplateLocals) => string;
  heading: (locals: EmailTemplateLocals) => string;
  intro: (locals: EmailTemplateLocals) => string;
  actionLabel?: string;
}

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const definitions: Record<EmailTemplateKey, EmailTemplateDefinition> = {
  sign_in_code: {
    key: 'sign_in_code', name: 'Sign-in code', purpose: 'Passwordless sign-in and account creation.',
    subject: (v) => `${v.code || '000000'} is your ${v.projectName} sign-in code`,
    heading: () => 'Your sign-in code',
    intro: (v) => `Use code ${v.code || '000000'} to sign in. It expires in ${v.expiresMinutes || '10'} minutes.`,
    actionLabel: 'Sign in securely',
  },
  password_reset: {
    key: 'password_reset', name: 'Password reset', purpose: 'Requested password recovery.',
    subject: (v) => `Reset your ${v.projectName} password`,
    heading: () => 'Reset your password',
    intro: () => 'We received a request to reset your password. If this was not you, you can ignore this email.',
    actionLabel: 'Reset password',
  },
  account_verification: {
    key: 'account_verification', name: 'Account verification', purpose: 'Verify a newly registered email address.',
    subject: (v) => `Verify your ${v.projectName} account`,
    heading: () => 'Verify your email address',
    intro: () => 'Confirm this email address to finish securing your account.',
    actionLabel: 'Verify email',
  },
  welcome: {
    key: 'welcome', name: 'Welcome', purpose: 'Welcome a new Wikitruth contributor.',
    subject: (v) => `Welcome to ${v.projectName}`,
    heading: (v) => `Welcome${v.recipientName ? `, ${v.recipientName}` : ''}`,
    intro: () => 'Your account is ready. Explore the knowledge graph, examine evidence, and contribute responsibly.',
    actionLabel: 'Explore Wikitruth',
  },
  contact_form: {
    key: 'contact_form', name: 'Contact form', purpose: 'Deliver a public contact request to administrators.',
    subject: (v) => `${v.projectName} contact form: ${v.senderName || 'Visitor'}`,
    heading: () => 'New contact request',
    intro: (v) => `${v.senderName || 'A visitor'} (${v.senderEmail || 'no email'}) sent: ${v.message || ''}`,
  },
  daily_digest: {
    key: 'daily_digest', name: 'Daily digest', purpose: 'Daily summary of opted-in notifications.',
    subject: (v) => `Your daily ${v.projectName} digest`,
    heading: () => 'Your daily digest',
    intro: () => 'Here is the activity you asked us to collect for you.',
    actionLabel: 'Open Wikitruth',
  },
  weekly_digest: {
    key: 'weekly_digest', name: 'Weekly digest', purpose: 'Weekly summary of opted-in notifications.',
    subject: (v) => `Your weekly ${v.projectName} digest`,
    heading: () => 'Your weekly digest',
    intro: () => 'Here is your weekly summary of relevant activity.',
    actionLabel: 'Open Wikitruth',
  },
  provider_verification: {
    key: 'provider_verification', name: 'Provider verification', purpose: 'Validate an administrator-managed provider.',
    subject: (v) => `${v.projectName} email provider verification`,
    heading: () => 'Email delivery works',
    intro: () => 'This test confirms that the saved provider credentials can deliver Wikitruth email.',
  },
};

export const SYNTHETIC_EMAIL_FIXTURE: Required<Pick<EmailTemplateLocals, 'projectName'>> & EmailTemplateLocals = {
  projectName: 'Wikitruth',
  recipientName: 'Sample Contributor',
  code: '482913',
  expiresMinutes: '10',
  actionUrl: 'https://example.wikitruth.invalid/action/sample',
  senderName: 'Sample Visitor',
  senderEmail: 'visitor@example.invalid',
  message: 'This is synthetic preview content. No message was sent or stored.',
  items: [
    { title: 'A reviewed topic changed', body: 'A short synthetic activity summary.' },
    { title: 'A discussion received a reply', body: 'Another synthetic activity summary.' },
  ],
};

function renderItems(items: EmailTemplateLocals['items']): { html: string; text: string } {
  const values = Array.isArray(items) ? items.slice(0, 50) : [];
  return {
    html: values.map((item) => `<li style="margin:0 0 12px"><strong>${escapeHtml(item.title)}</strong>${item.body ? `<br><span style="color:#586474">${escapeHtml(item.body)}</span>` : ''}</li>`).join(''),
    text: values.map((item) => `- ${item.title}${item.body ? `: ${item.body}` : ''}`).join('\n'),
  };
}

export function renderEmailTemplate(key: EmailTemplateKey, rawLocals: EmailTemplateLocals): RenderedEmail {
  const definition = definitions[key];
  if (!definition) throw new Error('Unknown email template');
  const locals = { projectName: 'Wikitruth', ...rawLocals };
  const subject = definition.subject(locals).replace(/[\r\n]+/g, ' ').trim();
  const intro = definition.intro(locals);
  const itemContent = renderItems(locals.items);
  const actionUrl = String(locals.actionUrl || '');
  const action = definition.actionLabel && actionUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#287eb5;color:#fff;text-decoration:none;border-radius:6px;padding:12px 20px;font-weight:700">${escapeHtml(definition.actionLabel)}</a></p>`
    : '';
  const code = key === 'sign_in_code'
    ? `<div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#17212b;background:#edf6fb;border-radius:8px;padding:18px;text-align:center;margin:24px 0">${escapeHtml(locals.code || '')}</div>`
    : '';
  const itemList = itemContent.html ? `<ul style="padding-left:22px">${itemContent.html}</ul>` : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#17212b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:auto;background:#fff;border:1px solid #dce4e9;border-radius:10px"><tr><td style="padding:26px 30px;border-bottom:3px solid #2c8cc4"><strong style="font-size:22px;color:#277daf">${escapeHtml(locals.projectName)}</strong></td></tr><tr><td style="padding:30px"><h1 style="font-size:27px;line-height:1.2;margin:0 0 18px">${escapeHtml(definition.heading(locals))}</h1><p style="font-size:16px;line-height:1.6;margin:0">${escapeHtml(intro)}</p>${code}${itemList}${action}<p style="font-size:13px;line-height:1.5;color:#6d7781;margin:28px 0 0">If you did not expect this message, no action is required.</p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    definition.heading(locals),
    '',
    intro,
    key === 'sign_in_code' ? `\nCode: ${locals.code || ''}` : '',
    itemContent.text ? `\n${itemContent.text}` : '',
    definition.actionLabel && actionUrl ? `\n${definition.actionLabel}: ${actionUrl}` : '',
    '',
    'If you did not expect this message, no action is required.',
  ].filter((line) => line !== '').join('\n');
  return { subject, html, text };
}

export function listEmailTemplates(): EmailTemplateSummary[] {
  return (Object.keys(definitions) as EmailTemplateKey[])
    .filter((key): key is PublicEmailTemplateKey => key !== 'provider_verification')
    .map((key) => ({
      key,
      name: definitions[key].name,
      purpose: definitions[key].purpose,
      sampleSubject: renderEmailTemplate(key, SYNTHETIC_EMAIL_FIXTURE).subject,
    }));
}
