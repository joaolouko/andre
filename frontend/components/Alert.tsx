"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

interface AlertProps {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (type !== "error" || !message) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => acknowledgeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [type, message]);

  if (!message) return null;

  if (type === "error") {
    if (typeof document === "undefined") return null;

    const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        acknowledgeButtonRef.current?.focus();
      }
    };

    const errorDialog = (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-message"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-hidden="true" />
        <section className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20">
          <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-rose-600" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-rose-50 text-red-700 ring-1 ring-red-200/80">
                <AlertCircle size={25} strokeWidth={2.2} />
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold tracking-wide text-red-700 ring-1 ring-red-200">
                ERRO
              </span>
            </div>

            <h2 id="error-dialog-title" className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Ops, não foi possível realizar a ação
            </h2>
            <p id="error-dialog-message" className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {message}
            </p>

            <button
              ref={acknowledgeButtonRef}
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              Confirmar
            </button>
          </div>
        </section>
      </div>
    );

    return createPortal(errorDialog, document.body);
  }

  const styles = {
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
  }[type];

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border p-4 text-sm shadow-xs transition-all ${styles.bg}`}>
      <div className="flex items-center gap-3">
        {styles.icon}
        <span className="font-medium">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="rounded-md p-1 opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100"
        aria-label="Fechar aviso"
      >
        <X size={16} />
      </button>
    </div>
  );
}
