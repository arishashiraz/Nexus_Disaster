// Cache only the public application shell, never API responses or credentials.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const announce = () => {
        if (registration.waiting)
          window.dispatchEvent(new CustomEvent('nexus:update', { detail: registration.waiting }));
      };
      announce();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
      let reloading = false,
        hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !reloading) {
          reloading = true;
          window.location.reload();
        }
        hadController = true;
      });
    } catch (error) {
      console.warn('App installation support could not start:', error.message);
    }
  });
}
