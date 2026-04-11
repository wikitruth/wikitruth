import { useCallback, useRef, useEffect } from 'react';

const RECAPTCHA_SITE_KEY =
  typeof process !== 'undefined' ? process.env.REACT_APP_RECAPTCHA_SITE_KEY : undefined;

interface RecaptchaWindow extends Window {
  grecaptcha?: {
    ready: (cb: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  };
}

let scriptLoaded = false;

function loadScript(): void {
  if (scriptLoaded || typeof window === 'undefined' || !RECAPTCHA_SITE_KEY) return;
  scriptLoaded = true;
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export function useRecaptcha() {
  const siteKey = useRef(RECAPTCHA_SITE_KEY);

  useEffect(() => {
    loadScript();
  }, []);

  const execute = useCallback(
    async (action: string): Promise<string | null> => {
      const key = siteKey.current;
      if (!key) return null;
      const win = window as unknown as RecaptchaWindow;
      if (!win.grecaptcha) return null;
      return new Promise((resolve) => {
        win.grecaptcha!.ready(async () => {
          try {
            const token = await win.grecaptcha!.execute(key, { action });
            resolve(token);
          } catch {
            resolve(null);
          }
        });
      });
    },
    [],
  );

  const isEnabled = Boolean(siteKey.current);

  return { execute, isEnabled };
}

export default useRecaptcha;
