"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  color?: "blue" | "emerald" | "amber" | "indigo" | "purple";
  description?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color = "blue",
  description,
}: StatCardProps) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  }[color];

  const content = (
    <div className="flex flex-col p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`flex items-center justify-center w-11 h-11 rounded-lg border ${colorStyles}`}
        >
          <Icon size={22} />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
          {value}
        </span>
      </div>

      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}

      {href && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 mt-4 group-hover:translate-x-1 transition-transform">
          <span>Gerenciar</span>
          <ArrowRight size={14} />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

