"use client";

import { useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";

type FrontendPushConfigResponse = {
  enabled: boolean;
  publicKey: string;
};

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

function encodeSubscriptionPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh || "",
      auth: json.keys?.auth || "",
    },
  };
}

export function PWARegister() {
  useEffect(() => {
    const allowInDev = process.env.NEXT_PUBLIC_ENABLE_PWA_PUSH_DEV === "true";
    if (process.env.NODE_ENV !== "production" && !allowInDev) return;
    if (!("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;
    if (!("Notification" in window)) return;
    if (
      window.location.pathname.startsWith("/login") ||
      window.location.pathname.startsWith("/account/login")
    ) {
      return;
    }

    let active = true;

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const config = await apiGet<FrontendPushConfigResponse>("/api/v1/frontend/pwa/push/config");
        if (!active || !config.enabled || !config.publicKey) return;

        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            await apiPost("/api/v1/frontend/pwa/push/unsubscribe", {
              endpoint: existingSubscription.endpoint,
            }).catch(() => null);
            await existingSubscription.unsubscribe().catch(() => false);
          }
          return;
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(config.publicKey),
          });
        }

        await apiPost("/api/v1/frontend/pwa/push/subscribe", encodeSubscriptionPayload(subscription));
      } catch {
        return;
      }
    };

    void registerPush();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
