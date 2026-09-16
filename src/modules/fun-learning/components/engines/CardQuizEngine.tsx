// src/modules/fun-learning/components/engines/CardQuizEngine.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle2, AlertCircle, HelpCircle, BookOpen, Zap } from 'lucide-react';

interface QuestionItem {
  id: number | string;
  question: string;
  options: string[];
  correct_index: number;
}

interface CardQuizEngineProps {
  questions: QuestionItem[];
  instruction?: string;
  mode?: 'practice' | 'challenge';
  baseExpReward?: number;
  baseCoinReward?: number;
  onComplete: (score: number, accuracy: number, timeTaken: number, earnedExp: number, earnedCoins: number, finalMode: 'practice' | 'challenge') => void;
}

export default function CardQuizEngine({
  questions,
  instruction,
  mode = 'challenge',
  baseExpReward = 50,
  baseCoinReward = 5,
  onComplete
}: CardQuizEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [startTime] = useState(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);

  if (!questions || questions.length === 0) {
    return <div className="p-6 text-center text-sm text-slate-500">Konfigurasi Card Quiz kosong.</div>;
  }

  const currentQ = questions[currentIndex];

  const handleSelect = (index: number) => {
    if (selectedOption !== null || isCompleted) return;

    setSelectedOption(index);
    const isCorrect = index === currentQ.correct_index;

    let updatedCorrectCount = correctCount;
    if (isCorrect) {
      updatedCorrectCount += 1;
      setCorrectCount(updatedCorrectCount);
    } else {
      setWrongAttempts(prev => prev + 1);
    }

    setTimeout(() => {
      setSelectedOption(null);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsCompleted(true);

        confetti({
          particleCount: mode === 'challenge' ? 120 : 60,
          spread: 80,
          origin: { y: 0.6 }
        });

        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const accuracy = Math.round((updatedCorrectCount / questions.length) * 100);
        const finalScore = Math.round((updatedCorrectCount / questions.length) * 100);

        const earnedExp = mode === 'practice' ? 5 : baseExpReward;
        const earnedCoins = mode === 'practice' ? 0 : baseCoinReward;

        setTimeout(() => {
          onComplete(finalScore, accuracy, timeTaken, earnedExp, earnedCoins, mode);
        }, 1500);
      }
    }, 1200);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 text-slate-100 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-slate-800 relative overflow-hidden">
      
      {/* Efek Cahaya Latar Belakang Senada */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header HUD Game dengan Indikator Mode */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 px-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-2 rounded-2xl text-blue-400 text-xs font-black tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>KUIS KARTU</span>
          </div>  
          
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-black tracking-wider border ${
            mode === 'practice' 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
          }`}>
            {mode === 'practice' ? <BookOpen className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{mode === 'practice' ? 'MODE LATIHAN' : 'MODE TANTANGAN'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-2xl text-emerald-400 text-xs font-black tracking-wider">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span>SOAL: {currentIndex + 1} / {questions.length}</span>
        </div>
      </div>

      {/* Kotak Instruksi Guru */}
      {instruction && (
        <div className="mb-5 p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200 shadow-sm relative z-10">
          <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">Petunjuk Khusus:</span>
          <p className="text-sm font-bold text-white">{instruction}</p>
        </div>
      )}

      {/* Pertanyaan Utama */}
      <div className="mb-6 relative z-10">
        <h2 className="text-base sm:text-lg font-bold text-white text-center py-5 px-4 bg-slate-850 rounded-2xl border border-slate-700/80 shadow-lg leading-relaxed">
          {currentQ.question}
        </h2>
      </div>

      {/* Opsi Pilihan Ganda */}
      <div className="space-y-3 relative z-10">
        {currentQ.options.map((option, idx) => {
          let btnStyle = "bg-slate-850 border-slate-700/80 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800";
          let badgeStyle = "border-slate-700 bg-slate-800 text-slate-400";
          
          if (selectedOption !== null) {
            if (idx === currentQ.correct_index) {
              btnStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/40";
              badgeStyle = "border-emerald-500 bg-emerald-500 text-white font-bold";
            } else if (idx === selectedOption) {
              btnStyle = "bg-rose-950/60 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)] ring-2 ring-rose-500/40";
              badgeStyle = "border-rose-500 bg-rose-500 text-white font-bold";
            } else {
              btnStyle = "opacity-40 bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed";
            }
          }

          return (
            <motion.button
              key={idx}
              disabled={selectedOption !== null || isCompleted}
              onClick={() => handleSelect(idx)}
              whileHover={selectedOption === null ? { scale: 1.01 } : {}}
              whileTap={selectedOption === null ? { scale: 0.99 } : {}}
              className={`w-full p-4 rounded-2xl border text-sm font-semibold transition text-left flex justify-between items-center shadow-md ${btnStyle}`}
            >
              <span className="line-clamp-2 pr-4">{option}</span>
              <span className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 transition-colors ${badgeStyle}`}>
                {String.fromCharCode(65 + idx)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Pesan Kemenangan Sesi */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 text-center text-emerald-300 font-bold text-xs sm:text-sm bg-emerald-950/80 py-4 px-4 rounded-2xl border border-emerald-500/40 flex items-center justify-center gap-2.5 shadow-lg relative z-10"
          >
            <Trophy className="w-5 h-5 text-emerald-400 animate-bounce shrink-0" />
            <span>Kuis Selesai! Menyimpan skor akhir...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}