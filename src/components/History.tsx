import React from 'react';
import { SkinAnalysis } from '../types';
import { motion } from 'motion/react';
import { Clock, ChevronRight, Trash2 } from 'lucide-react';

interface HistoryProps {
  history: SkinAnalysis[];
  onSelect: (result: SkinAnalysis) => void;
  onDelete: (id: string) => void;
}

export const History: React.FC<HistoryProps> = ({ history, onSelect, onDelete }) => {
  if (history.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-400 mb-4">
        <Clock className="w-5 h-5" />
        <h3 className="font-medium uppercase tracking-wider text-sm">Historial Reciente</h3>
      </div>
      <div className="grid gap-3">
        {history.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors group text-left cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700">
              <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="text-white font-medium truncate">Análisis {item.skinType}</div>
              <div className="text-zinc-500 text-xs font-mono">
                {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-emerald-400 font-bold">{Math.round(item.skinScore)}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">Score</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                title="Eliminar historial"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
