// hCaptcha widget. Loads the provider script once, renders a challenge, and
// hands the resulting token back via onChange. The token is submitted as
// `captchaToken` and verified server-side — this widget is only the collector,
// never the gate. The site key is fetched from the backend at runtime so the
// server remains the source of truth for captcha configuration.
import { useEffect, useRef, useState } from 'react';
import { getCaptchaConfig } from '../api/captcha';

const SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit';
const SCRIPT_ID = 'hcaptcha-script';

// Resolves once window.hcaptcha is available (script loaded once, shared).
function loadHcaptcha() {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(window.hcaptcha));
    script.addEventListener('error', reject);
  });
}

export default function Captcha({ onChange }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [siteKey, setSiteKey] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    getCaptchaConfig()
      .then(({ siteKey: backendSiteKey }) => {
        if (cancelled) return;
        if (!backendSiteKey) {
          setError('CAPTCHA is not configured on the server.');
          return;
        }
        setSiteKey(backendSiteKey);
      })
      .catch(() => !cancelled && setError('Could not load the CAPTCHA configuration. Please refresh.'))
      .finally(() => !cancelled && setLoadingConfig(false));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!siteKey) return undefined;

    let cancelled = false;

    loadHcaptcha()
      .then((hcaptcha) => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onChange(token),
          'expired-callback': () => onChange(''),
          'error-callback': () => onChange(''),
        });
      })
      .catch(() => !cancelled && setError('Could not load the CAPTCHA. Please refresh.'));

    return () => {
      cancelled = true;
    };
    // onChange is intentionally not a dependency: the widget is rendered once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (error) {
    return <div className="alert alert-error" role="alert">{error}</div>;
  }
  if (loadingConfig) {
    return <div className="muted" aria-live="polite">Loading CAPTCHA…</div>;
  }
  return <div ref={containerRef} style={{ margin: 'var(--space-3) 0' }} />;
}
