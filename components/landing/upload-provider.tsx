"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useRef, useState } from "react";
import { DropOverlay } from "@/components/studio/drop-overlay";
import { handOff } from "@/components/studio/handoff";
import { useFileDrop } from "@/components/studio/use-file-drop";

const ChooseFile = createContext<() => void>(() => {});

// Opens the file picker. For the landing page's Upload a CSV buttons.
export function useChooseFile() {
  return useContext(ChooseFile);
}

// The landing page's one client wrapper: dropping a CSV anywhere, the file
// picker the upload buttons open, and any error. A good file is read here with
// the app's checks and handed to /app in memory (D-067). The page itself stays
// server-rendered and passes through as children.
export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { dragging, handlers } = useFileDrop((file) => void loadFile(file), setError);

  // The reader loads only when a file arrives, so it costs the page nothing up front.
  async function loadFile(file: File) {
    setError(null);
    const { readUpload } = await import("@/lib/data/upload");
    const result = await readUpload(file);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    handOff({ name: file.name, csv: result.csv });
    router.push("/app");
  }

  return (
    <ChooseFile.Provider value={() => input.current?.click()}>
      <div className="flex min-h-full flex-1 flex-col bg-page text-foreground" {...handlers}>
        {children}
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so choosing the same file again still fires a change.
            event.target.value = "";
            if (file) void loadFile(file);
          }}
        />
        <div role="alert" className="pointer-events-none fixed inset-x-4 bottom-4 z-20 flex justify-center">
          {error && (
            <p className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border border-border-card bg-card py-3 pr-2 pl-4 text-sm text-danger shadow-raised">
              <span className="py-1.5">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="min-h-8 shrink-0 rounded-lg px-3 text-secondary hover:text-foreground"
              >
                Dismiss
              </button>
            </p>
          )}
        </div>
        {dragging && <DropOverlay />}
      </div>
    </ChooseFile.Provider>
  );
}
