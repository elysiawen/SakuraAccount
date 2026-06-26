import Script from 'next/script';

// ── Analytics (Server Component) ─────────────────────────────────

export function Analytics() {
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;
  const umamiScriptUrl = process.env.UMAMI_SCRIPT_URL;
  const gaId = process.env.GOOGLE_ANALYTICS_ID;
  const clarityId = process.env.CLARITY_ID;

  const hasAny = (umamiWebsiteId && umamiScriptUrl) || gaId || clarityId;
  if (!hasAny) return null;

  return (
    <>
      {umamiWebsiteId && umamiScriptUrl && (
        <Script defer src={umamiScriptUrl} data-website-id={umamiWebsiteId} strategy="afterInteractive" />
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {clarityId && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
