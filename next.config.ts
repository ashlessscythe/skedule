import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    // Cloudflare Turnstile renders an iframe using `srcdoc` which includes inline
    // scripts. If the app is served behind an environment that injects a strict
    // CSP (nonces + Trusted Types), Turnstile will be blocked unless we provide
    // a compatible CSP.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Needed for shadcn/ui + Next inline styles.
      "style-src 'self' 'unsafe-inline'",
      // Turnstile needs inline script inside about:srcdoc + its remote script.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "connect-src 'self' https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Avoid legacy "X-" header sniffing behavior.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
