// src/modules/fun-learning/hooks/useEditGameBuilderState.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GameType } from '../types/game';
import { SessionItem } from './useGameBuilderState';

export function useEditGameBuilderState(tenantId: string, gameId: string) {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('Matematika');
    const [targetClasses, setTargetClasses] = useState<string[]>([]);
    const [sessions, setSessions] = useState<SessionItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const totalGameExp = sessions.reduce((acc, curr) => acc + Number(curr.target_exp || 0), 0);
    const totalGameCoins = Math.floor(totalGameExp / 10);

    useEffect(() => {
        async function loadInitialData() {
            try {
                setLoading(true);
                const { data: gameData, error } = await supabase
                    .from('fl_games')
                    .select('*')
                    .eq('game_id', gameId)
                    .single();

                if (error) throw error;

                if (gameData) {
                    setTitle(gameData.title);
                    setSubject(gameData.subject);
                    setTargetClasses(gameData.target_class ? gameData.target_class.split(', ').map((s: string) => s.trim()) : []);
                    if (gameData.config?.sessions) {
                        setSessions(gameData.config.sessions);
                    }
                }
            } catch (err: any) {
                setMessage({ type: 'error', text: 'Gagal memuat detail game: ' + err.message });
            } finally {
                setLoading(false);
            }
        }

        if (tenantId && gameId) loadInitialData();
    }, [tenantId, gameId]);

    const addSession = () => {
        setSessions([
            ...sessions,
            {
                session_id: `sesi_${Date.now()}`,
                session_title: '',
                session_instruction: '',
                target_exp: 50,
                blocks: [
                    {
                        block_id: `block_${Date.now()}`,
                        engine_type: 'matching_pair',
                        config_data: { pairs: [{ id: 1, left: '', right: '' }] }
                    }
                ]
            }
        ]);
    };

    const removeSession = (sessionIndex: number) => {
        if (sessions.length === 1) return false;
        setSessions(sessions.filter((_, idx) => idx !== sessionIndex));
        return true;
    };

    const updateSessionField = (sessionIndex: number, field: keyof SessionItem, value: any) => {
        const updated = [...sessions];
        updated[sessionIndex] = { ...updated[sessionIndex], [field]: value };
        setSessions(updated);
    };

    const getDefaultConfigForEngine = (engineType: GameType) => {
        if (engineType === 'matching_pair') {
            return { pairs: [{ id: 1, left: '', right: '' }] };
        } else if (engineType === 'card_quiz') {
            return {
                questions: [
                    {
                        id: 1,
                        question: '',
                        options: ['', '', '', ''],
                        correct_index: 0
                    }
                ]
            };
        } else if (engineType === 'word_scramble') { // <-- Tambahkan kondisi ini
            return {
                items: [
                    {
                        id: 1,
                        question: '',
                        answer: ''
                    }
                ]
            };
        } else if (engineType === 'word_search') {
            return {
                clue: "Tulis clue atau petunjuk utama di sini...",
                words: ["KATA1", "KATA2", "KATA3"]
            };
        } else if (engineType === 'math_grid') {
            return {
                clue: "Temukan pola hitung operasi di bawah ini!",
                equations: [
                    { equation: "4+5=9", hint: "Penjumlahan dasar" }
                ]
            };
        } else if (engineType === 'equation_balance') {
            return {
                questions: [
                    {
                        question: "2x + 5 = 15",
                        variable: "x",
                        targetValue: 5,
                        options: [3, 5, 7, 10],
                        hint: "Pindahkan angka 5 ke sisi kanan."
                    }
                ]
            };
        } else if (engineType === 'number_merge') {
            return {
                items: [
                    {
                        target: 20,
                        availableNumbers: [5, 4, 10, 2],
                        hint: "Gunakan perkalian atau penjumlahan."
                    }
                ]
            };
        } else if (engineType === 'fraction_slice') {
            return {
                items: [
                    {
                        question: "Potong kue menjadi pecahan 3/4",
                        totalSlices: 4,
                        targetSlices: 3,
                        hint: "Aktifkan 3 dari 4 bagian."
                    }
                ]
            };
        }
        return {};
    };

    const addBlockToSession = (sessionIndex: number, engineType: GameType) => {
        const updated = [...sessions];
        updated[sessionIndex].blocks.push({
            block_id: `block_${Date.now()}`,
            engine_type: engineType,
            config_data: getDefaultConfigForEngine(engineType)
        });
        setSessions(updated);
    };

    const removeBlockFromSession = (sessionIndex: number, blockIndex: number) => {
        const updated = [...sessions];
        if (updated[sessionIndex].blocks.length === 1) return false;
        updated[sessionIndex].blocks = updated[sessionIndex].blocks.filter((_, idx) => idx !== blockIndex);
        setSessions(updated);
    };

    const updateBlockType = (sessionIndex: number, blockIndex: number, newType: GameType) => {
        const updated = [...sessions];
        updated[sessionIndex].blocks[blockIndex].engine_type = newType;
        updated[sessionIndex].blocks[blockIndex].config_data = getDefaultConfigForEngine(newType);
        setSessions(updated);
    };

    const updateBlockConfig = (sessionIndex: number, blockIndex: number, newConfig: any) => {
        const updated = [...sessions];
        updated[sessionIndex].blocks[blockIndex].config_data = newConfig;
        setSessions(updated);
    };

    return {
        title, setTitle,
        subject, setSubject,
        targetClasses, setTargetClasses,
        sessions, setSessions,
        totalGameExp, totalGameCoins,
        loading, saving, setSaving,
        message, setMessage,
        addSession, removeSession, updateSessionField,
        addBlockToSession, removeBlockFromSession,
        updateBlockType, updateBlockConfig
    };
}