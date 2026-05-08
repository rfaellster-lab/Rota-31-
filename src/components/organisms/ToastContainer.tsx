/**
 * @file ToastContainer.tsx
 * @description Organism que renderiza a fila de toasts no topo direito.
 *              Mobile: top-center | Desktop: top-right.
 * @story Sprint 1 / S1-01
 * @agent @dev
 * @created 2026-05-08
 */
import { Toast } from '../atoms/Toast';
import { useToastStore } from '../../stores/useToastStore';

export function ToastContainer() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed top-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0"
    >
      {items.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
