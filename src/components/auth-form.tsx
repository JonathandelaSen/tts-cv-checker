"use client";

import { FormEvent, useActionState, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  MailCheck,
  UserPlus,
} from "lucide-react";
import {
  resendConfirmationEmail,
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
  const [resendState, resendAction, resendPending] = useActionState(
    resendConfirmationEmail,
    INITIAL_STATE
  );
  const [recoverState, setRecoverState] = useState<AuthFormState>(INITIAL_STATE);
  const [recoverPending, setRecoverPending] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === "signup";
  const isRecover = mode === "recover";
  const state = isRecover ? recoverState : isSignup ? signupState : loginState;
  const pending = isRecover ? recoverPending : isSignup ? signupPending : loginPending;
  const visibleError = resendState.message
    ? initialError
    : resendState.error || state.error || initialError;
  const visibleMessage = resendState.message || state.message || initialMessage;
  const resendEmail = state.email || resendState.email || emailValue.trim();
  const showResendConfirmation =
    !isRecover && (state.canResendConfirmation || resendState.canResendConfirmation);
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
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
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
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                className="h-11 border-white/[0.08] bg-white/[0.04] pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-2 flex w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {visibleError && (
          <Alert variant="destructive" className="border-rose-500/20 bg-rose-500/10">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-rose-200">
              {visibleError}
            </AlertDescription>
          </Alert>
        )}

        {visibleMessage && (
          <Alert className="border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <AlertDescription className="text-emerald-200">
              {visibleMessage}
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

      {showResendConfirmation && (
        <form action={resendAction} className="mt-4">
          <input type="hidden" name="email" value={resendEmail} />
          <Button
            type="submit"
            variant="outline"
            disabled={resendPending || !resendEmail}
            className="h-10 w-full border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
          >
            {resendPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MailCheck />
            )}
            Reenviar email de confirmación
          </Button>
        </form>
      )}

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
