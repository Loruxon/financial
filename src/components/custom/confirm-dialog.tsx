"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { messages } from "@/messages/ru";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` для необратимых/опасных действий. */
  variant?: "default" | "destructive";
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

/** Монтируется один раз в корневом layout, рядом с `ThemeProvider`. */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<Confirm>((options) => {
    return new Promise((resolve) => setPending({ options, resolve }));
  }, []);

  function settle(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && settle(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.options.title}</AlertDialogTitle>
            {pending?.options.description ? (
              <AlertDialogDescription>
                {pending.options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {pending?.options.cancelLabel ?? messages.common.actions.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={
                pending?.options.variant === "destructive"
                  ? "destructive"
                  : "default"
              }
              onClick={() => settle(true)}
            >
              {pending?.options.confirmLabel ?? messages.common.actions.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Подтверждение необратимых действий из кода, без собственной разметки диалога.
 *
 * @example
 * const confirm = useConfirm();
 * if (await confirm({ title: "Удалить контрагента?", variant: "destructive" })) { ... }
 */
export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error(
      "useConfirm() должен вызываться внутри ConfirmDialogProvider",
    );
  return ctx;
}
