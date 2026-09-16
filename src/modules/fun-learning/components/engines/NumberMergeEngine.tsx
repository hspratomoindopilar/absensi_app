// src/modules/fun-learning/components/engines/NumberMergeEngine.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, RotateCcw, Plus, Minus, X, Divide, Calculator } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playBipSound, playSuccessSound } from '@/utils/soundEffect';

interface NumberMergeItem {
  target: number;
  availableNumbers: number[];
  hint?: string;
}

interface NumberMergeEngineProps {
  items: NumberMergeItem[];
  mode?: 'practice' | 'challenge';
  onComplete: (score: number, accuracy: number, timeTaken: number) => void;
}

export default function NumberMergeEngine({ items = [], mode = 'challenge', onComplete }: NumberMergeEngineProps) {
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [expression, setExpression] = useState<(number | string)[]>([]);
  const [availablePool, setAvailablePool] = useState<{ id: number; val: number; used: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = items[currentIndex];

  useEffect(() => {
    if (currentItem && currentItem.availableNumbers) {
      setAvailablePool(
        currentItem.availableNumbers.map((num, idx) => ({ id: idx, val: num, used: false }))
      );
      setExpression([]);
      setFeedbackMessage(null);
    }
  }, [currentIndex, currentItem]);

  if (!items || items.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-400">Konfigurasi Number Merge kosong.</div>;
  }

  const handleSelectNumber = (id: number, val: number) => {
    playBipSound();
    setAvailablePool((prev) => prev.map((item) => (item.id === id ? { ...item, used: true } : item)));
    setExpression((prev) => [...prev, val]);
  };

  const handleSelectOperator = (op: string) => {
    playBipSound();
    setExpression((prev) => [...prev, op]);
  };

  const handleUndoExpression = () => {
    playBipSound();
    if (expression.length === 0) return;
    const lastItem = expression[expression.length - 1];

    if (typeof lastItem === 'number') {
      // Kembalikan status 'used' pada pool angka pertama yang cocok
      setAvailablePool((prev) => {
        const targetIndex = prev.findIndex((p) => p.val === lastItem && p.used);
        if (targetIndex !== -1) {
          const updated = [...prev];
          updated[targetIndex] = { ...updated[targetIndex], used: false };
          return updated;
        }
        return prev;
      });
    }

    setExpression((prev) => prev.slice(0, -1));
  };

  const handleResetExpression = () => {
    playBipSound();
    setAvailablePool((prev) => prev.map((item) => ({ ...item, used: false })));
    setExpression([]);
    setFeedbackMessage(null);
  };

  const handleEvaluateExpression = () => {
    if (expression.length === 0) return;

    try {
      // Gabungkan array menjadi string ekspresi matematika yang aman dievaluasi
      const expString = expression.join(' ');
      // Menggunakan Function sebagai pengganti eval murni untuk kalkulasi aritmatika
      const result = Function(`'use strict'; return (${expString})`)();

      if (result === currentItem.target) {
        playSuccessSound();
        setFeedbackMessage('Benar! Hasil perhitungan pas dengan target!');
        setScore((prev) => prev + Math.round(100 / items.length));
        setCorrectCount((prev) => prev + 1);

        setTimeout(() => {
          if (currentIndex + 1 < items.length) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            confetti({
              particleCount: mode === 'challenge' ? 120 : 60,
              spread: 80,
              origin: { y: 0.6 }
            });
            const timeTaken = Math.round((Date.now() - startTime) / 1000);
            const finalAccuracy = Math.round(((correctCount + 1) / items.length) * 100);

            setTimeout(() => {
              onComplete(100, finalAccuracy, timeTaken);
            }, 1500);
          }
        }, 1200);
      } else {
        setFeedbackMessage(`Hasil saat ini: ${result}. Belum sesuai target ${currentItem.target}!`);
      }
    } catch (err) {
      setFeedbackMessage('Format perhitungan tidak valid!');
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full p-4 md:p-8 rounded-[2.5rem] shadow-2xl border bg-slate-900 border-slate-800 text-slate-100 relative box-border">
      <div className="flex justify-between items-center mb-6 text-xs font-black tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700">
          ⏳ {formatTime(elapsedSeconds)}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
          <Calculator className="w-3.5 h-3.5" /> Number Merge Target
        </span>
        <span className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold">
          SOAL {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Target Angka Utama */}
      <div className="mb-6 p-6 bg-indigo-950/40 rounded-3xl border border-indigo-500/30 text-center relative overflow-hidden flex flex-col items-center">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide block mb-1">Target Angka yang Harus Dicapai</span>
        <div className="text-4xl md:text-5xl font-black font-mono text-white tracking-widest my-2">
          {currentItem.target}
        </div>
        <p className="text-xs text-slate-400">Gabungkan angka & operator di bawah ini untuk menghasilkan angka target.</p>
      </div>

      {/* Area Rakit Formula / Kalkulasi */}
      <div className="mb-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 min-h-[80px] flex flex-col justify-center items-center">
        <div className="flex flex-wrap gap-2 items-center justify-center min-h-[40px]">
          {expression.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Pilih angka dan operator di bawah...</span>
          ) : (
            expression.map((item, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-xl font-mono font-bold text-sm ${
                  typeof item === 'number'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-purple-600/60 border border-purple-500 text-purple-200'
                }`}
              >
                {item}
              </span>
            ))
          )}
        </div>

        {feedbackMessage && (
          <div className="mt-3 text-xs font-bold text-amber-300 animate-pulse">
            {feedbackMessage}
          </div>
        )}
      </div>

      {/* Tombol Operator Aritmatika */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleSelectOperator('+')}
          className="py-3 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-indigo-300 rounded-2xl font-black text-base flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <Plus className="w-4 h-4" /> +
        </button>
        <button
          type="button"
          onClick={() => handleSelectOperator('-')}
          className="py-3 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-indigo-300 rounded-2xl font-black text-base flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <Minus className="w-4 h-4" /> -
        </button>
        <button
          type="button"
          onClick={() => handleSelectOperator('*')}
          className="py-3 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-indigo-300 rounded-2xl font-black text-base flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <X className="w-4 h-4" /> ×
        </button>
        <button
          type="button"
          onClick={() => handleSelectOperator('/')}
          className="py-3 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-indigo-300 rounded-2xl font-black text-base flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <Divide className="w-4 h-4" /> ÷
        </button>
      </div>

      {/* Pool Angka Tersedia */}
      <div className="space-y-3 mb-6">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
          Pilih Angka Tersedia:
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {availablePool.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.used}
              onClick={() => handleSelectNumber(item.id, item.val)}
              className={`w-14 h-14 rounded-2xl font-black font-mono text-lg flex items-center justify-center transition-all shadow-md ${
                item.used
                  ? 'bg-slate-850/40 border-slate-800 text-slate-600 opacity-30 cursor-not-allowed'
                  : 'bg-slate-800 border border-slate-700 text-white hover:border-indigo-500 hover:bg-slate-750 cursor-pointer'
              }`}
            >
              {item.val}
            </button>
          ))}
        </div>
      </div>

      {/* Kontrol Aksi Bawah */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleResetExpression}
          className="py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button
          type="button"
          onClick={handleUndoExpression}
          className="py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
        >
          Hapus Terakhir
        </button>
        <button
          type="button"
          onClick={handleEvaluateExpression}
          disabled={expression.length === 0}
          className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          Periksa Target
        </button>
      </div>

      {currentItem.hint && (
        <div className="mt-5 p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs text-amber-200 text-center font-medium">
          💡 <span className="font-bold">Hint:</span> {currentItem.hint}
        </div>
      )}
    </div>
  );
}