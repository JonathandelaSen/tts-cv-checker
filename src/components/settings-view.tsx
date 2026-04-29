"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  removeStoredGeminiApiKey,
  saveStoredGeminiApiKey,
} from "@/lib/browser-preferences";

interface SettingsViewProps {
  geminiApiKey: string;
  onGeminiApiKeyChange: (apiKey: string) => void;
}

export default function SettingsView({
  geminiApiKey,
  onGeminiApiKeyChange,
}: SettingsViewProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputValue = draftValue ?? geminiApiKey;

  const keySummary = useMemo(() => {
    if (!geminiApiKey) return "No configurada";
    if (geminiApiKey.length <= 12) return "Configurada";
    return `${geminiApiKey.slice(0, 6)}...${geminiApiKey.slice(-4)}`;
  }, [geminiApiKey]);

  const handleSave = () => {
    const savedKey = saveStoredGeminiApiKey(inputValue);
    onGeminiApiKeyChange(savedKey);
    setDraftValue(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const handleRemove = () => {
    removeStoredGeminiApiKey();
    onGeminiApiKeyChange("");
    setDraftValue("");
    setSaved(false);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-5 border-b border-white/[0.06] pb-6"
        >
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300">
              <KeyRound className="h-3.5 w-3.5" />
              Configuración
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100">
              API Key de Gemini
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Añade tu clave para ejecutar análisis con Gemini desde esta web.
              Se usará solo cuando pulses analizar.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Estado
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-200">
              {keySummary}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-5"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-sm font-semibold text-amber-100">
                Tu clave no se guarda en nuestro servidor.
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-100/75">
                Se guarda solo en las preferencias de este navegador y se envía
                únicamente durante el análisis. No se almacena en Supabase, en
                la base de datos ni en variables de entorno del servidor.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
        >
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Clave API
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={inputValue}
                onChange={(event) => {
                  setDraftValue(event.target.value);
                  setSaved(false);
                }}
                placeholder="Pega tu API key de Gemini"
                className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0a0a12] px-4 pr-12 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="absolute inset-y-0 right-2 flex w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                title={showKey ? "Ocultar clave" : "Mostrar clave"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!inputValue.trim()}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Guardada
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={!geminiApiKey && !inputValue}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/15 hover:text-rose-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Borrar
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-600">
            Si usas otro navegador o dispositivo tendrás que configurar la clave
            de nuevo.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
