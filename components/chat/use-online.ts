"use client";

import { useSyncExternalStore } from "react";

// Whether the browser thinks it has a connection (D-047). It can say online
// when the server is still out of reach; a failed request covers that case.
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
