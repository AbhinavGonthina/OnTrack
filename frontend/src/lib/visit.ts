const PING = "https://visits.agonthina.workers.dev/";
const SITE = "o";
const HOSTS = ["ontrack.abhinavgonthina.dev"];

export function countVisit() {
  if (typeof window === "undefined") return;
  // An allowlist, not a localhost check: this must not fire from a
  // dev server or from a Vercel preview deployment, and previews get
  // a fresh hostname every push.
  if (!HOSTS.includes(window.location.hostname)) return;
  // The landing page only. OnTrack is an app I use daily, and a
  // beacon on the authenticated routes would notify me about myself
  // every morning.
  if (window.location.pathname !== "/") return;
  // window.doNotTrack is a legacy (old Safari/IE) spelling that TypeScript's DOM types no
  // longer declare, hence the cast.
  if (navigator.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1") return;

  const send = () => {
    const q = new URLSearchParams({
      site: SITE,
      p: window.location.pathname,
      r: document.referrer,
      // Documented as ignored; stops a proxy serving the same pixel
      // out of cache instead of asking for it again.
      rnd: Math.random().toString(36).slice(2),
    });
    // An Image, not fetch: no CORS preflight, no unhandled promise,
    // and a failure is silent, which is right for something nobody
    // is waiting on.
    new Image().src = `${PING}?${q}`;
  };

  if (document.readyState === "complete") send();
  else window.addEventListener("load", send, { once: true });
}
