export function getAppBaseUrl(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ?? '';
}

export function appUrl(path: string): string {
  const base = getAppBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
