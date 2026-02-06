export type LinkCheckStatus = "ok" | "redirect" | "restricted" | "broken" | "timeout";

export type LinkCheckResult = {
  status: LinkCheckStatus;
  httpStatus?: number;
};

const RESTRICTED = new Set([401, 403, 429]);

async function fetchWithFallback(url: string, timeoutMs: number) {
  const tryFetch = (method: "HEAD" | "GET") =>
    fetch(url, { method, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });

  try {
    let res = await tryFetch("HEAD");
    if ([405, 501].includes(res.status)) {
      res = await tryFetch("GET");
    }
    return res;
  } catch (err) {
    throw err;
  }
}

export async function checkUrl(url: string, timeoutMs = 8000): Promise<LinkCheckResult> {
  try {
    const res = await fetchWithFallback(url, timeoutMs);
    if (res.status >= 200 && res.status < 300) {
      return { status: "ok", httpStatus: res.status };
    }
    if (res.status >= 300 && res.status < 400) {
      return { status: "redirect", httpStatus: res.status };
    }
    if (RESTRICTED.has(res.status)) {
      return { status: "restricted", httpStatus: res.status };
    }
    return { status: "broken", httpStatus: res.status };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return { status: isAbort ? "timeout" : "broken" };
  }
}

