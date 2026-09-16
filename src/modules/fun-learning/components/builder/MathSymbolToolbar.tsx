// src/modules/fun-learning/components/builder/MathSymbolToolbar.tsx
'use client';

import React from 'react';

interface MathSymbolToolbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onInsertSymbol: (symbol: string) => void;
}

const mathSymbols = ['√', '²', '³', 'π', '×', '÷', '±', '≤', '≥', '≠', '°', '∞', '≈'];

export default function MathSymbolToolbar({ isOpen, onToggle, onInsertSymbol }: MathSymbolToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer font-extrabold"
        >
          {isOpen ? 'Tutup Bantuan Simbol ✕' : '⚙️ Bantuan Simbol Matematika'}
        </button>
      </div>

      {isOpen && (
        <div className="p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
          <div className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">
            Klik simbol untuk menyisipkan ke kotak input aktif terakhir:
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            {mathSymbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => onInsertSymbol(sym)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-bold rounded-lg border border-indigo-200 transition cursor-pointer shadow-xs"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}