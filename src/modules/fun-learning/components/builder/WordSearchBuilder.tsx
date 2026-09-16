'use client';

import React from 'react';
import { Plus, Trash2, Search, HelpCircle } from 'lucide-react';

interface TargetWordItem {
  word: string;
  hint: string;
}

interface WordSearchConfig {
  clue: string;
  words: TargetWordItem[];
}

interface WordSearchBuilderProps {
  config: WordSearchConfig;
  onChange: (newConfig: WordSearchConfig) => void;
}

export default function WordSearchBuilder({ config, onChange }: WordSearchBuilderProps) {
  // Pastikan format words selalu berupa array objek
  const safeWords: TargetWordItem[] = (config.words || []).map(item => 
    typeof item === 'string' ? { word: item, hint: '' } : item
  );

  const handleClueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      clue: e.target.value,
    });
  };

  const handleItemChange = (index: number, field: 'word' | 'hint', value: string) => {
    const updatedWords = [...safeWords];
    if (field === 'word') {
      updatedWords[index].word = value.toUpperCase().replace(/[^A-Z]/g, '');
    } else {
      updatedWords[index].hint = value;
    }
    onChange({
      ...config,
      words: updatedWords,
    });
  };

  const handleAddWord = () => {
    if (safeWords.length >= 6) return; // Batas maksimal 6 kata
    onChange({
      ...config,
      words: [...safeWords, { word: '', hint: '' }],
    });
  };

  const handleRemoveWord = (index: number) => {
    const updatedWords = safeWords.filter((_, i) => i !== index);
    onChange({
      ...config,
      words: updatedWords,
    });
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm border-b pb-3">
        <Search className="w-5 h-5" />
        <span>Konfigurasi Builder: Word Search (Cari Kata)</span>
      </div>

      {/* Input Clue Utama */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
          Petunjuk / Clue Utama (Kategori)
        </label>
        <input
          type="text"
          value={config.clue || ''}
          onChange={handleClueChange}
          placeholder="Contoh: Berhubungan dengan peristiwa proklamasi kemerdekaan"
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-700 bg-slate-50/50"
        />
      </div>

      {/* Input Daftar Target Kata & Hint */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
            Daftar Target Kata & Hint (Maksimal 6 Kata)
          </label>
          <span className="text-xs font-bold text-slate-400">
            {safeWords.length}/6 Kata
          </span>
        </div>

        <div className="space-y-3">
          {safeWords.map((item, index) => (
            <div key={index} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                <input
                  type="text"
                  value={item.word}
                  onChange={(e) => handleItemChange(index, 'word', e.target.value)}
                  placeholder={`Kata target ${index + 1} (tanpa spasi)`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-bold uppercase tracking-wider text-slate-800 bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveWord(index)}
                  disabled={safeWords.length <= 1}
                  className="p-2.5 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Input Hint Tambahan (Panah Kuning) */}
              <div className="flex items-center gap-2 pl-7">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  type="text"
                  value={item.hint || ''}
                  onChange={(e) => handleItemChange(index, 'hint', e.target.value)}
                  placeholder="Hint / Petunjuk tambahan untuk kata ini (Opsional)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-amber-500 text-slate-600 bg-white"
                />
              </div>
            </div>
          ))}
        </div>

        {safeWords.length < 6 && (
          <button
            type="button"
            onClick={handleAddWord}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50/50 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" /> Tambah Kata Target
          </button>
        )}
      </div>
    </div>
  );
}