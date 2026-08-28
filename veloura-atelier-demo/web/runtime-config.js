(() => {
  const host = window.location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1';
  const workerOrigin = 'https://veloura-atelier-demo-worker.example.invalid';
  window.VELOURA_API_BASE = local ? `${window.location.protocol}//${host}:8787/api` : (host.endsWith('workers.dev') ? '/api' : `${workerOrigin}/api`);
})();
