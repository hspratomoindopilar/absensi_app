// src/app/teacher/game-builder/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { fetchSchoolAndClassInfo } from '@/services/attendanceService';
import GameBuilder from '@/modules/fun-learning/components/GameBuilder';
import EditGameBuilder from '@/modules/fun-learning/components/EditGameBuilder';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Library, Trash2, Edit3, Plus, BookOpen, Sparkles } from 'lucide-react';

export default function TeacherGameBuilderPage() {
    const [loading, setLoading] = useState(true);
    const [sessionData, setSessionData] = useState({
        userId: '',
        tenantId: '',
        schoolName: 'Memuat Sekolah...',
        className: 'Memuat Kelas...',
        teacherName: 'Guru / Admin',
    });

    const [viewMode, setViewMode] = useState<'menu' | 'builder' | 'edit'>('menu');
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [gameList, setGameList] = useState<any[]>([]);
    const [fetchingGames, setFetchingGames] = useState(false);

    const router = useRouter();

    useEffect(() => {
        async function loadSession() {
            try {
                setLoading(true);
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                const info = await fetchSchoolAndClassInfo(session.user.email);
                if (!info || !info.tenantId || !info.userId) {
                    setLoading(false);
                    return;
                }

                setSessionData({
                    userId: info.userId,
                    tenantId: info.tenantId,
                    schoolName: info.schoolName,
                    className: info.className,
                    teacherName: info.teacherName,
                });

                fetchGameHistory(info.tenantId);
            } catch (err) {
                console.error('Gagal memuat sesi:', err);
            } finally {
                setLoading(false);
            }
        }
        loadSession();
    }, [router]);

    const fetchGameHistory = async (tenantId: string) => {
        setFetchingGames(true);
        try {
            const { data, error } = await supabase
                .from('fl_games')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (data && !error) setGameList(data);
        } catch (err) {
            console.error('Gagal ambil riwayat:', err);
        } finally {
            setFetchingGames(false);
        }
    };

    const handleDeleteGame = async (e: React.MouseEvent, gameId: string) => {
        e.stopPropagation();
        if (!confirm('Yakin ingin menghapus modul game ini?')) return;

        try {
            const { error } = await supabase.from('fl_games').delete().eq('game_id', gameId);
            if (error) throw error;
            setGameList(gameList.filter(g => g.game_id !== gameId));
        } catch (err: any) {
            alert('Gagal menghapus game: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
                <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
            <Header
                schoolName={sessionData.schoolName}
                className={sessionData.className}
                teacherName={sessionData.teacherName}
                onLogout={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
            />

            <main className="px-4 py-6 max-w-4xl mx-auto w-full flex-1 pb-28">
                {viewMode === 'menu' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                    <Library className="w-6 h-6 text-blue-600" />
                                    Kelola Modul Game Pembelajaran
                                </h1>
                                <p className="text-xs text-slate-400 mt-1">Pilih modul untuk diedit atau buat modul misi belajar baru.</p>
                            </div>
                            <button
                                onClick={() => setViewMode('builder')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-blue-200 transition flex items-center gap-2 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Modul Game Belajar
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Daftar Riwayat Modul ({gameList.length})
                            </h2>

                            {fetchingGames ? (
                                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Memuat riwayat...</div>
                            ) : gameList.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-600">Belum ada modul game yang dibuat.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {gameList.map((game) => (
                                        <div
                                            key={game.game_id}
                                            onClick={() => {
                                                setSelectedGameId(game.game_id);
                                                setViewMode('edit');
                                            }}
                                            className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition cursor-pointer flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                                                        {game.title}
                                                    </h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${game.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {game.is_published ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Mapel: <span className="font-medium text-slate-600">{game.subject}</span> | Kelas: <span className="font-medium text-slate-600">{game.target_class || 'Semua Kelas'}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button title="Edit Modul" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 shadow-sm transition">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button title="Hapus Modul" onClick={(e) => handleDeleteGame(e, game.game_id)} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 shadow-sm transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'builder' && (
                    <GameBuilder
                        tenantId={sessionData.tenantId}
                        creatorId={sessionData.userId}
                        onBack={() => setViewMode('menu')}
                        onSuccess={() => {
                            setViewMode('menu');
                            fetchGameHistory(sessionData.tenantId);
                        }}
                    />
                )}

                {viewMode === 'edit' && selectedGameId && (
                    <EditGameBuilder
                        tenantId={sessionData.tenantId}
                        gameId={selectedGameId}
                        onBack={() => {
                            setSelectedGameId(null);
                            setViewMode('menu');
                        }}
                        onSuccess={() => {
                            setSelectedGameId(null);
                            setViewMode('menu');
                            fetchGameHistory(sessionData.tenantId);
                        }}
                    />
                )}
            </main>
            <BottomNav />
        </div>
    );
}