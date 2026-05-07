'use client';

import Script from 'next/script';
import { useEffect, useId, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget(props: {
  siteKey: string;
  onToken: (token: string | null) => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const scriptId = useId();

  useEffect(() => {
    if (!scriptReady) return;
    if (!containerRef.current) return;
    if (!window.turnstile?.render) return;
    if (widgetIdRef.current) return;

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: props.siteKey,
      theme: props.theme ?? 'auto',
      size: props.size ?? 'normal',
      callback: (token) => props.onToken(token),
      'expired-callback': () => props.onToken(null),
      'error-callback': () => props.onToken(null),
    });
    widgetIdRef.current = widgetId;

    return () => {
      const id = widgetIdRef.current;
      if (id && window.turnstile?.remove) window.turnstile.remove(id);
      widgetIdRef.current = null;
    };
  }, [scriptReady, props]);

  return (
    <div className={props.className}>
      <Script
        id={`turnstile-${scriptId}`}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </div>
  );
}

