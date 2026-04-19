import React from 'react';
import { SkinAnalysis } from '../types';
import { motion } from 'motion/react';
import { Clock, ChevronRight, Trash2, Loader2 } from 'lucide-react';

interface HistoryProps {
  history: SkinAnalysis[] | null;
  onSelect: (result: SkinAnalysis) => void;
  onDelete: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ history, onSelect, onDelete }) => {
  if (history === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="font-medium">Cargando historial...</p>
      </div>
    );
  }

  if (history.length === 0) return null;

  // Ensure items are sorted by date descending for UI consistency
  const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {sortedHistory.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md dark:hover:shadow-slate-900/50 hover:border-teal-100 dark:hover:border-teal-900/50 transition-all group text-left cursor-pointer transition-colors duration-300"
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 transition-colors duration-300">
              <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="text-slate-800 dark:text-white font-bold truncate">Análisis {item.skinType}</div>
              <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[#0B5C66] dark:text-teal-400 font-black text-lg">{Math.round(item.skinScore)}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Score</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-2"
                title="Eliminar historial"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-slate-700 group-hover:text-[#0B5C66] dark:group-hover:text-teal-400 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
