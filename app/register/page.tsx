"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAutoLoggingIn = useRef(false);

  // Redirect if already logged in (but not during auto-login after registration)
  useEffect(() => {
    if (status === "authenticated" && !isAutoLoggingIn.current) {
      router.push("/");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Falha no registro");
      } else {
        // Set flag to prevent useEffect redirect during auto-login
        isAutoLoggingIn.current = true;

        // Auto-login the user after successful registration
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false
        });

        if (signInResult?.error) {
          // Registration succeeded but login failed - redirect to login page
          isAutoLoggingIn.current = false;
          router.push("/login?registered=true");
        } else {
          // Both registration and login succeeded - redirect to onboarding
          router.push("/onboarding");
          // Note: We keep isAutoLoggingIn.current = true to prevent redirect until /onboarding loads
        }
      }
    } catch (error) {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated (e.g., back button), don't render form while redirecting
  if (status === "authenticated" && !isAutoLoggingIn.current) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-4 px-6 sm:py-8 md:py-12">
      <div className="w-full max-w-sm min-w-[320px] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl space-y-6 sm:space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center">
                <span className="text-white font-semibold text-sm">A</span>
              </div>
              <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Arnaldo</h1>
            </div>
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">
            Crie sua conta
          </h2>
          <p className="mt-2 text-center text-sm sm:text-base text-neutral-600">
            Ou{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              entre em uma conta existente
            </Link>
          </p>
        </div>
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm sm:text-base font-medium text-neutral-700 mb-2">
                Nome (opcional)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 border border-neutral-300 placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-normal"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm sm:text-base font-medium text-neutral-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 border border-neutral-300 placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-normal"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm sm:text-base font-medium text-neutral-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 border border-neutral-300 placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-normal"
                placeholder="Pelo menos 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm sm:text-base font-medium text-neutral-700 mb-2">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 border border-neutral-300 placeholder-neutral-500 text-neutral-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-normal"
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 sm:py-4 sm:px-6 border border-transparent text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              ← Voltar para página inicial
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}