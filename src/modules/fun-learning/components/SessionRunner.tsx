// src/modules/fun-learning/components/SessionRunner.tsx - Diperbarui dengan Fitur Checkpoint & Resume Game
'use client';

import React, { useState, useEffect } from 'react';
import MatchingPairEngine from './engines/MatchingPairEngine';
import WordScrambleEngine from './engines/WordScrambleEngine';
import CardQuizEngine from './engines/CardQuizEngine';
import PuzzleRevealEngine from './engines/PuzzleRevealEngine';
import WordSearchEngine from './engines/WordSearchEngine';
import MathGridEngine from './engines/MathGridEngine';
import EquationBalanceEngine from './engines/EquationBalanceEngine';
import FractionSliceEngine from './engines/FractionSliceEngine';
import NumberMergeEngine from './engines/NumberMergeEngine';
import { ArrowLeft, Trophy, Zap, BookOpen, ShieldCheck, Lock, Play, RotateCcw } from 'lucide-react';
import { saveSessionProgress, getSessionProgress, clearSessionProgress, SessionProgress } from '@/modules/fun-learning/services/gameStorage';
import { GameType } from '../types/game';

interface SessionRunnerProps {
  session: {
    session_id: string | number;
    session_title: string;
    target_exp: number;
    base_coins?: number;
    session_instruction?: string;
    isChallengeDone?: boolean;
    blocks: Array<{
      block_id: string;
      engine_type: GameType;
      config_data: any;
    }>;
  };

  onBack: () => void;
  onSessionFinish: (
    totalScore: number,
    avgAccuracy: number,
    totalTime: number,
    totalExpGained: number,
    totalCoinsGained: number,
    gameMode?: 'practice' | 'challenge' | null
  ) => void;
}

