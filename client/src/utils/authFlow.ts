export type AuthIntent = 'protected' | 'react' | 'follow' | 'reply' | 'report' | 'contribute';

export interface AuthFlowContent {
  title: string;
  message: string;
  continuation: string;
}

const AUTH_INTENTS: AuthIntent[] = [
  'protected',
  'react',
  'follow',
  'reply',
  'report',
  'contribute',
];

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function isSafeInternalReturnUrl(value: string | null | undefined): boolean {
  const candidate = String(value || '').trim();
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    hasControlCharacter(candidate)
  ) {
    return false;
  }

  try {
    return new URL(candidate, 'https://wikitruth.invalid').origin === 'https://wikitruth.invalid';
  } catch (_error) {
    return false;
  }
}

export function safeReturnUrl(value: string | null | undefined): string {
  const candidate = String(value || '').trim();
  return isSafeInternalReturnUrl(candidate) ? candidate : '/';
}

export function parseAuthIntent(value: string | null | undefined): AuthIntent | null {
  const candidate = String(value || '').trim() as AuthIntent;
  return AUTH_INTENTS.includes(candidate) ? candidate : null;
}

export function buildSignInPath(returnUrl: string, intent: AuthIntent = 'protected'): string {
  const search = new URLSearchParams();
  search.set('returnUrl', safeReturnUrl(returnUrl));
  search.set('intent', intent);
  return `/login?${search.toString()}`;
}

function protectedDestination(returnUrl: string): string {
  const path = safeReturnUrl(returnUrl).split(/[?#]/, 1)[0];

  if (path.startsWith('/notifications')) return 'view your notifications';
  if (path.startsWith('/account')) return 'manage your account';
  if (path.startsWith('/admin')) return 'open the administration area';
  if (path.startsWith('/screening')) return 'open the screening workspace';
  if (path.startsWith('/profile')) return 'manage your profile';
  if (/\/(topics|arguments|questions|answers|issues|opinions|artifacts|groups)\/create(?:\/|$)/.test(path)) {
    return 'continue creating your contribution';
  }
  if (path.startsWith('/outline/link')) return 'continue linking this entry';
  return 'continue to this page';
}

export function getAuthFlowContent(intent: AuthIntent, returnUrl: string): AuthFlowContent {
  switch (intent) {
    case 'react':
      return {
        title: 'Sign in to react',
        message: 'Reactions are linked to an account so community signals remain accountable.',
        continuation: 'After signing in, you will return here and can choose your reaction.',
      };
    case 'follow':
      return {
        title: 'Sign in to follow this entry',
        message: 'Following keeps updates to this entry connected to your account.',
        continuation: 'After signing in, you will return here and can confirm Follow.',
      };
    case 'reply':
      return {
        title: 'Sign in to reply',
        message: 'Replies are attributed to an account and pass through the contribution workflow.',
        continuation: 'After signing in, you will continue to the reply form.',
      };
    case 'report':
      return {
        title: 'Sign in to report this entry',
        message: 'Reports are attributed to an account and reviewed by the moderation team.',
        continuation: 'After signing in, you will continue to the report form.',
      };
    case 'contribute':
      return {
        title: 'Sign in to contribute',
        message: 'Contributions are attributed to an account and reviewed through Wikitruth’s screening process.',
        continuation: 'After signing in, you will continue to the contribution form.',
      };
    case 'protected':
    default:
      return {
        title: `Sign in to ${protectedDestination(returnUrl)}`,
        message: 'This part of Wikitruth is available to authenticated accounts.',
        continuation: 'After signing in, you will return to the page you requested.',
      };
  }
}
