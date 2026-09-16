'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle2, AlertCircle, RefreshCw, Sparkles, BookOpen, Zap } from 'lucide-react';

interface PairItem {
  id: number | string;
  left: string;
  right: string;
}

interface MatchingPairEngineProps {
  pairs: PairItem[];
  instruction?: string;
  mode?: 'practice' | 'challenge'; // Mode permainan yang dipilih siswa
  baseExpReward?: number;          // Reward EXP asli dari konfigurasi guru
  baseCoinReward?: number;         // Reward Koin asli dari konfigurasi guru
  onComplete: (score: number, accuracy: number, timeTaken: number, earnedExp: number, earnedCoins: number, finalMode: 'practice' | 'challenge') => void;
}

export default function MatchingPairEngine({ 
  pairs, 
  instruction, 
  mode = 'challenge', 
  baseExpReward = 50, 
  baseCoinReward = 5, 
  onComplete 
}: MatchingPairEngineProps) {
  const [shuffledLeft, setShuffledLeft] = useState<{ id: string | number; text: string }[]>([]);
  const [shuffledRight, setShuffledRight] = useState<{ id: string | number; text: string }[]>([]);
  
  const [selectedLeft, setSelectedLeft] = useState<string | number | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | number | null>(null);
  
  const [matchedIds, setMatchedIds] = useState<(string | number)[]>([]);
  const [wrongPairId, setWrongPairId] = useState<{ left: string | number; right: string | number } | null>(null);
  
  const [startTime] = useState(Date.now());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Acak posisi kartu saat pertama kali dimuat
  useEffect(() => {
    if (pairs && pairs.length > 0) {
      setShuffledLeft([...pairs].map(p => ({ id: p.id, text: p.left })).sort(() => Math.random() - 0.5));
      setShuffledRight([...pairs].map(p => ({ id: p.id, text: p.right })).sort(() => Math.random() - 0.5));
    }
  }, [pairs]);

  // Cek kecocokan saat kedua sisi dipilih
  useEffect(() => {
    if (selectedLeft !== null && selectedRight !== null) {
      if (selectedLeft === selectedRight) {
        // Berhasil Cocok!
        const newMatched = [...matchedIds, selectedLeft];
        setMatchedIds(newMatched);
        setSelectedLeft(null);
        setSelectedRight(null);

        // Cek apakah semua pasangan sudah selesai
        if (newMatched.length === pairs.length) {
          setIsCompleted(true);
          
          // Trigger Confetti Party! 🎉
          confetti({
            particleCount: mode === 'challenge' ? 120 : 60,
            spread: 80,
            origin: { y: 0.6 }
          });

          const timeTaken = Math.round((Date.now() - startTime) / 1000);
          const totalAttempts = pairs.length + wrongAttempts;
          
          // Akurasi: Di mode practice karena bebas salah, akurasi dihitung dari sedia kala atau bernilai 100% / proporsional
          const accuracy = mode === 'practice' 
            ? 100 
            : Math.max(0, Math.round((pairs.length / totalAttempts) * 100));
            
          const finalScore = 100; // Sempurna jika semua terpasang

          // Kalkulasi Reward berdasarkan Mode
          // Mode Practice: Flat 5 EXP, 0 Koin (Mencegah farming)
          // Mode Challenge: Full reward dari konfigurasi guru
          const earnedExp = mode === 'practice' ? 5 : baseExpReward;
          const earnedCoins = mode === 'practice' ? 0 : baseCoinReward;

          setTimeout(() => {
            onComplete(finalScore, accuracy, timeTaken, earnedExp, earnedCoins, mode);
          }, 1500);
        }
      } else {
        // Salah Pasang -> Efek Shake / Penalti Merah Sejenak
        setWrongPairId({ left: selectedLeft, right: selectedRight });
        setWrongAttempts(prev => prev + 1);

        setTimeout(() => {
          setSelectedLeft(null);
          setSelectedRight(null);
          setWrongPairId(null);
        }, 600);
      }
    }
  }, [selectedLeft, selectedRight]);

  if (!pairs || pairs.length === 0) {
    return <div className="p-6 text-center text-sm text-slate-500">Konfigurasi Matching Pair kosong.</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 text-slate-100 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-slate-800 relative overflow-hidden">
      
      {/* Efek Cahaya Latar Belakang yang Elegan */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header HUD Game dengan Indikator Mode */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 px-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-2 rounded-2xl text-blue-400 text-xs font-black tracking-wider">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>PASANGKAN KARTU</span>
          </div>  
          
          {/* Badge Mode Aktif */}
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
          <span>TERPASANG: {matchedIds.length} / {pairs.length}</span>
        </div>
      </div>

      {/* Kotak Instruksi Guru */}
      {instruction && (
        <div className="mb-5 p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200 shadow-sm relative z-10">
          <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">Petunjuk Khusus:</span>
          <p className="text-sm font-bold text-white">{instruction}</p>
        </div>
      )}

      <p className="text-xs sm:text-sm text-slate-400 mb-6 text-center font-medium relative z-10">
        {mode === 'practice' ? (
          <span className="text-amber-300 font-semibold">✨ Mode Latihan: Bebas coba tanpa penalti sampai semua terpasang (Reward: +5 EXP).</span>
        ) : (
          <>Ketuk kartu di kolom <span className="text-blue-400 font-bold">Kiri</span>, lalu pasangkan dengan jawaban yang tepat di kolom <span className="text-indigo-400 font-bold">Kanan</span>!</>
        )}
      </p>

      {/* Grid Kartu Responsif (Bertumpuk di HP, Sejajar di Tablet/Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
        
        {/* Kolom Kiri */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Pernyataan / Soal</h3>
          {shuffledLeft.map((item) => {
            const isMatched = matchedIds.includes(item.id);
            const isSelected = selectedLeft === item.id;
            const isWrong = wrongPairId?.left === item.id;

            return (
              <motion.button
                key={`left-${item.id}`}
                disabled={isMatched || isCompleted}
                onClick={() => setSelectedLeft(item.id)}
                whileHover={!isMatched ? { scale: 1.02 } : {}}
                whileTap={!isMatched ? { scale: 0.98 } : {}}
                animate={isWrong ? { x: [-6, 6, -6, 6, 0] } : {}}
                transition={{ duration: 0.2 }}
                className={`w-full p-4 rounded-2xl border text-sm font-semibold transition text-left flex items-center justify-between shadow-md ${
                  isMatched 
                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-500/40 opacity-40 cursor-not-allowed'
                    : isWrong
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] ring-2 ring-blue-400'
                    : 'bg-slate-850 border-slate-700/80 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800'
                }`}
              >
                <span className="line-clamp-2">{item.text}</span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
              </motion.button>
            );
          })}
        </div>

        {/* Kolom Kanan */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Jawaban / Target</h3>
          {shuffledRight.map((item) => {
            const isMatched = matchedIds.includes(item.id);
            const isSelected = selectedRight === item.id;
            const isWrong = wrongPairId?.right === item.id;

            return (
              <motion.button
                key={`right-${item.id}`}
                disabled={isMatched || isCompleted}
                onClick={() => setSelectedRight(item.id)}
                whileHover={!isMatched ? { scale: 1.02 } : {}}
                whileTap={!isMatched ? { scale: 0.98 } : {}}
                animate={isWrong ? { x: [-6, 6, -6, 6, 0] } : {}}
                transition={{ duration: 0.2 }}
                className={`w-full p-4 rounded-2xl border text-sm font-semibold transition text-left flex items-center justify-between shadow-md ${
                  isMatched 
                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-500/40 opacity-40 cursor-not-allowed'
                    : isWrong
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] ring-2 ring-indigo-400'
                    : 'bg-slate-850 border-slate-700/80 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800'
                }`}
              >
                <span className="line-clamp-2">{item.text}</span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
              </motion.button>
            );
          })}
        </div>

      </div>

      {/* Pesan Kemenangan */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 text-center text-emerald-300 font-bold text-xs sm:text-sm bg-emerald-950/80 py-4 px-4 rounded-2xl border border-emerald-500/40 flex items-center justify-center gap-2.5 shadow-lg relative z-10"
          >
            <Trophy className="w-5 h-5 text-emerald-400 animate-bounce shrink-0" />
            <span>Luar Biasa! Semua pasangan berhasil dihubungkan! Menyimpan skor...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}