'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBottomStudent() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 backdrop-blur-md border-t py-2.5 px-6 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] transition-colors duration-300"
            style={{ 
                backgroundColor: 'var(--bg-header)', 
                borderColor: 'var(--border-light)' 
            }}
        >
            <div className="max-w-2xl mx-auto flex justify-around items-center">
                <Link 
                    href="/student/dashboard" 
                    className={`flex flex-col items-center gap-1 transition ${
                        isActive('/student/dashboard') 
                            ? 'font-bold drop-shadow-[0_0_8px_var(--hover-shadow)]' 
                            : 'hover:opacity-100 opacity-75 font-semibold'
                    }`}
                    style={{ color: isActive('/student/dashboard') ? 'var(--badge-text)' : 'var(--text-muted)' }}
                >
                    <span className="text-base">🏠</span>
                    <span className="text-[10px]">Home</span>
                </Link>

                {/* Diubah jadi Link ke Halaman Games */}
                <Link 
                    href="/student/games" 
                    className={`flex flex-col items-center gap-1 transition ${
                        isActive('/student/games') 
                            ? 'font-bold drop-shadow-[0_0_8px_var(--hover-shadow)]' 
                            : 'hover:opacity-100 opacity-75 font-semibold'
                    }`}
                    style={{ color: isActive('/student/games') ? 'var(--badge-text)' : 'var(--text-muted)' }}
                >
                    <span className="text-base">🎮</span>
                    <span className="text-[10px]">Misi</span>
                </Link>

                <button 
                    className="flex flex-col items-center gap-1 transition cursor-pointer font-semibold opacity-75 hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <span className="text-base">📝</span>
                    <span className="text-[10px]">Ujian</span>
                </button>

                <Link 
                    href="/student/raport" 
                    className={`flex flex-col items-center gap-1 transition ${
                        isActive('/student/raport') 
                            ? 'font-bold drop-shadow-[0_0_8px_var(--hover-shadow)]' 
                            : 'hover:opacity-100 opacity-75 font-semibold'
                    }`}
                    style={{ color: isActive('/student/raport') ? 'var(--badge-text)' : 'var(--text-muted)' }}
                >
                    <span className="text-base">📊</span>
                    <span className="text-[10px]">Raport</span>
                </Link>

                <Link 
                    href="/student/profile" 
                    className={`flex flex-col items-center gap-1 transition ${
                        isActive('/student/profile') 
                            ? 'font-bold drop-shadow-[0_0_8px_var(--hover-shadow)]' 
                            : 'hover:opacity-100 opacity-75 font-semibold'
                    }`}
                    style={{ color: isActive('/student/profile') ? 'var(--badge-text)' : 'var(--text-muted)' }}
                >
                    <span className="text-base">⚙️</span>
                    <span className="text-[10px]">Profil</span>
                </Link>
            </div>
        </div>
    );
}