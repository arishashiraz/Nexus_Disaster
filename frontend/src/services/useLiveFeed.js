import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

// Every feed owns its request lifecycle and error. A slow old location cannot
// replace the currently selected one, and unmount cancels in-flight requests.
export function useLiveFeed(path, interval) {
  const [snapshot, setSnapshot] = useState({ path, data: null, error: '', busy: true });
  const request = useRef(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSnapshot((old) => ({ ...old, path, busy: true }));
    try {
      const { data } = await api.get(path, { signal: controller.signal });
      if (!controller.signal.aborted) setSnapshot({ path, data, error: '', busy: false });
    } catch (error) {
      if (!controller.signal.aborted)
        setSnapshot({ path, data: null, error: errorMessage(error), busy: false });
    }
  }, [path]);
  useEffect(() => {
    setSnapshot({ path, data: null, error: '', busy: true });
    refresh();
    const timer = setInterval(refresh, interval);
    return () => {
      clearInterval(timer);
      request.current?.abort();
    };
  }, [path, interval, refresh]);
  return {
    ...(snapshot.path === path ? snapshot : { data: null, error: '', busy: true }),
    refresh,
  };
}
