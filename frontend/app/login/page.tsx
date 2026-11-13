"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import Alert from "../../components/Alert";

export default function LoginPage() {
  const router = useRouter();
  const { user, token, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (token && user) {
      router.push(user.role === "CLIENT" ? "/portal" : "/dashboard");
    }
  }, [token, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Por favor, informe seu email.");
      return;
    }
    if (!password) {
      setErrorMessage("Por favor, informe sua senha.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Falha na autenticação.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage("");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-2xl shadow-md mb-4">
            G
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Gestão de Espaços
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Entre com suas credenciais para acessar o painel
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          {errorMessage && (
            <div className="mb-6">
              <Alert
                type="error"
                message={errorMessage}
                onClose={() => setErrorMessage("")}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  disabled={isLoading}
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo account helper box for quick testing */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2.5">
              <ShieldCheck size={16} className="text-blue-600" />
              <span>Acesso rápido para avaliação:</span>
            </div>
            <button
              type="button"
              onClick={() => handleFillDemo("joao@email.com", "123456")}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors text-left"
            >
              <div>
                <p className="text-xs font-semibold text-blue-900">
                  joao@email.com
                </p>
                <p className="text-[11px] text-blue-700 font-mono">
                  Senha: 123456
                </p>
              </div>
              <span className="text-[11px] font-medium text-blue-600 underline">
                Preencher
              </span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Gestão de Espaços &copy; 2026 &bull; Projeto Acadêmico
        </p>
      </div>
    </div>
  );
}
