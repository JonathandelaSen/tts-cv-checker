"use client";

import { FormEvent, useActionState, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import {
  signIn,
  signUp,
  type AuthFormState,
} from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: AuthFormState = {};

interface AuthFormProps {
  initialError?: string;
  initialMessage?: string;
}

export function AuthForm({ initialError, initialMessage }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "signup" | "recover">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    INITIAL_STATE
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    INITIAL_STATE
  );
  const [recoverState, setRecoverState] = useState<AuthFormState>(INITIAL_STATE);
  const [recoverPending, setRecoverPending] = useState(false);

  const isSignup = mode === "signup";
  const isRecover = mode === "recover";
  const state = isRecover ? recoverState : isSignup ? signupState : loginState;
  const pending = isRecover ? recoverPending : isSignup ? signupPending : loginPending;
  const title = isRecover
    ? "Recuperar contraseña"
    : isSignup
      ? "Crea tu cuenta"
      : "Inicia sesión";
  const description = isRecover
    ? "Te enviaremos un enlace para establecer una nueva contraseña."
    : isSignup
      ? "Regístrate para guardar tus análisis."
      : "Accede para continuar con tus análisis.";

  async function handleRecoverSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    if (!email) {
      setRecoverState({ error: "Introduce tu email." });
      return;
    }

    setRecoverPending(true);
    setRecoverState({});

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/account/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setRecoverPending(false);

    if (error) {
      setRecoverState({
        error: "No he podido enviar el email de recuperación.",
      });
      return;
    }

    setRecoverState({
      message:
        "Si existe una cuenta con ese email, recibirás un enlace para cambiar la contraseña.",
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d14]/90 backdrop-blur-xl p-5 shadow-2xl shadow-black/30 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">{title}</h2>
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
      </div>

      {!isRecover && (
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
      )}

      <form
        action={isRecover ? undefined : isSignup ? signupAction : loginAction}
        onSubmit={isRecover ? handleRecoverSubmit : undefined}
        className="space-y-4"
      >
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

        {!isRecover && (
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
        )}

        {(state.error || initialError) && (
          <Alert variant="destructive" className="border-rose-500/20 bg-rose-500/10">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-rose-200">
              {state.error || initialError}
            </AlertDescription>
          </Alert>
        )}

        {(state.message || initialMessage) && (
          <Alert className="border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <AlertDescription className="text-emerald-200">
              {state.message || initialMessage}
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
          ) : isRecover ? (
            <KeyRound />
          ) : isSignup ? (
            <UserPlus />
          ) : (
            <LogIn />
          )}
          {isRecover ? "Enviar enlace" : isSignup ? "Crear cuenta" : "Entrar"}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        {isRecover ? (
          <>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Volver a login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Ir a registro
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMode("recover")}
            className="font-medium text-indigo-300 transition-colors hover:text-indigo-200"
          >
            Recuperar contraseña
          </button>
        )}
      </div>
    </div>
  );
}
