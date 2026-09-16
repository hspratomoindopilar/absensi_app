// src/modules/fun-learning/components/builder/GamePreviewModal.tsx
'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import SessionRunner from '../SessionRunner';
import { SessionItem } from '../../hooks/useGameBuilderState';

interface GamePreviewModalProps {
  title: string;
  sessions: SessionItem[];
  onClose: () => void;
}

export default function GamePreviewModal({ title, sessions, onClose }: GamePreviewModalProps) {
  const [previewSessionIdx, setPreviewSessionIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-extrabold rounded-lg">LIVE PREVIEW</span>
            <h3 className="text-sm font-bold truncate max-w-md">{title || 'Preview Game Tanpa Judul'}</h3>
          </div>
          {sessions.length > 1 && (
            <select
              className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
              value={previewSessionIdx}
              onChange={(e) => setPreviewSessionIdx(Number(e.target.value))}
            >
              {sessions.map((s, idx) => (
                <option key={s.session_id} value={idx}>
                  {s.session_title ? `Sesi: ${s.session_title}` : `Sesi #${idx + 1}`}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex items-center justify-center">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <SessionRunner
              session={sessions[previewSessionIdx] || sessions[0]}
              onBack={onClose}
              onSessionFinish={(score, accuracy, time) => {
                alert(`🎉 Selesai Preview Sesi Ini! Skor: ${score}, Akurasi: ${accuracy}%`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}