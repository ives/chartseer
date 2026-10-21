import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// A modal confirmation on the native <dialog>, which handles focus and Escape.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[20px] border border-border-card bg-card p-6 text-foreground shadow-lifted backdrop:bg-black/40"
    >
      <h2 id={titleId} className="font-serif text-xl font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-secondary">{message}</p>
      <div className="mt-6 flex justify-end gap-2 text-sm font-medium">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-border bg-card px-4 hover:border-border-strong"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 rounded-xl bg-accent px-4 text-accent-foreground"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
