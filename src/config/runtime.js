/** Runtime flags — override via window.__BOM_*__ or Vite env (esbuild: env kosong). */
export function getRuntimeConfig() {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  const env = import.meta?.env ?? {};
  const apiBase =
    g.__BOM_API_BASE__ ||
    env.VITE_API_BASE_URL ||
    env.VITE_MASTER_API_BASE_URL ||
    '';

  return {
    masterSource: g.__BOM_MASTER_SOURCE__ || env.VITE_MASTER_SOURCE || 'seed',
    projectSource: g.__BOM_PROJECT_SOURCE__ || env.VITE_PROJECT_SOURCE || 'local',
    apiBaseUrl: apiBase,
    apiToken: g.__BOM_API_TOKEN__ || env.VITE_API_TOKEN || '',
  };
}

export function isMasterApiMode() {
  return getRuntimeConfig().masterSource === 'api' && !!getRuntimeConfig().apiBaseUrl;
}

export function isProjectApiMode() {
  return getRuntimeConfig().projectSource === 'api' && !!getRuntimeConfig().apiBaseUrl;
}
