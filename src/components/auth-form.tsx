"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Loader2, LogIn, UserPlus } from "lucide-react";
import { signIn, signUp, type AuthFormState } from "@/app/login/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: AuthFormState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    INITIAL_STATE
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    INITIAL_STATE
  );

  const isSignup = mode === "signup";
  const state = isSignup ? signupState : loginState;
  const pending = isSignup ? signupPending : loginPending;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14]/90 backdrop-blur-xl p-5 shadow-2xl shadow-black/30 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">
          {isSignup ? "Crea tu cuenta" : "Inicia sesión"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          {isSignup
            ? "Regístrate para guardar tus análisis."
            : "Accede para continuar con tus análisis."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/[0.04] p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`h-9 rounded-md text-sm font-medium transition-all ${
            !isSignup
              ? "bg-white/[0.08] text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`h-9 rounded-md text-sm font-medium transition-all ${
            isSignup
              ? "bg-white/[0.08] text-zinc-100 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Registro
        </button>
      </div>

      <form action={isSignup ? signupAction : loginAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            required
            className="h-11 bg-white/[0.04] border-white/[0.08]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-300">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
            className="h-11 bg-white/[0.04] border-white/[0.08]"
          />
        </div>

        {state.error && (
          <Alert variant="destructive" className="border-rose-500/20 bg-rose-500/10">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-rose-200">
              {state.error}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30"
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : isSignup ? (
            <UserPlus />
          ) : (
            <LogIn />
          )}
          {isSignup ? "Crear cuenta" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
