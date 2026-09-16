'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { playBipSound, playSuccessSound } from '@/utils/soundEffect';

interface ScrambleItem {
  id: number | string;
  question: string;
  answer: string;
}

interface WordScrambleEngineProps {
  items: ScrambleItem[];
  onComplete: (score: number, accuracy: number, timeTaken: number) => void;
}

interface LetterNode {
  id: string;
  char: string;
  originalIndex: number;
}

export default function WordScrambleEngine({ items, onComplete }: WordScrambleEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!items || items.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-400">Konfigurasi Word Scramble kosong.</div>;
  }

  const currentItem = items[currentIndex];
  const targetCleanWord = currentItem?.answer ? currentItem.answer.replace(/\s+/g, '').toUpperCase() : '';
  
  const [availableLetters, setAvailableLetters] = useState<LetterNode[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<LetterNode[]>([]);

  // Fungsi helper untuk mengacak huruf
  const generateShuffledLetters = () => {
    if (!targetCleanWord) return [];
    const letters: LetterNode[] = targetCleanWord.split('').map((char, idx) => ({
      id: `${currentIndex}-${idx}-${Math.random()}`,
      char,
      originalIndex: idx,
    }));
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters;
  };

  // Reset total dan acak huruf setiap kali pindah soal
  useEffect(() => {
    if (!currentItem || !targetCleanWord) return;
    setAvailableLetters(generateShuffledLetters());
    setSelectedLetters([]);
    setFeedback(null);
  }, [currentIndex]);

  const handleSelectLetter = (node: LetterNode) => {
    if (feedback !== null) return;
    playBipSound();
    setAvailableLetters(prev => prev.filter(item => item.id !== node.id));
    setSelectedLetters(prev => [...prev, node]);
  };

  const handleDeselectLetter = (node: LetterNode) => {
    if (feedback !== null) return;
    playBipSound();
    setSelectedLetters(prev => prev.filter(item => item.id !== node.id));
    setAvailableLetters(prev => [...prev, node]);
  };

  const handleResetCurrent = () => {
    if (feedback !== null) return;
    playBipSound();
    setAvailableLetters(generateShuffledLetters()); // Mengacak ulang huruf dengan benar
    setSelectedLetters([]);
  };
  // Cek otomatis saat slot kotak jawaban sudah terisi penuh
  useEffect(() => {
    if (
      targetCleanWord.length > 0 &&
      selectedLetters.length > 0 &&
      selectedLetters.length === targetCleanWord.length &&
      feedback === null
    ) {
      const userWord = selectedLetters.map(l => l.char).join('');
      const isCorrect = userWord === targetCleanWord;

      let newScore = score;
      if (isCorrect) {
        playSuccessSound();
        newScore += Math.round(100 / items.length);
        setScore(newScore);
        setFeedback('correct');
      } else {
        setFeedback('wrong');
      }

      setTimeout(() => {
        setFeedback(null);
        if (currentIndex + 1 < items.length) {
          setCurrentIndex(currentIndex + 1);
        } else {
          const timeTaken = Math.round((Date.now() - startTime) / 1000);
          const finalScore = Math.min(100, newScore);
          onComplete(finalScore, finalScore, timeTaken);
        }
      }, 1500);
    }
  }, [selectedLetters, targetCleanWord, feedback]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-8 rounded-[2.5rem] shadow-2xl border transition-all duration-300 bg-white border-slate-100 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 text-xs font-black tracking-wider text-slate-500">
        <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 shadow-sm">
          ⏳ {formatTime(elapsedSeconds)}
        </span>
        <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" /> {currentIndex + 1} dari {items.length}
        </span>
        <span className="px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 shadow-sm font-extrabold">
          SKOR: {score}
        </span>
      </div>

      {/* Pertanyaan */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-base md:text-lg font-extrabold text-slate-800 px-4 leading-relaxed">
          {currentItem.question}
        </h2>
      </div>

      {/* Kotak Jawaban Target */}
      <div className="mb-8 p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 min-h-[90px] flex items-center justify-center gap-2 flex-wrap shadow-inner">
        {Array.from({ length: targetCleanWord.length }).map((_, idx) => {
          const letterNode = selectedLetters[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => letterNode && handleDeselectLetter(letterNode)}
              disabled={!letterNode || feedback !== null}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl font-black text-lg md:text-xl flex items-center justify-center transition-all shadow-md ${letterNode
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30 scale-100 hover:scale-105 cursor-pointer'
                : 'bg-white border-2 border-slate-200 text-slate-300'
                }`}
            >
              {letterNode ? letterNode.char : ''}
            </button>
          );
        })}
      </div>

      {/* Huruf Acak Pilihan */}
      <div className="mb-6 p-6 bg-slate-900/5 rounded-3xl border border-slate-200/80 flex items-center justify-center gap-2.5 flex-wrap min-h-[100px]">
        {availableLetters.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => handleSelectLetter(node)}
            disabled={feedback !== null}
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-800 text-white font-black text-lg md:text-xl shadow-lg shadow-slate-900/20 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center uppercase"
          >
            {node.char}
          </button>
        ))}
      </div>

      {/* Tombol Reset */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleResetCurrent}
          disabled={selectedLetters.length === 0 || feedback !== null}
          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Susunan
        </button>

        <span className="text-[11px] font-bold text-slate-400">
          Klik kotak huruf di atas untuk menyusun
        </span>
      </div>

      {/* Feedback Pop-up */}
      {feedback && (
        <div className={`absolute inset-x-6 top-1/2 -translate-y-1/2 p-6 rounded-3xl text-center text-base font-black shadow-2xl animate-bounce flex flex-col items-center gap-2 z-50 ${feedback === 'correct' ? 'bg-emerald-500 text-white shadow-emerald-500/40' : 'bg-rose-500 text-white shadow-rose-500/40'
          }`}>
          {feedback === 'correct' ? (
            <>
              <CheckCircle2 className="w-10 h-10" />
              <span>Luar Biasa! Jawaban Benar 🎉</span>
            </>
          ) : (
            <>
              <XCircle className="w-10 h-10" />
              <span>Kurang Tepat! Jawabannya: {currentItem.answer}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}