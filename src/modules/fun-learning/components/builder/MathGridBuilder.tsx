// src/modules/fun-learning/components/builder/MathGridBuilder.tsx
'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface EquationItem {
  equation: string;
  hint: string;
}

interface MathGridBuilderProps {
  config: {
    clue?: string;
    equations: EquationItem[];
  };
  onChange: (newConfig: any) => void;
}

export default function MathGridBuilder({ config, onChange }: MathGridBuilderProps) {
  const clue = config.clue || '';
  const equations = config.equations || [];

  const handleClueChange = (newClue: string) => {
    onChange({ ...config, clue: newClue });
  };

  const handleEquationChange = (index: number, field: 'equation' | 'hint', value: string) => {
    const updated = [...equations];
    updated[index][field] = value;
    onChange({ ...config, equations: updated });
  };

  const addEquation = () => {
    onChange({
      ...config,
      equations: [...equations, { equation: '', hint: '' }]
    });
  };

  const removeEquation = (index: number) => {
    if (equations.length === 1) return; // Minimal 1 baris
    const updated = equations.filter((_, idx) => idx !== index);
    onChange({ ...config, equations: updated });
  };

  return (
    <div className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1.5">Petunjuk / Clue Utama</label>
        <input
          type="text"
          value={clue}
          onChange={(e) => handleClueChange(e.target.value)}
          placeholder="Misal: Temukan pola operasi hitung di bawah ini!"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300">Daftar Persamaan / Operasi Hitung</label>
          <span className="text-[10px] text-slate-500">{equations.length} Item</span>
        </div>

        {equations.map((item, index) => (
          <div key={index} className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-indigo-400 w-5 text-center">{index + 1}</span>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={item.equation}
                onChange={(e) => handleEquationChange(index, 'equation', e.target.value)}
                placeholder="Persamaan (Cth: 4+5=9)"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={item.hint}
                onChange={(e) => handleEquationChange(index, 'hint', e.target.value)}
                placeholder="Catatan / Petunjuk kecil"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            {equations.length > 1 && (
              <button
                type="button"
                onClick={() => removeEquation(index)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addEquation}
          className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Persamaan Baru
        </button>
      </div>
    </div>
  );
}