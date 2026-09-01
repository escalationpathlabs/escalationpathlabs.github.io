(() => {
  const STRIPE_HOST = 'buy.stripe.com';
  const CAMPAIGN = 'breakfix-v1-1';
  const STORAGE_KEY = 'epl_attribution_v1';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  const pageName = (() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    return path ? path.replace(/[^a-zA-Z0-9_-]+/g, '-') : 'home';
  })();

  const readStored = () => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  };

  const writeStored = (value) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (_) {
      // Attribution is best-effort; checkout must never depend on storage.
    }
  };

  const params = new URLSearchParams(window.location.search);
  const attribution = readStored();

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) attribution[key] = value.slice(0, 150);
  }

  if (!attribution.utm_source) {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.hostname !== window.location.hostname) {
        attribution.utm_source = referrer.hostname.slice(0, 150);
        attribution.utm_medium = attribution.utm_medium || 'referral';
      }
    } catch (_) {
      // Ignore malformed or unavailable referrers.
    }
  }

  attribution.utm_source = attribution.utm_source || 'direct-site';
  attribution.utm_medium = attribution.utm_medium || 'website';
  attribution.utm_campaign = attribution.utm_campaign || CAMPAIGN;
  writeStored(attribution);

  const decorateStripeLink = (link) => {
    try {
      const url = new URL(link.href);
      if (url.hostname !== STRIPE_HOST) return;

      const values = { ...attribution };
      values.utm_content = values.utm_content || pageName;

      for (const key of UTM_KEYS) {
        if (values[key] && !url.searchParams.has(key)) {
          url.searchParams.set(key, values[key]);
        }
      }

      link.href = url.toString();
    } catch (_) {
      // Never interfere with the purchase link if URL parsing fails.
    }
  };

  document.querySelectorAll('a[href*="buy.stripe.com"]').forEach(decorateStripeLink);
})();