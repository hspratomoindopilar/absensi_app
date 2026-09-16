'use client';

import React, { useState } from 'react';

interface PuzzleQuestion {
  id: number | string;
  question: string;
  options: string[];
  correct_index: number;
}

interface PuzzleRevealConfig {
  image_url: string; // URL gambar utama yang ditebak
  grid_size: number; // Misal 2 (2x2 grid = 4 bagian) atau 3 (3x3 = 9 bagian)
  questions: PuzzleQuestion[];
}

interface PuzzleRevealEngineProps {
  config: PuzzleRevealConfig;
  onComplete: (score: number, accuracy: number, timeTaken: number) => void;
}

export default function PuzzleRevealEngine({ config, onComplete }: PuzzleRevealEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [isFinished, setIsFinished] = useState(false);

  if (!config || !config.questions || config.questions.length === 0) {
    return <div className="p-6 text-center text-sm text-slate-500">Konfigurasi Puzzle Reveal kosong.</div>;
  }

  const totalTiles = (config.grid_size || 2) * (config.grid_size || 2);
  const currentQ = config.questions[currentIndex];

  const handleSelect = (index: number) => {
    if (selectedOption !== null) return;

    setSelectedOption(index);
    const correct = index === currentQ.correct_index;

    let updatedScore = score;
    if (correct) {
      updatedScore += Math.round(100 / config.questions.length);
      setScore(updatedScore);

      // Buka potongan puzzle baru secara berurutan
      if (revealedTiles.length < totalTiles) {
        const nextTileIndex = revealedTiles.length;
        setRevealedTiles([...revealedTiles, nextTileIndex]);
      }
    }

    setTimeout(() => {
      setSelectedOption(null);
      if (currentIndex + 1 < config.questions.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsFinished(true);
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const finalScore = Math.min(100, updatedScore);
        onComplete(finalScore, finalScore, timeTaken);
      }
    }, 1200);
  };

  return (
    <div className="app-card p-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6 text-xs font-semibold text-slate-500">
        <span>PUZZLE REVEAL ({currentIndex + 1}/{config.questions.length})</span>
        <span>SKOR: {score}</span>
      </div>

      {/* Area Gambar Misteri dengan Kotak Grid Penutup */}
      <div className="relative w-full h-48 mb-6 bg-slate-200 rounded-xl overflow-hidden border border-slate-300">
        <img 
          src={config.image_url || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop&q=60'} 
          alt="Misteri Gambar"
          className="w-full h-full object-cover"
        />

        {/* Overlay Grid Penutup */}
        <div 
          className="absolute inset-0 grid" 
          style={{ gridTemplateColumns: `repeat(${config.grid_size || 2}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalTiles }).map((_, idx) => {
            const isRevealed = revealedTiles.includes(idx);
            return (
              <div 
                key={idx}
                className={`border border-white/40 flex items-center justify-center text-xs font-bold text-white transition-all duration-500 ${
                  isRevealed ? 'bg-transparent opacity-0 pointer-events-none' : 'bg-slate-700/90'
                }`}
              >
                {!isRevealed && `? ${idx + 1}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pertanyaan Kuis */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-800 text-center py-3 px-2 bg-slate-50 rounded-xl border border-slate-100">
          {currentQ.question}
        </h2>
      </div>

      <div className="space-y-2">
        {currentQ.options.map((option, idx) => {
          let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-blue-500";
          
          if (selectedOption !== null) {
            if (idx === currentQ.correct_index) {
              btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold";
            } else if (idx === selectedOption) {
              btnStyle = "bg-rose-50 border-rose-500 text-rose-700";
            } else {
              btnStyle = "opacity-50 bg-white border-slate-200 text-slate-400";
            }
          }

          return (
            <button
              key={idx}
              disabled={selectedOption !== null}
              onClick={() => handleSelect(idx)}
              className={`w-full p-3 rounded-xl border text-sm font-medium transition text-left flex justify-between items-center ${btnStyle}`}
            >
              <span>{option}</span>
              <span className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
            </button>
          );
        })}
      </div>

      {isFinished && (
        <div className="mt-4 text-center text-emerald-600 font-bold text-sm">
          Puzzle Terbuka Sepenuhnya! Menyimpan progres...
        </div>
      )}
    </div>
  );
}