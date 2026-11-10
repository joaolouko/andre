"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface AlertProps {
  type: "success" | "error" | "info";
  message: string;
  onClose?: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  if (!message) return null;

  const styles = {
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
    },
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
  }[type];

  return (
    <div
      className={`flex items-start justify-between gap-3 p-4 rounded-lg border ${styles.bg} text-sm transition-all shadow-xs`}
    >
      <div className="flex items-center gap-3">
        {styles.icon}
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/5 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