export default function SessionRunner({ session, onBack, onSessionFinish }: SessionRunnerProps) {
  const [selectedMode, setSelectedMode] = useState<'practice' | 'challenge' | null>(null);

  // State manajemen checkpoint & modal resume
  const [savedData, setSavedData] = useState<SessionProgress | null>(null);
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);

  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [sessionAccuracies, setSessionAccuracies] = useState<number[]>([]);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [completedBlocks, setCompletedBlocks] = useState<number[]>([]);

  const blocks = session.blocks || [];
  const currentBlock = blocks[currentBlockIndex];

  // Cek apakah ada data save tersimpan di localStorage saat komponen pertama kali dimuat
  useEffect(() => {
    if (session?.session_id) {
      const progress = getSessionProgress(session.session_id);
      if (progress && progress.currentBlockIndex > 0 && progress.currentBlockIndex < blocks.length) {
        setSavedData(progress);
        setShowResumeModal(true);
      }
    }
  }, [session?.session_id, blocks.length]);

  // Handler saat siswa memilih "Lanjutkan Sesi"
  const handleResumeGame = () => {
    if (savedData) {
      setCurrentBlockIndex(savedData.currentBlockIndex);
      // Asumsikan mode challenge secara default jika melanjutkan, atau sesuaikan jika ingin disimpan juga
      setSelectedMode('challenge');
      setCompletedBlocks(savedData.completedBlocks || []);
    }
    setShowResumeModal(false);
  };

  // Handler saat siswa memilih "Mulai Ulang"
  const handleStartFresh = () => {
    clearSessionProgress(session.session_id);
    setShowResumeModal(false);
  };

  const handleBlockComplete = (
    score: number,
    accuracy: number,
    timeTaken: number,
    earnedExp: number = 0,
    earnedCoins: number = 0
  ) => {
    const updatedScores = [...sessionScores, score];
    const updatedAccuracies = [...sessionAccuracies, accuracy];
    const updatedTime = totalTimeTaken + timeTaken;
    const updatedCompletedBlocks = [...completedBlocks, currentBlockIndex];

    setSessionScores(updatedScores);
    setSessionAccuracies(updatedAccuracies);
    setTotalTimeTaken(updatedTime);
    setCompletedBlocks(updatedCompletedBlocks);

    // Jika masih ada blok berikutnya, simpan checkpoint baru ke localStorage
    if (currentBlockIndex + 1 < blocks.length) {
      const nextIndex = currentBlockIndex + 1;
      setCurrentBlockIndex(nextIndex);

      saveSessionProgress(session.session_id, {
        currentBlockIndex: nextIndex,
        score: Math.round(updatedScores.reduce((a, b) => a + b, 0) / updatedScores.length),
        completedBlocks: updatedCompletedBlocks,
      });
    } else {
      // ===== INI BLOK TERAKHIR (SESI SELESAI) =====
      // Hapus data save karena sesi sudah tuntas sepenuhnya
      clearSessionProgress(session.session_id);

      const finalScore = Math.round(updatedScores.reduce((a, b) => a + b, 0) / updatedScores.length);
      const finalAccuracy = Math.round(updatedAccuracies.reduce((a, b) => a + b, 0) / updatedAccuracies.length);

      let finalExp = 0;
      let finalCoins = 0;

      if (selectedMode === 'practice') {
        finalExp = 5;
        finalCoins = 0;
      } else {
        finalExp = session.target_exp || 50;
        finalCoins = Math.floor(finalExp / 10);
      }

      onSessionFinish(finalScore, finalAccuracy, updatedTime, finalExp, finalCoins, selectedMode);
    }
  };

  if (!currentBlock) {
    return <div className="p-8 text-center text-sm text-slate-500">Blok aktivitas dalam sesi ini kosong.</div>;
  }

  // TAHAP 0: Modal Konfirmasi Resume Game (Jika Ditemukan Checkpoint Aktif)
  if (showResumeModal && savedData) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-[2rem] shadow-2xl border border-slate-800 space-y-6 my-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center space-y-3 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <RotateCcw className="w-6 h-6 animate-spin-slow" />
          </div>
          <h2 className="text-xl font-black text-white">Lanjutkan Permainan Terakhir?</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Kami mendeteksi progres tersimpan di <span className="text-indigo-400 font-bold">Blok {savedData.currentBlockIndex + 1}</span> dari sesi "{session.session_title}". Apakah kamu ingin melanjutkan atau mulai dari awal?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleStartFresh}
            className="py-3.5 px-4 rounded-2xl border border-slate-700 bg-slate-850 text-slate-300 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Mulai Ulang dari Awal
          </button>
          <button
            onClick={handleResumeGame}
            className="py-3.5 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            Lanjutkan Sesi
          </button>
        </div>
      </div>
    );
  }

  // TAHAP 1: Layar Interaktif Player Choice (Pilih Mode Sebelum Main)
  if (selectedMode === null) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-[2rem] shadow-2xl border border-slate-800 space-y-6 my-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Peta
          </button>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            Pilih Gaya Bermain
          </span>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-white">{session.session_title}</h2>
          <p className="text-xs text-slate-400">Tentukan cara kamu ingin menyelesaikan misi belajar ini.</p>
        </div>

        {session.isChallengeDone && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold block">Tantangan Telah Ditamatkan!</span>
              Misi ini telah kamu selesaikan sebelumnya. Mode Tantangan dikunci, kamu dapat memainkannya kembali via Mode Latihan.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <button
            disabled={session.isChallengeDone}
            onClick={() => setSelectedMode('challenge')}
            className={`p-5 rounded-2xl border text-left transition relative flex flex-col justify-between group ${session.isChallengeDone
              ? 'bg-slate-850/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              : 'bg-slate-850 border-purple-500/40 hover:border-purple-500 hover:bg-purple-950/20 text-slate-200 shadow-lg cursor-pointer'
              }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Zap className="w-5 h-5" />
                </div>
                {session.isChallengeDone && <Lock className="w-4 h-4 text-slate-500" />}
              </div>
              <h3 className="text-sm font-black text-white mb-1">Mode Tantangan</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Uji kemampuan penuhmu dengan aturan standar, nyawa terbatas, dan raih koin belanjaan!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-purple-400">
              <span>Reward: EXP & Koin Penuh</span>
              <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => setSelectedMode('practice')}
            className="p-5 rounded-2xl border border-amber-500/40 bg-slate-850 hover:border-amber-500 hover:bg-amber-950/20 text-slate-200 text-left transition shadow-lg flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Bebas Salah</span>
              </div>
              <h3 className="text-sm font-black text-white mb-1">Mode Latihan</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Belajar santai tanpa penalti waktu atau kesalahan. Cocok untuk mengulang materi.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-amber-400">
              <span>Reward: +5 EXP (Flat)</span>
              <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // TAHAP 2: Eksekusi Blok Game Sesuai Mode yang Dipilih
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between bg-slate-900 text-slate-100 p-4 rounded-3xl shadow-sm border border-slate-800">
        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Keluar Sesi
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${selectedMode === 'practice' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
            {selectedMode === 'practice' ? 'Latihan' : 'Tantangan'}
          </span>
          <div className="text-xs font-extrabold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
            {session.session_title} • Blok {currentBlockIndex + 1} dari {blocks.length}
          </div>
        </div>
      </div>

      <div className="transition-all duration-300">
        {currentBlock.engine_type === 'matching_pair' && (
          <MatchingPairEngine
            key={`block-${currentBlockIndex}`}
            pairs={currentBlock.config_data.pairs || []}
            instruction={session.session_instruction}
            mode={selectedMode}
            baseExpReward={session.target_exp || 50}
            baseCoinReward={session.base_coins || 5}
            onComplete={handleBlockComplete}
          />
        )}

        {currentBlock.engine_type === 'word_scramble' && (
          <WordScrambleEngine
            key={`block-${currentBlockIndex}`}
            items={currentBlock.config_data.items || []}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'card_quiz' && (
          <CardQuizEngine
            key={`block-${currentBlockIndex}`}
            questions={currentBlock.config_data.questions || []}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'puzzle_reveal' && (
          <PuzzleRevealEngine
            key={`block-${currentBlockIndex}`}
            config={currentBlock.config_data}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'word_search' && (
          <WordSearchEngine
            key={`block-${currentBlockIndex}`}
            data={currentBlock.config_data}
            mode={selectedMode || 'challenge'}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'math_grid' && (
          <MathGridEngine
            key={`block-${currentBlockIndex}`}
            data={currentBlock.config_data}
            mode={selectedMode || 'challenge'}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'equation_balance' && (
          <EquationBalanceEngine
            key={`block-${currentBlockIndex}`}
            questions={currentBlock.config_data.questions || []}
            mode={selectedMode || 'challenge'}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'number_merge' && (
          <NumberMergeEngine
            key={`block-${currentBlockIndex}`}
            items={currentBlock.config_data.items || []}
            mode={selectedMode || 'challenge'}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}

        {currentBlock.engine_type === 'fraction_slice' && (
          <FractionSliceEngine
            key={`block-${currentBlockIndex}`}
            items={currentBlock.config_data.items || []}
            mode={selectedMode || 'challenge'}
            onComplete={(score, acc, time) => handleBlockComplete(score, acc, time, session.target_exp, session.base_coins || 5)}
          />
        )}
      </div>
    </div>
  );
}