"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, CheckCircle2, FileText, Loader2, Zap } from "lucide-react";

interface UploadPhaseProps {
  onUploadComplete: (analysisId: string) => void;
}

export default function UploadPhase({ onUploadComplete }: UploadPhaseProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Solo se permiten archivos PDF.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecciona un archivo PDF.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al procesar el PDF");
      }

      const data = await res.json();
      onUploadComplete(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300 mb-4"
          >
            <Zap className="w-3.5 h-3.5" />
            Fase 1 — Extracción de Texto
          </motion.div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">
            Sube tu Currículum
          </h1>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Extraeremos el texto con 3 parsers diferentes para que veas cómo lo
            interpretan los sistemas ATS.
          </p>
        </div>

        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
            ${
              file
                ? "border-indigo-500/40 bg-indigo-500/5"
                : dragActive
                  ? "border-indigo-400/60 bg-indigo-500/10 scale-[1.01]"
                  : "border-zinc-800/60 hover:border-zinc-700/80 hover:bg-white/[0.02]"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            {file ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-2xl bg-indigo-500/15 flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-indigo-400" />
              </motion.div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center group-hover:bg-zinc-800">
                <UploadCloud className="w-8 h-8 text-zinc-500" />
              </div>
            )}
            <div>
              <p className="text-zinc-200 font-medium text-lg">
                {file ? file.name : "Arrastra tu PDF aquí"}
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : "o haz click para seleccionar — máximo 10MB"}
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Upload Button */}
        <motion.button
          onClick={handleUpload}
          disabled={loading || !file}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-200
            ${
              file && !loading
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-900/30"
                : "bg-zinc-800/60 text-zinc-500 cursor-not-allowed"
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Extrayendo texto...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Extraer Texto del CV
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
