// src/modules/fun-learning/components/GameBuilder.tsx
'use client';

import React, { useState } from 'react';
import { FunGame, GameType } from '../types/game';
import { createFunGame } from '../services/gameService';
import { Trash2, Plus, Trophy, Coins } from 'lucide-react';
import { useGameBuilderState } from '../hooks/useGameBuilderState';
import ClassSelectorDropdown from './builder/ClassSelectorDropdown';
import GamePreviewModal from './builder/GamePreviewModal';
import MatchingPairBuilder from './builder/MatchingPairBuilder';
import CardQuizBuilder from './builder/CardQuizBuilder';
import WordScrambleBuilder from './builder/WordScrambleBuilder';
import WordSearchBuilder from './builder/WordSearchBuilder';
import MathGridBuilder from './builder/MathGridBuilder';
import EquationBalanceBuilder from './builder/EquationBalanceBuilder';

interface GameBuilderProps {
  tenantId: string;
  creatorId: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function GameBuilder({ tenantId, creatorId, onBack, onSuccess }: GameBuilderProps) {
  const {
    title, setTitle,
    subject, setSubject,
    targetClasses, setTargetClasses,
    sessions,
    totalGameExp,
    totalGameCoins,
    addSession,
    removeSession,
    updateSessionField,
    addBlockToSession,
    removeBlockFromSession,
    updateBlockType,
    updateBlockConfig
  } = useGameBuilderState();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent, isPublished: boolean) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Judul game tidak boleh kosong!' });
      return;
    }
    if (targetClasses.length === 0) {
      setMessage({ type: 'error', text: 'Pilih minimal satu target kelas dari dropdown!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload: FunGame = {
        tenant_id: tenantId,
        creator_id: creatorId,
        title,
        subject,
        target_class: targetClasses.join(', '),
        game_type: 'multi_stage_module',
        reward_exp: totalGameExp,
        reward_coins: totalGameCoins,
        config: { sessions },
        is_published: isPublished
      };

      await createFunGame(payload);
      setMessage({
        type: 'success',
        text: isPublished ? 'Game multi-sesi berhasil dipublikasikan ke siswa! 🚀' : 'Draft game multi-sesi berhasil disimpan.'
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Gagal menyimpan ke database: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8">
      <div className="mb-6 border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Buat Modul Game Baru</h2>
          <p className="text-xs text-slate-400 mt-0.5">Konfigurasikan peta misi belajar bertingkat ala Duolingo.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition cursor-pointer"
        >
          ← Kembali
        </button>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-2xl text-sm font-medium flex items-center gap-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Judul Game / Aktivitas</label>
            <input
              type="text"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              placeholder="Contoh: Petualangan Matematika Seru"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mata Pelajaran</label>
            <input
              type="text"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Dropdown Target Kelas Terisolasi */}
        <ClassSelectorDropdown
          tenantId={tenantId}
          targetClasses={targetClasses}
          onChange={setTargetClasses}
        />

        {/* Akumulasi Reward */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-700">Total Akumulasi EXP Game</span>
              <span className="text-base font-extrabold text-amber-900">{totalGameExp} EXP</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-yellow-700">Total Konversi Koin (10:1)</span>
              <span className="text-base font-extrabold text-yellow-900">🪙 {totalGameCoins} Koin</span>
            </div>
          </div>
        </div>

        {/* Daftar Sesi & Blok Aktivitas */}
        <div className="space-y-6 pt-4 border-t">
          <h3 className="text-base font-bold text-slate-800">Daftar Sesi Pembelajaran & Target Poin</h3>

          {sessions.map((session, sIdx) => (
            <div key={session.session_id} className="p-6 bg-slate-50/80 border border-slate-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="w-full max-w-md space-y-2">
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-400 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm placeholder:text-slate-400"
                    value={session.session_title}
                    onChange={(e) => updateSessionField(sIdx, 'session_title', e.target.value)}
                    placeholder="Beri nama sesi disini"
                  />


                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                  <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border-2 border-slate-400 shadow-sm">
                    <span className="text-xs font-bold text-slate-700">Target EXP Sesi:</span>
                    <select
                      className="text-xs font-extrabold text-indigo-700 outline-none cursor-pointer bg-transparent"
                      value={session.target_exp}
                      onChange={(e) => updateSessionField(sIdx, 'target_exp', Number(e.target.value))}
                    >
                      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200].map((val) => (
                        <option key={val} value={val}>{val} EXP</option>
                      ))}
                    </select>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!removeSession(sIdx)) {
                          setMessage({ type: 'error', text: 'Game minimal harus memiliki 1 sesi!' });
                        }
                      }}
                      className="text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 p-2.5 rounded-xl font-bold transition cursor-pointer shadow-sm"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Blok Engine */}
              <div className="space-y-3 pl-3 border-l-4 border-indigo-400">
                {session.blocks.map((block, bIdx) => (
                  <div key={block.block_id} className="p-4 bg-white border-2 border-slate-300 rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200">Blok #{bIdx + 1}</span>
                        <select
                          className="p-2 bg-slate-100 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-600"
                          value={block.engine_type}
                          onChange={(e) => updateBlockType(sIdx, bIdx, e.target.value as GameType)}
                        >
                          <option value="matching_pair">Matching Pair (Pasangkan Kartu)</option>
                          <option value="card_quiz">Card Quiz (Kuis Pilihan Ganda)</option>
                          <option value="word_scramble">Word Scramble (Susun Huruf Kata)</option>
                          <option value="word_search">Word Search (Cari Kata)</option>
                          <option value="math_grid">Math Grid (Teka-Teki Hitung)</option>
                          <option value="equation_balance">Equation Balance (Neraca Aljabar)</option>
                        </select>
                      </div>

                      {session.blocks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!removeBlockFromSession(sIdx, bIdx)) {
                              setMessage({ type: 'error', text: 'Setiap sesi minimal harus memiliki 1 blok aktivitas!' });
                            }
                          }}
                          className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Konfigurasi Builder Dinamis */}
                    {block.engine_type === 'matching_pair' && (
                      <MatchingPairBuilder
                        configData={block.config_data}
                        onChange={(newConfig) => updateBlockConfig(sIdx, bIdx, newConfig)}
                        blockKey={`${sIdx}-${bIdx}`}
                      />
                    )}

                    {block.engine_type === 'card_quiz' && (
                      <CardQuizBuilder
                        configData={block.config_data}
                        onChange={(newConfig) => updateBlockConfig(sIdx, bIdx, newConfig)}
                        blockKey={`${sIdx}-${bIdx}`}
                      />
                    )}

                    {/* Konfigurasi Word Scramble */}
                    {block.engine_type === 'word_scramble' && (
                      <WordScrambleBuilder
                        config={block.config_data}
                        onChange={(newConfig) => updateBlockConfig(sIdx, bIdx, newConfig)}
                      />
                    )}

                    {block.engine_type === 'word_search' && (
                      <WordSearchBuilder
                        config={block.config_data}
                        onChange={(newConfig) => updateBlockConfig(sIdx, bIdx, newConfig)}
                      />
                    )}

                    {block.engine_type === 'math_grid' && (
                      <MathGridBuilder
                        config={block.config_data}
                        onChange={(newConfig) => updateBlockConfig(sIdx, bIdx, newConfig)}
                      />
                    )}

                    {block.engine_type === 'equation_balance' && (
                      <EquationBalanceBuilder
                        config={block.config_data}
                        onChange={(newConfig) => updateBlockConfig(sIdx, bIdx, newConfig)}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addBlockToSession(sIdx, 'matching_pair')}
                  className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-extrabold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-indigo-300 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Tambah Blok Aktivitas ke Sesi Ini
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSession}
            className="w-full py-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-3xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Sesi Pembelajaran Baru
          </button>
        </div>

        {/* Tombol Eksekusi */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-6 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-sm font-bold transition cursor-pointer flex items-center gap-2"
          >
            🎮 Test Mainkan Game
          </button>
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, false)} className="px-6 py-3.5 border border-slate-300 hover:bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 transition cursor-pointer">
            Simpan sebagai Draft
          </button>
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, true)} className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/25 transition cursor-pointer">
            {loading ? 'Menyimpan...' : 'Publish ke Siswa 🚀'}
          </button>
        </div>
      </form>

      {/* Modal Live Preview Terisolasi */}
      {isPreviewOpen && (
        <GamePreviewModal
          title={title}
          sessions={sessions}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}