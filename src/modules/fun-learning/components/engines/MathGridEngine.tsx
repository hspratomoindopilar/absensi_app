// src/modules/fun-learning/components/engines/MathGridEngine.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, CheckCircle2, RotateCcw, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playBipSound, playSuccessSound } from '@/utils/soundEffect';

interface TargetEquationItem {
  equation: string; // Contoh: "4+5=9" atau "7*3=21"
  hint: string;
}

interface MathGridItem {
  clue: string;
  equations: (string | TargetEquationItem)[];
}

interface MathGridEngineProps {
  data: MathGridItem;
  mode?: 'practice' | 'challenge';
  onComplete: (score: number, accuracy: number, timeTaken: number) => void;
}

type Direction = 'H' | 'V' | 'D';

interface PlacedEquation {
  equation: string; // Bentuk string bersih tanpa spasi, misal "4+5=9"
  hint: string;
  row: number;
  col: number;
  direction: Direction;
  found: boolean;
}

export default function MathGridEngine({ data, mode = 'challenge', onComplete }: MathGridEngineProps) {
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [selectionStatus, setSelectionStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [activeHintIndex, setActiveHintIndex] = useState<number | null>(null);

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data || !data.equations || data.equations.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-400">Konfigurasi Math Grid kosong.</div>;
  }

  const normalizedEquations: TargetEquationItem[] = data.equations.map((item) => {
    if (typeof item === 'string') {
      return { equation: item.replace(/\s+/g, ''), hint: '' };
    }
    return {
      equation: (item.equation || '').replace(/\s+/g, ''),
      hint: item.hint || '',
    };
  });

  const targetEqStrings = normalizedEquations.map((e) => e.equation);
  const maxLength = Math.max(...targetEqStrings.map((e) => e.length));
  const gridSize = Math.max(10, maxLength + 3);

  const { grid, placedEquations: initialPlacedEquations } = useMemo(() => {
    const matrix: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
    const placements: PlacedEquation[] = [];

    const directions: { dir: Direction; dr: number; dc: number }[] = [
      { dir: 'H', dr: 0, dc: 1 },
      { dir: 'V', dr: 1, dc: 0 },
      { dir: 'D', dr: 1, dc: 1 },
    ];

    normalizedEquations.forEach((item) => {
      const eq = item.equation;
      if (!eq) return;

      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 100) {
        attempts++;
        const randDirObj = directions[Math.floor(Math.random() * directions.length)];
        const { dir, dr, dc } = randDirObj;

        const maxR = gridSize - (dr === 1 ? eq.length : 0);
        const maxC = gridSize - (dc === 1 ? eq.length : 0);

        if (maxR <= 0 || maxC <= 0) continue;

        const startR = Math.floor(Math.random() * maxR);
        const startC = Math.floor(Math.random() * maxC);

        let canPlace = true;
        for (let i = 0; i < eq.length; i++) {
          const r = startR + i * dr;
          const c = startC + i * dc;
          const currentCell = matrix[r][c];
          if (currentCell !== '' && currentCell !== eq[i]) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let i = 0; i < eq.length; i++) {
            const r = startR + i * dr;
            const c = startC + i * dc;
            matrix[r][c] = eq[i];
          }
          placements.push({
            equation: eq,
            hint: item.hint,
            row: startR,
            col: startC,
            direction: dir,
            found: false,
          });
          placed = true;
        }
      }
    });

    const numbersAndSymbols = '0123456789+-=*';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (matrix[r][c] === '') {
          matrix[r][c] = numbersAndSymbols[Math.floor(Math.random() * numbersAndSymbols.length)];
        }
      }
    }

    return { grid: matrix, placedEquations: placements };
  }, [data, gridSize]);

  const [activeEquations, setActiveEquations] = useState<PlacedEquation[]>(initialPlacedEquations);

  const foundCellsMap = useMemo(() => {
    const map = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    activeEquations.forEach((item) => {
      if (!item.found) return;
      const { row, col, direction, equation } = item;
      const dr = direction === 'V' || direction === 'D' ? 1 : 0;
      const dc = direction === 'H' || direction === 'D' ? 1 : 0;

      for (let i = 0; i < equation.length; i++) {
        map[row + i * dr][col + i * dc] = true;
      }
    });
    return map;
  }, [activeEquations, gridSize]);

  useEffect(() => {
    if (activeEquations.length > 0 && activeEquations.every((e) => e.found)) {
      playSuccessSound();

      confetti({
        particleCount: mode === 'challenge' ? 120 : 60,
        spread: 80,
        origin: { y: 0.6 }
      });

      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      
      setTimeout(() => {
        onComplete(100, 100, timeTaken);
      }, 1500);
    }
  }, [activeEquations]);

  const handleVerifySelection = () => {
    if (selectedCells.length === 0 || selectionStatus !== 'idle') return;

    const formedString = selectedCells.map((cell) => grid[cell.r][cell.c]).join('');
    const reversedFormedString = [...selectedCells].reverse().map((cell) => grid[cell.r][cell.c]).join('');

    const matchedIndex = activeEquations.findIndex(
      (item) => !item.found && (item.equation === formedString || item.equation === reversedFormedString)
    );

    if (matchedIndex !== -1) {
      playSuccessSound();
      setSelectionStatus('correct');

      const updatedEquations = [...activeEquations];
      updatedEquations[matchedIndex].found = true;
      setActiveEquations(updatedEquations);
      setScore((prev) => prev + Math.round(100 / targetEqStrings.length));

      setTimeout(() => {
        setSelectedCells([]);
        setSelectionStatus('idle');
      }, 700);
    } else {
      setSelectionStatus('wrong');
      setTimeout(() => {
        setSelectedCells([]);
        setSelectionStatus('idle');
      }, 700);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full p-4 md:p-8 rounded-[2.5rem] shadow-2xl border bg-slate-900 border-slate-800 text-slate-100 relative box-border">
      <div className="flex justify-between items-center mb-6 text-xs font-black tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700">
          ⏳ {formatTime(elapsedSeconds)}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" /> Math Grid Search
        </span>
        <span className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold">
          SKOR: {score}
        </span>
      </div>

      <div className="mb-6 p-4 bg-indigo-950/40 rounded-2xl border border-indigo-500/30 text-center">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide block mb-1">Misi Hitung</span>
        <h2 className="text-base md:text-lg font-extrabold text-white">
          "{data.clue}"
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col items-center gap-4 w-full overflow-hidden">
          <div className="bg-slate-950/60 p-3 md:p-4 rounded-3xl border border-slate-800 flex justify-center overflow-x-auto w-full">
            <div 
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {grid.map((row, rIdx) =>
                row.map((char, cIdx) => {
                  const isSelected = selectedCells.some((cell) => cell.r === rIdx && cell.c === cIdx);
                  const isFoundCell = foundCellsMap[rIdx][cIdx];

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      onClick={() => {
                        if (selectionStatus !== 'idle') return;
                        playBipSound();
                        setSelectedCells((prev) =>
                          prev.some((cell) => cell.r === rIdx && cell.c === cIdx)
                            ? prev.filter((cell) => !(cell.r === rIdx && cell.c === cIdx))
                            : [...prev, { r: rIdx, c: cIdx }]
                        );
                      }}
                      className={`w-7 h-7 md:w-8 md:h-8 rounded-xl font-mono font-black text-xs md:text-sm flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? selectionStatus === 'correct'
                            ? 'bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/30'
                            : selectionStatus === 'wrong'
                            ? 'bg-rose-500 text-white scale-105 shadow-md shadow-rose-500/30 animate-pulse'
                            : 'bg-indigo-600 text-white shadow-md scale-105'
                          : isFoundCell
                          ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold'
                          : 'bg-slate-850 border border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {char}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                playBipSound();
                setSelectedCells([]);
                setSelectionStatus('idle');
              }}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reset Pilihan
            </button>
            <button
              type="button"
              onClick={handleVerifySelection}
              disabled={selectedCells.length === 0 || selectionStatus !== 'idle'}
              className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Cek Persamaan
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-950/60 p-5 rounded-3xl border border-slate-800 space-y-3 w-full">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Daftar Persamaan Target:
            </h3>
            <span className="text-[10px] text-slate-500 italic">Klik nomor untuk hint</span>
          </div>

          <div className="space-y-2.5">
            {activeEquations.map((item, index) => {
              const hasHint = Boolean(item.hint && item.hint.trim() !== '');
              const isHintOpen = activeHintIndex === index;

              return (
                <div 
                  key={index}
                  className={`p-3 rounded-2xl border transition-all ${
                    item.found 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => hasHint && setActiveHintIndex(isHintOpen ? null : index)}
                        className={`text-xs font-extrabold px-2 py-1 rounded-xl flex items-center gap-1 transition ${
                          hasHint 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 cursor-pointer' 
                            : 'bg-slate-800 text-slate-500 cursor-default'
                        }`}
                        title={hasHint ? "Klik untuk lihat hint" : "Tidak ada hint"}
                      >
                        <span>{index + 1}.</span>
                        {hasHint && <HelpCircle className="w-3 h-3" />}
                      </button>

                      <div className="flex gap-1 tracking-widest font-mono font-bold text-xs md:text-sm">
                        {item.equation.split('').map((char, cIdx) => (
                          <span key={cIdx} className="border-b-2 border-slate-700 pb-0.5 px-1 min-w-[14px] text-center">
                            {item.found ? char : '_'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {item.found && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  </div>

                  {isHintOpen && hasHint && (
                    <div className="mt-2.5 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 font-medium animate-in fade-in duration-150 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold block text-[10px] uppercase text-amber-400">Petunjuk Hitung:</span>
                        {item.hint}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-1 text-[11px] text-slate-500 text-center font-medium">
            Temukan rangkaian angka & operator matematika secara berurutan di papan.
          </div>
        </div>
      </div>
    </div>
  );
}