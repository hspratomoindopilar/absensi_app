'use client';

import React, { useEffect, useState } from 'react';
import { FunGame } from '../types/game';
import { getGamesByTenantAndClass, submitGameResult } from '../services/gameService';
import { supabase } from '@/lib/supabase';
import SessionRunner from './SessionRunner';
import { Trophy, Coins, Play, ArrowLeft, CheckCircle2, Star } from 'lucide-react';

interface GamePlayerProps {
  tenantId: string;
  studentId: string;
  studentClass: string;
}

export default function GamePlayer({ tenantId, studentId, studentClass }: GamePlayerProps) {
  const [games, setGames] = useState<FunGame[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({}); // Key format: `${game_id}-${session_index}`
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<FunGame | null>(null);

  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [isPlayingSession, setIsPlayingSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 1. Ambil daftar game berdasarkan tenant dan kelas
        const gamesData = await getGamesByTenantAndClass(tenantId, studentClass);
        setGames(gamesData);

        // 2. Ambil riwayat submission siswa
        const { data: subData, error: subError } = await supabase
          .from('fl_game_submissions')
          .select('*')
          .eq('student_id', studentId);

        if (!subError && subData) {
          const subMap: Record<string, any> = {};
          subData.forEach((sub: any) => {
            // Pemetaan menggunakan kunci gabungan game_id dan session_index
            const key = `${sub.game_id}-${sub.session_index}`;
            subMap[key] = sub;
          });
          setSubmissions(subMap);
        }
      } catch (err) {
        console.error('Gagal memuat data game & submission:', err);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId && studentClass && studentId) {
      fetchData();
    }
  }, [tenantId, studentClass, studentId]);

  // Menangani penyelesaian sesi pembelajaran tertentu
  const handleSessionFinish = async (
    totalScore: number,
    avgAccuracy: number,
    totalTime: number,
    totalExpGained?: number,
    totalCoinsGained?: number,
    gameMode?: 'practice' | 'challenge' | null
  ) => {
    if (activeGame === null || activeSessionIndex === null) return;

    setSubmitting(true);
    setMessage('');

    try {
      const sessions = activeGame.config?.sessions || [];

      // Tentukan reward berdasarkan mode permainan
      let sessionExp = 0;
      let sessionCoins = 0;

      if (gameMode === 'practice') {
        sessionExp = 5;
        sessionCoins = 0; // Mode practice mutlak 0 koin
      } else {
        sessionExp = totalExpGained ?? Math.floor(activeGame.reward_exp / sessions.length);
        // Konversi mutlak EXP / 10 tanpa nilai fallback statis
        sessionCoins = Math.floor(sessionExp / 10);
      }

      const submissionPayload = {
        game_id: activeGame.game_id!,
        session_index: activeSessionIndex,
        student_id: studentId,
        tenant_id: tenantId,
        score: totalScore,
        accuracy_percentage: avgAccuracy,
        time_taken_seconds: totalTime,
        is_completed: true,

        earned_rewards: {
          exp_gained: sessionExp,
          coins_gained: sessionCoins,
          // Gunakan nilai gameMode apa adanya yang diterima dari parameter onSessionFinish
          mode: gameMode
        }
      };

      await submitGameResult(submissionPayload);
      setMessage(`Berhasil! Sesi ${activeSessionIndex + 1} selesai. Mendapatkan +${sessionExp} EXP & +${sessionCoins} Coins!`);

      // Perbarui state lokal submissions berdasarkan key gabungan
      const subKey = `${activeGame.game_id}-${activeSessionIndex}`;
      setSubmissions(prev => ({
        ...prev,
        [subKey]: submissionPayload
      }));

      setIsPlayingSession(false);
      setActiveSessionIndex(null);
    } catch (err: any) {
      setMessage(`Gagal mengirim hasil: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Memuat peta misi belajar...</div>;
  }

  if (isPlayingSession && activeGame && activeSessionIndex !== null) {
    const currentSessionData = activeGame.config?.sessions[activeSessionIndex];
    // 1. Baca submission spesifik berdasarkan kombinasi game_id dan session_index
    const subKey = `${activeGame.game_id}-${activeSessionIndex}`;
    const sub = submissions[subKey];

    // 2. Pastikan isChallengeDone hanya true jika sesi ini sebelumnya diselesaikan lewat mode 'challenge'
    // (Mengecek sub?.earned_rewards?.mode atau sub?.game_mode tergantung struktur penyimpanan payload kamu)
    const isChallengeDone = sub?.is_completed && (sub?.earned_rewards?.mode === 'challenge' || sub?.game_mode === 'challenge');

    // 3. Siapkan objek sesi dengan status isChallengeDone yang akurat per sesi
    const enhancedSessionData = {
      ...currentSessionData,
      isChallengeDone: !!isChallengeDone,
    };

    return (
      <SessionRunner
        session={enhancedSessionData}
        onBack={() => { setIsPlayingSession(false); setActiveSessionIndex(null); }}
        // 3. handleSessionFinish akan menangkap activeSessionIndex secara otomatis melalui closure state aktif
        onSessionFinish={handleSessionFinish}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-main)' }}>Peta Quest Belajar (Duolingo Style)</h2>

      {message && (
        <div className="p-3 mb-4 rounded-xl text-sm font-medium border" style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', borderColor: 'var(--badge-border)' }}>
          {message}
        </div>
      )}

      {activeGame ? (
        <div className="p-6 rounded-3xl shadow-xl border space-y-6 transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
          <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
            <div>
              <button
                onClick={() => { setActiveGame(null); setActiveSessionIndex(null); }}
                className="text-xs flex items-center gap-1 mb-1 font-bold cursor-pointer transition hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Misi
              </button>
              <h3 className="font-extrabold text-xl" style={{ color: 'var(--text-main)' }}>{activeGame.title}</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}>
              <Trophy className="w-4 h-4 text-amber-500" /> Total: {activeGame.reward_exp} EXP
            </div>
          </div>

          <div className="space-y-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pilih Sesi Pembelajaran:</p>

            <div className="grid grid-cols-1 gap-3">
              {activeGame.config?.sessions?.map((session: any, idx: number) => {
                const subKey = `${activeGame.game_id}-${idx}`;
                const sub = submissions[subKey];
                const isDone = sub?.is_completed || false;
                const isPerfect = (sub?.accuracy_percentage || 0) >= 100;

                return (
                  <div
                    key={session.session_id || idx}
                    className="p-4 rounded-2xl border flex items-center justify-between transition"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{session.session_title}</h4>
                          {isDone && (
                            <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              {isPerfect ? <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> : <CheckCircle2 className="w-3 h-3" />}
                              {isPerfect ? 'Perfect' : 'Selesai'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{session.blocks?.length || 1} Blok Aktivitas Engine</p>
                      </div>
                    </div>

                    <button
                      disabled={submitting}
                      onClick={() => {
                        setActiveSessionIndex(idx);
                        setIsPlayingSession(true);
                      }}
                      className="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                      style={{ background: 'var(--accent-gradient)' }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> {isDone ? 'Main Lagi' : 'Mainkan Sesi'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.length === 0 ? (
            <p className="text-sm col-span-2 text-center py-8" style={{ color: 'var(--text-muted)' }}>Belum ada misi aktif untuk kelasmu saat ini.</p>
          ) : (
            games.map((game) => {
              const sessions = game.config?.sessions || [];
              // Cek apakah semua sesi di dalam game ini sudah selesai
              const allSessionsDone = sessions.length > 0 && sessions.every((_: any, idx: number) => submissions[`${game.game_id}-${idx}`]?.is_completed);

              return (
                <div key={game.game_id} className="p-5 rounded-3xl shadow-xl border flex flex-col justify-between transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-3 py-1 rounded-xl border inline-block" style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', borderColor: 'var(--badge-border)' }}>
                        {game.subject}
                      </span>
                      {allSessionsDone && (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Total
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base mt-2 mb-1" style={{ color: 'var(--text-main)' }}>{game.title}</h3>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Modul Berkelanjutan ({sessions.length} Sesi)</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="text-xs font-bold text-amber-500 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" /> +{game.reward_exp} EXP
                      <span style={{ color: 'var(--text-muted)' }}>|</span>
                      <Coins className="w-3.5 h-3.5 text-yellow-400 ml-1" /> +{game.reward_coins} Koin
                    </div>
                    <button
                      onClick={() => setActiveGame(game)}
                      className="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 hover:opacity-90"
                      style={{ background: 'var(--accent-gradient)' }}
                    >
                      {allSessionsDone ? 'Buka Peta (Latihan)' : 'Buka Peta'} <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}