'use client';

import React from 'react';
import { Plus, Trash2, HelpCircle, KeyRound } from 'lucide-react';

interface ScrambleItem {
    id: number | string;
    question: string;
    answer: string;
}

interface WordScrambleBuilderProps {
    config: { items: ScrambleItem[] };
    onChange: (newConfig: { items: ScrambleItem[] }) => void;
}

export default function WordScrambleBuilder({ config, onChange }: WordScrambleBuilderProps) {
    const items = config.items || [];

    const addItem = () => {
        onChange({
            items: [...items, { id: Date.now(), question: '', answer: '' }]
        });
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return; // Minimal sisakan 1 soal
        const updated = items.filter((_, i) => i !== index);
        onChange({ items: updated });
    };

    const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        onChange({ items: updated });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="text-xs font-black tracking-wider uppercase" style={{ color: 'var(--text-main)' }}>Daftar Soal Word Scramble</h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Masukkan petunjuk soal dan kata kunci yang harus disusun siswa.</p>
                </div>

            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="p-4 rounded-2xl border shadow-sm space-y-3 relative transition-all"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                    >
                        <div className="flex justify-between items-center text-xs font-extrabold" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1">SOAL #{index + 1}</span>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                                    title="Hapus Soal"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Input Petunjuk / Soal */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Petunjuk / Pertanyaan
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: Ibukota negara Indonesia..."
                                value={item.question}
                                onChange={(e) => updateItem(index, 'question', e.target.value)}
                                className="w-full p-3 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Input Kunci Jawaban */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                                <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Kata Kunci (Jawaban Benar)
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: JAKARTA"
                                value={item.answer}
                                onChange={(e) => updateItem(index, 'answer', e.target.value)}
                                className="w-full p-3 border rounded-xl text-xs font-black uppercase tracking-wider text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                            />
                        </div>

                    </div>
                ))}
                <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition transform active:scale-95 cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" /> Tambah Soal
                </button>
            </div>
        </div>
    );
}