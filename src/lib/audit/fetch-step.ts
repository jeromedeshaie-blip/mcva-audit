/**
 * Shared fetchStep utility used by audit UI pages (nouveau-audit, audit-complet).
 * Handles:
 * - Network errors with configurable retry count
 * - Vercel 504/502 timeouts (with retry)
 * - JSON parsing errors
 * - Server errors (non-JSON responses)
 *
 * POLE-PERFORMANCE v2.1 § 14 règle 6 — autonomie, retry auto avant de casser.
 */

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BROWSER_TIMEOUT_MS = 310_000; // >300s server max, leaves margin
const RETRY_DELAY_MS = 2000;

export interface FetchStepOptions {
  /** Number of retry attempts on network/timeout errors. Default: 2 (→ 3 attempts total). */
  retries?: number;
  /** Browser-side abort timeout. Default: 310s. */
  timeoutMs?: number;
  /** Label used in error messages. */
  label: string;
}

export async function fetchStep<T = any>(
  url: string,
  body: unknown,
  options: FetchStepOptions
): Promise<T> {
  const { retries = DEFAULT_MAX_RETRIES, timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS, label } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;

    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (networkErr) {
      if (attempt < retries) {
        console.warn(`[audit] Network error on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`Erreur reseau a l'etape "${label}". Verifiez votre connexion et reessayez.`);
    }

    // Handle Vercel timeout / non-JSON errors
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if ((res.status === 504 || res.status === 502) && attempt < retries) {
        console.warn(`[audit] Timeout on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error(`Timeout serveur a l'etape "${label}". Veuillez reessayer.`);
      }
      throw new Error(`Erreur serveur (${res.status}) a l'etape "${label}".`);
    }

    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || `Erreur ${res.status}`);
      throw new Error(`${msg} (etape "${label}")`);
    }
    return data as T;
  }

  throw new Error(`Echec apres ${retries + 1} tentatives a l'etape "${label}".`);
}
