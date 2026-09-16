// src/modules/fun-learning/components/builder/EquationBalanceBuilder.tsx
'use client';

import React from 'react';
import { Plus, Trash2, Scale } from 'lucide-react';

interface QuestionItem {
  question: string;
  variable: string;
  targetValue: number;
  options: number[];
  hint?: string;
}

interface EquationBalanceBuilderProps {
  config: {
    questions: QuestionItem[];
  };
  onChange: (newConfig: any) => void;
}

export default function EquationBalanceBuilder({ config, onChange }: EquationBalanceBuilderProps) {
  const questions = config.questions || [];

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...config, questions: updated });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = Number(value) || 0;
    updated[qIndex].options = newOptions;
    onChange({ ...config, questions: updated });
  };

  const addQuestion = () => {
    onChange({
      ...config,
      questions: [
        ...questions,
        {
          question: '3x + 6 = 18',
          variable: 'x',
          targetValue: 4,
          options: [2, 3, 4, 5],
          hint: 'Pindahkan konstanta terlebih dahulu.'
        }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const updated = questions.filter((_, idx) => idx !== index);
    onChange({ ...config, questions: updated });
  };

  return (
    <div className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400">
          <Scale className="w-4 h-4" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Konfigurasi Equation Balance</span>
        </div>
        <span className="text-[10px] text-slate-500">{questions.length} Soal</span>
      </div>

      <div className="space-y-4">
        {questions.map((item, qIndex) => (
          <div key={qIndex} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400">Soal #{qIndex + 1}</span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Persamaan Aljabar</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                  placeholder="Cth: 2x + 5 = 15"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Variabel</label>
                <input
                  type="text"
                  value={item.variable}
                  onChange={(e) => handleQuestionChange(qIndex, 'variable', e.target.value)}
                  placeholder="x"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Jawaban Benar (Target Nilai)</label>
                <input
                  type="number"
                  value={item.targetValue}
                  onChange={(e) => handleQuestionChange(qIndex, 'targetValue', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Petunjuk / Hint</label>
                <input
                  type="text"
                  value={item.hint || ''}
                  onChange={(e) => handleQuestionChange(qIndex, 'hint', e.target.value)}
                  placeholder="Opsional..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">4 Pilihan Angka Opsi</label>
              <div className="grid grid-cols-4 gap-2">
                {item.options.map((opt, optIndex) => (
                  <input
                    key={optIndex}
                    type="number"
                    value={opt}
                    onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 text-xs text-center text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
     data-node-id="add-question-btn"
          onClick={addQuestion}
          className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Soal Persamaan Baru
        </button>
      </div>
    </div>
  );
}