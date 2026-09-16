// src/modules/fun-learning/components/builder/MatchingPairBuilder.tsx
'use client';

import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import MathSymbolToolbar from './MathSymbolToolbar';

interface MatchingPairEditorProps {
  configData: any;
  onChange: (newConfig: any) => void;
  blockKey: string; // Unik key untuk identifier state panel simbol
}

export default function MatchingPairEditor({ configData, onChange, blockKey }: MatchingPairEditorProps) {
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [showSymbolPanels, setShowSymbolPanels] = useState<{ [key: string]: boolean }>({});

  const handleInsert = (symbol: string, pairIdx: number, field: 'left' | 'right') => {
    const inputId = `pair-${blockKey}-${pairIdx}-${field}`;
    const el = document.getElementById(inputId) as HTMLInputElement;
    
    const pairs = [...(configData.pairs || [])];
    const currentValue = pairs[pairIdx][field] || '';

    if (!el) {
      pairs[pairIdx][field] = currentValue + symbol;
      onChange({ ...configData, pairs });
      return;
    }

    const start = el.selectionStart || currentValue.length;
    const end = el.selectionEnd || currentValue.length;
    const newValue = currentValue.substring(0, start) + symbol + currentValue.substring(end);

    pairs[pairIdx][field] = newValue;
    onChange({ ...configData, pairs });

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Konfigurasi Pasangan Kartu</div>
      {configData.pairs?.map((pair: any, pIdx: number) => {
        const panelKey = `${blockKey}-${pIdx}`;
        const isPanelOpen = showSymbolPanels[panelKey] || false;

        return (
          <div key={pair.id || pIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Pasangan Soal #{pIdx + 1}</span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="w-full md:w-1/2">
                <input
                  id={`pair-${blockKey}-${pIdx}-left`}
                  type="text"
                  placeholder="Card kiri..."
                  className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 shadow-sm"
                  value={pair.left}
                  onChange={(e) => {
                    const pairs = [...configData.pairs];
                    pairs[pIdx].left = e.target.value;
                    onChange({ ...configData, pairs });
                  }}
                />
              </div>

              <div className="w-full md:w-1/2">
                <input
                  id={`pair-${blockKey}-${pIdx}-right`}
                  type="text"
                  placeholder="Card kanan..."
                  className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 shadow-sm"
                  value={pair.right}
                  onChange={(e) => {
                    const pairs = [...configData.pairs];
                    pairs[pIdx].right = e.target.value;
                    onChange({ ...configData, pairs });
                  }}
                />
              </div>

              {configData.pairs.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const pairs = configData.pairs.filter((_: any, i: number) => i !== pIdx);
                    onChange({ ...configData, pairs });
                  }}
                  className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer shadow-sm self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Toolbar Simbol General */}
            <MathSymbolToolbar
              isOpen={isPanelOpen}
              onToggle={() => setShowSymbolPanels({ ...showSymbolPanels, [panelKey]: !isPanelOpen })}
              onInsertSymbol={(sym) => {
                // Default ke kiri jika belum ada fokus spesifik
                handleInsert(sym, pIdx, 'left');
              }}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          const pairs = [...(configData.pairs || []), { id: Date.now(), left: '', right: '' }];
          onChange({ ...configData, pairs });
        }}
        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-300"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah Pasangan Kartu
      </button>
    </div>
  );
}