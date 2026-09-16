// src/modules/fun-learning/components/builder/ClassSelectorDropdown.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClassSelectorDropdownProps {
  tenantId: string;
  targetClasses: string[];
  onChange: (classes: string[]) => void;
}

export default function ClassSelectorDropdown({ tenantId, targetClasses, onChange }: ClassSelectorDropdownProps) {
  const [availableClasses, setAvailableClasses] = useState<{ class_id: string; class_name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('class_id, class_name')
          .eq('tenant_id', tenantId);

        if (data && !error) setAvailableClasses(data);
      } catch (err) {
        console.error('Gagal memuat data kelas:', err);
      }
    }
    if (tenantId) fetchClasses();
  }, [tenantId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (className: string) => {
    if (targetClasses.includes(className)) {
      onChange(targetClasses.filter(c => c !== className));
    } else {
      onChange([...targetClasses, className]);
    }
  };

  const filtered = availableClasses.filter(cls =>
    cls.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Target Kelas Siswa</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[52px] p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-2 cursor-pointer hover:border-slate-300 transition"
      >
        {targetClasses.length === 0 ? (
          <span className="text-sm text-slate-400">Pilih kelas target (bisa lebih dari satu)...</span>
        ) : (
          targetClasses.map((cls) => (
            <span key={cls} className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              {cls}
              <X className="w-3.5 h-3.5 hover:text-rose-200 transition cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggle(cls); }} />
            </span>
          ))
        )}
        <div className="ml-auto text-slate-400">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kelas..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">Kelas tidak ditemukan</div>
            ) : (
              filtered.map((cls) => {
                const isChecked = targetClasses.includes(cls.class_name);
                return (
                  <div
                    key={cls.class_id}
                    onClick={() => handleToggle(cls.class_name)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-sm cursor-pointer transition ${
                      isChecked ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{cls.class_name}</span>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                      isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}