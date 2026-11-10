"use client";

  import { useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { useAuth } from "../lib/authContext";
  import { Loader2 } from "lucide-react";

  export default function HomePage() {
    const { token, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (token) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      }
    }, [token, isLoading, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-slate-500 font-medium mt-3">
            Redirecionando...
          </span>
        </div>
        );
}
