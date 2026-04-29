export interface BsoftHealth {
  ok: boolean;
  configured: boolean;
  status?: number;
  endpoint?: string;
  detail?: string;
  error?: string;
}

function joinUrl(base: string, path: string) {
  if (!path) return base;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function buildAuthHeader() {
  const explicit = process.env.BSOFT_BASIC_AUTH;
  if (explicit) {
    return explicit.toLowerCase().startsWith('basic ')
      ? explicit
      : `Basic ${Buffer.from(explicit).toString('base64')}`;
  }

  const username = process.env.BSOFT_USERNAME;
  const password = process.env.BSOFT_PASSWORD;
  if (!username || !password) return null;
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export async function checkBsoftHealth(baseUrl: string): Promise<BsoftHealth> {
  if (!baseUrl) {
    return { ok: false, configured: false, detail: 'BSOFT_BASE_URL ausente' };
  }

  const auth = buildAuthHeader();
  const healthPath = process.env.BSOFT_HEALTH_PATH || '';
  const url = joinUrl(baseUrl, healthPath);
  const headers: Record<string, string> = {};
  if (!auth) {
    return {
      ok: false,
      configured: false,
      endpoint: healthPath || '/',
      detail: 'Credenciais BSOFT nao configuradas no backend',
    };
  }
  headers.Authorization = auth;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(7000),
    });

    return {
      ok: response.status < 500,
      configured: true,
      status: response.status,
      endpoint: healthPath || '/',
      detail: response.status < 500 ? 'API respondeu' : 'API retornou erro 5xx',
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      endpoint: healthPath || '/',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
