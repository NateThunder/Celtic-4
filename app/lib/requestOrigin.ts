function firstHeaderValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const publicHost =
      firstHeaderValue(request.headers.get("x-forwarded-host")) ||
      firstHeaderValue(request.headers.get("host")) ||
      new URL(request.url).host;
    const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
    const publicProtocol = forwardedProtocol ? `${forwardedProtocol}:` : new URL(request.url).protocol;

    return originUrl.host === publicHost && originUrl.protocol === publicProtocol;
  } catch {
    return false;
  }
}
