import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/authContext";

export const metadata: Metadata = {
  title: "Gestão de Espaços - Sistema Administrativo",
  description: "Sistema para gerenciamento de espaços, empresas, disponibilidades, reservas e usuários",
};

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
        <html lang="pt-BR" className="h-full antialiased">
          <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
            <AuthProvider>{children}</AuthProvider>
          </body>
        </html>
        );
}
