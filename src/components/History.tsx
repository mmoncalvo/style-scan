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
      <div className="flex items-center gap-2 text-slate-400 mb-4 px-2">
        <Clock className="w-5 h-5" />
        <h3 className="font-bold uppercase tracking-wider text-sm">Historial Reciente</h3>
      </div>
      <div className="grid gap-4">
        {history.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-teal-100 transition-all group text-left cursor-pointer"
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-50">
              <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="text-slate-800 font-bold truncate">Análisis {item.skinType}</div>
              <div className="text-slate-500 text-xs mt-0.5">
                {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[#0B5C66] font-black text-lg">{Math.round(item.skinScore)}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Score</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                title="Eliminar historial"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#0B5C66] transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
