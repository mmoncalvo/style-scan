import React, { useState, useCallback } from 'react';
import { Upload, FileImage, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageUploadProps {
  onUpload: (blob: Blob) => void;
  isAnalyzing: boolean;
}

export function ImageUpload({ onUpload, isAnalyzing }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFile(file);
      }
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelection = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer
              ${dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleChange}
            />
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Sube una foto</h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              Arrastra y suelta tu imagen aquí o haz clic para seleccionar un archivo de tu dispositivo.
            </p>
            <div className="mt-6 flex gap-4 text-xs text-zinc-600 uppercase tracking-widest font-medium">
              <span>JPG</span>
              <span>PNG</span>
              <span>WEBP</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800"
          >
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={clearSelection}
                className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                disabled={isAnalyzing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-white/80 text-sm bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                <FileImage className="w-4 h-4 text-emerald-500" />
                {selectedFile?.name}
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={isAnalyzing}
                className={`w-full max-w-xs py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl
                  ${isAnalyzing 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-[0.98]'}`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    Enviar a Analizar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
