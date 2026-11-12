// A fake HTTP client with the same shape the package expects from `fetcher`:
// `(url) => Promise<{ data }>`. Routes are matched on the path (query string
// ignored). `getLatency()` is read per request, so the latency control in the
// UI applies immediately.
export function createMockFetcher({ routes, getLatency, onLog }) {
  return function fetcher(url) {
    const path = String(url).split('?')[0];
    const startedAt = performance.now();
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const route = routes[path];
        const ms = Math.round(performance.now() - startedAt);
        const status = route ? route.error ?? 200 : 404;
        onLog({ url, status, ms, at: new Date() });
        if (status !== 200) {
          const error = new Error(`Mock API: ${status} for ${url}`);
          error.response = { status };
          reject(error);
          return;
        }
        // Clone so the component can never mutate the mock "database".
        resolve({ data: structuredClone(route.data) });
      }, getLatency());
    });
  };
}
