// src/modules/fun-learning/components/engines/EquationBalanceEngine.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Scale } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playBipSound, playSuccessSound } from '@/utils/soundEffect';

interface EquationBalanceItem {
  question: string;
  variable: string;
  targetValue: number;
  options: number[];
  hint?: string;
}

interface EquationBalanceEngineProps {
  questions: EquationBalanceItem[];
  mode?: 'practice' | 'challenge';
  onComplete: (score: number, accuracy: number, timeTaken: number) => void;
}

export default function EquationBalanceEngine({ questions = [], mode = 'challenge', onComplete }: EquationBalanceEngineProps) {
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-400">Konfigurasi Equation Balance kosong.</div>;
  }

  const currentQ = questions[currentIndex];

  const handleSelectOption = (val: number) => {
    if (isCorrect !== null) return;
    playBipSound();
    setSelectedAnswer(val);

    const correct = val === currentQ.targetValue;
    setIsCorrect(correct);

    if (correct) {
      playSuccessSound();
      setScore((prev) => prev + Math.round(100 / questions.length));
      setCorrectCount((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        confetti({
          particleCount: mode === 'challenge' ? 120 : 60,
          spread: 80,
          origin: { y: 0.6 }
        });
        playSuccessSound();
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const finalAccuracy = Math.round(((correctCount + (correct ? 1 : 0)) / questions.length) * 100);
        
        setTimeout(() => {
          onComplete(100, finalAccuracy, timeTaken);
        }, 1500);
      }
    }, 1200);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  // Logika kemiringan dinamis berdasarkan pilihan siswa vs target
  let scaleStyle = "animate-balance-rocking";
  let scaleColorClass = "bg-indigo-600/40 border-indigo-500/50";
  let scaleStatusText = "Neraca Menimbang... (Pilih Jawaban)";

  if (isCorrect === true) {
    scaleStyle = "rotate-0 scale-105 transition-transform duration-500";
    scaleColorClass = "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20";
    scaleStatusText = "Seimbang Sempurna! ✨";
  } else if (isCorrect === false && selectedAnswer !== null) {
    // Jika pilihan siswa lebih kecil dari target -> miring ke kiri (negatif)
    // Jika pilihan siswa lebih besar dari target -> miring ke kanan (positif)
    if (selectedAnswer < currentQ.targetValue) {
      scaleStyle = "-rotate-6 -translate-y-1 transition-transform duration-300"; // Miring ke kiri
      scaleStatusText = "oops! timbangan miring kapten!";
    } else {
      scaleStyle = "rotate-6 translate-y-1 transition-transform duration-300"; // Miring ke kanan
      scaleStatusText = "Oops! timbangan miring kawan!";
    }
    scaleColorClass = "bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/20";
  }

  return (
    <div className="w-full p-4 md:p-8 rounded-[2.5rem] shadow-2xl border bg-slate-900 border-slate-800 text-slate-100 relative box-border">
      <style jsx>{`
        @keyframes balanceRocking {
          0% { transform: rotate(-4deg) translateY(-2px); }
          50% { transform: rotate(4deg) translateY(2px); }
          100% { transform: rotate(-4deg) translateY(-2px); }
        }
        .animate-balance-rocking {
          animation: balanceRocking 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="flex justify-between items-center mb-6 text-xs font-black tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700">
          ⏳ {formatTime(elapsedSeconds)}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
          <Scale className="w-3.5 h-3.5" /> Equation Balance
        </span>
        <span className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold">
          SOAL {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Visual Neraca Dinamis */}
      <div className="mb-8 p-6 bg-slate-950/60 rounded-3xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden transition-all">
        <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isCorrect === true ? 'bg-emerald-400 animate-ping' : isCorrect === false ? 'bg-rose-400' : 'bg-amber-400 animate-pulse'}`}></span>
          {scaleStatusText}
        </div>

        <div className="my-5 w-full max-w-md flex flex-col items-center">
          <div className="w-2 h-8 bg-slate-700 rounded-full mb-1"></div>
          
          <div className={`w-64 h-3 rounded-full relative flex justify-between items-center px-4 border ${scaleColorClass} ${scaleStyle}`}>
            <div className={`w-3 h-3 rounded-full transition-colors ${isCorrect === true ? 'bg-white' : 'bg-indigo-300'}`}></div>
            <div className={`w-3 h-3 rounded-full transition-colors ${isCorrect === true ? 'bg-white' : 'bg-indigo-300'}`}></div>
          </div>
          
          <div className="w-24 h-4 bg-slate-800 border border-slate-700 rounded-b-xl shadow-md"></div>
        </div>

        <div className="mt-2 px-6 py-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-center shadow-inner">
          <span className="text-xs text-indigo-400 font-bold block mb-1">Cari nilai {currentQ.variable} agar seimbang:</span>
          <div className="text-2xl md:text-3xl font-black font-mono tracking-wider text-white">
            {currentQ.question}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
          Pilih angka yang tepat untuk menggantikan {currentQ.variable}:
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            let btnStyle = "bg-slate-850 border-slate-700 text-slate-200 hover:bg-slate-800";

            if (isSelected) {
              if (isCorrect) {
                btnStyle = "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30 scale-105";
              } else {
                btnStyle = "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30 animate-pulse";
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isCorrect !== null}
                onClick={() => handleSelectOption(opt)}
                className={`py-4 px-6 rounded-2xl border text-xl font-black font-mono transition-all cursor-pointer ${btnStyle}`}
              >
                {currentQ.variable} = {opt}
              </button>
            );
          })}
        </div>
      </div>

      {currentQ.hint && (
        <div className="mt-6 p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs text-amber-200 text-center font-medium">
          💡 <span className="font-bold">Hint:</span> {currentQ.hint}
        </div>
      )}
    </div>
  );
}