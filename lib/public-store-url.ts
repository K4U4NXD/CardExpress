export function buildPublicStorePath(slug: string): string {
  return slug.startsWith("/") ? slug : `/${slug}`;
}

export function buildAbsoluteUrlFromOrigin(path: string, origin: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedOrigin = origin.endsWith("/") ? origin : `${origin}/`;

  return new URL(normalizedPath, normalizedOrigin).toString();
}

export function buildAbsolutePublicStoreUrl(path: string, requestHeaders: Headers): string {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return path;
  }

  return buildAbsoluteUrlFromOrigin(path, `${proto}://${host}`);
}