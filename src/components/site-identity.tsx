"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SITE_TITLE = "PGR Web";
const FAVICON_HREF = "/icon-192.png";

function restoreSiteIdentity() {
  if (document.title !== SITE_TITLE) {
    document.title = SITE_TITLE;
  }

  const existingIcon = document.querySelector<HTMLLinkElement>(
    'link[data-pgr-site-icon="true"]',
  );
  const icon = existingIcon ?? document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/png";
  icon.href = FAVICON_HREF;
  icon.dataset.pgrSiteIcon = "true";
  if (!existingIcon) {
    document.head.appendChild(icon);
  }
}

/** Keeps the browser tab identity stable while the App Router changes stages. */
export function SiteIdentity() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/pgr/")) return;

    restoreSiteIdentity();
    const observer = new MutationObserver(restoreSiteIdentity);
    observer.observe(document.head, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
