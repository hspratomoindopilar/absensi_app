// src/modules/fun-learning/components/engines/FractionSliceEngine.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, PieChart, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playBipSound, playSuccessSound } from '@/utils/soundEffect';

interface FractionSliceItem {
  question: string; // Contoh: "Potong pizza menjadi pecahan 3/4"
  totalSlices: number; // Misal: 4 bagian total
  targetSlices: number; // Misal: 3 bagian yang harus dipilih/diaktifkan
  hint?: string;
}

interface FractionSliceEngineProps {
  items: FractionSliceItem[];
  mode?: 'practice' | 'challenge';
  onComplete: (score: number, accuracy: number, timeTaken: number) => void;
}

export default function FractionSliceEngine({ items = [], mode = 'challenge', onComplete }: FractionSliceEngineProps) {
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedSlices, setSelectedSlices] = useState<boolean[]>([]);
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
    if (currentItem && currentItem.totalSlices) {
      setSelectedSlices(Array(currentItem.totalSlices).fill(false));
      setFeedbackMessage(null);
    }
  }, [currentIndex, currentItem]);

  if (!items || items.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-400">Konfigurasi Fraction Slice kosong.</div>;
  }

  const handleToggleSlice = (index: number) => {
    playBipSound();
    setSelectedSlices((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const handleVerifyFraction = () => {
    const activeCount = selectedSlices.filter(Boolean).length;
    const target = currentItem.targetSlices;

    if (activeCount === target) {
      playSuccessSound();
      setFeedbackMessage('Benar! Pecahan kue sesuai dengan target!');
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
      setFeedbackMessage(`Bagian terpilih: ${activeCount}/${currentItem.totalSlices}. Target yang benar adalah ${target}/${currentItem.totalSlices}!`);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  const totalSlices = currentItem.totalSlices || 4;
  const activeCount = selectedSlices.filter(Boolean).length;

  return (
    <div className="w-full p-4 md:p-8 rounded-[2.5rem] shadow-2xl border bg-slate-900 border-slate-800 text-slate-100 relative box-border">
      <div className="flex justify-between items-center mb-6 text-xs font-black tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700">
          ⏳ {formatTime(elapsedSeconds)}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
          <PieChart className="w-3.5 h-3.5" /> Fraction Slice Geometry
        </span>
        <span className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold">
          SOAL {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Soal Utama */}
      <div className="mb-6 p-6 bg-indigo-950/40 rounded-3xl border border-indigo-500/30 text-center relative overflow-hidden flex flex-col items-center">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide block mb-1">Misi Pecahan Visual</span>
        <div className="text-xl md:text-2xl font-black text-white tracking-wide my-2">
          {currentItem.question}
        </div>
        <p className="text-xs text-slate-400">Klik bagian bentuk geometri di bawah untuk mengaktifkan potongan pecahan.</p>
      </div>

      {/* Visualisasi Bentuk Lingkaran / Kue Pecahan Interaktif menggunakan CSS Grid / Flex */}
      <div className="mb-8 p-6 bg-slate-950/60 rounded-3xl border border-slate-800 flex flex-col items-center justify-center relative">
        <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-slate-700 overflow-hidden bg-slate-850 flex items-center justify-center shadow-inner">
          
          {/* Render potongan kue dinamis */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {Array.from({ length: totalSlices }).map((_, idx) => {
              const isActive = selectedSlices[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleToggleSlice(idx)}
                  className={`border border-slate-700/50 transition-all cursor-pointer flex items-center justify-center font-black text-sm ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-inner scale-[0.98]'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="absolute w-12 h-12 bg-slate-900 border-2 border-slate-700 rounded-full flex items-center justify-center text-xs font-black font-mono text-amber-400 z-10 shadow-md">
            {activeCount}/{totalSlices}
          </div>
        </div>

        {feedbackMessage && (
          <div className="mt-4 text-xs font-bold text-amber-300 animate-pulse text-center">
            {feedbackMessage}
          </div>
        )}
      </div>

      {/* Kontrol Aksi Bawah */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            playBipSound();
            setSelectedSlices(Array(totalSlices).fill(false));
            setFeedbackMessage(null);
          }}
          className="py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Reset Potongan
        </button>
        <button
          type="button"
          onClick={handleVerifyFraction}
          className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          Periksa Pecahan
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