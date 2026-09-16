// src/modules/fun-learning/components/builder/CardQuizBuilder.tsx
'use client';

import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import MathSymbolToolbar from './MathSymbolToolbar';

interface CardQuizEditorProps {
  configData: any;
  onChange: (newConfig: any) => void;
  blockKey: string;
}

export default function CardQuizEditor({ configData, onChange, blockKey }: CardQuizEditorProps) {
  const [showSymbolPanels, setShowSymbolPanels] = useState<{ [key: string]: boolean }>({});

  const handleInsert = (symbol: string, qIdx: number, targetField: 'question' | number) => {
    const questions = [...(configData.questions || [])];
    
    if (targetField === 'question') {
      const el = document.getElementById(`quiz-${blockKey}-${qIdx}-question`) as HTMLInputElement;
      const val = questions[qIdx].question || '';
      const start = el?.selectionStart || val.length;
      const end = el?.selectionEnd || val.length;
      questions[qIdx].question = val.substring(0, start) + symbol + val.substring(end);
    } else {
      const oIdx = targetField;
      const el = document.getElementById(`quiz-${blockKey}-${qIdx}-opt-${oIdx}`) as HTMLInputElement;
      const val = questions[qIdx].options[oIdx] || '';
      const start = el?.selectionStart || val.length;
      const end = el?.selectionEnd || val.length;
      questions[qIdx].options[oIdx] = val.substring(0, start) + symbol + val.substring(end);
    }

    onChange({ ...configData, questions });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Konfigurasi Soal Kuis Kartu</div>
      {configData.questions?.map((q: any, qIdx: number) => {
        const panelKey = `${blockKey}-q-${qIdx}`;
        const isPanelOpen = showSymbolPanels[panelKey] || false;

        return (
          <div key={q.id || qIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600">Soal #{qIdx + 1}</span>
              {configData.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const questions = configData.questions.filter((_: any, i: number) => i !== qIdx);
                    onChange({ ...configData, questions });
                  }}
                  className="text-xs text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <input
              id={`quiz-${blockKey}-${qIdx}-question`}
              type="text"
              placeholder="Tulis pertanyaan di sini..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none font-semibold text-slate-800"
              value={q.question}
              onChange={(e) => {
                const questions = [...configData.questions];
                questions[qIdx].question = e.target.value;
                onChange({ ...configData, questions });
              }}
            />

            <div className="space-y-2 pl-2 border-l border-blue-200">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilihan Opsi & Kunci Jawaban</span>
              {q.options.map((opt: string, oIdx: number) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                    q.correct_index === oIdx ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <input
                    id={`quiz-${blockKey}-${qIdx}-opt-${oIdx}`}
                    type="text"
                    placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                    value={opt}
                    onChange={(e) => {
                      const questions = [...configData.questions];
                      questions[qIdx].options[oIdx] = e.target.value;
                      onChange({ ...configData, questions });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const questions = [...configData.questions];
                      questions[qIdx].correct_index = oIdx;
                      onChange({ ...configData, questions });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition shrink-0 ${
                      q.correct_index === oIdx 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {q.correct_index === oIdx ? 'Kunci Benar' : 'Jadikan Kunci'}
                  </button>
                </div>
              ))}
            </div>

            {/* Toolbar Simbol General untuk Pertanyaan/Opsi */}
            <MathSymbolToolbar
              isOpen={isPanelOpen}
              onToggle={() => setShowSymbolPanels({ ...showSymbolPanels, [panelKey]: !isPanelOpen })}
              onInsertSymbol={(sym) => handleInsert(sym, qIdx, 'question')}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          const questions = [...(configData.questions || []), { id: Date.now(), question: '', options: ['', '', '', ''], correct_index: 0 }];
          onChange({ ...configData, questions });
        }}
        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-300"
      >
        <Plus className="w-3.5 h-3.5" /> Tambah Soal Kuis
      </button>
    </div>
  );
}