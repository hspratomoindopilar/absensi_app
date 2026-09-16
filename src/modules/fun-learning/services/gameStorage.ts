// gameStorage.ts

export interface SessionProgress {
  currentBlockIndex: number;
  score: number;
  completedBlocks: number[];
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'game_session_progress_';

/**
 * Menyimpan progres sesi game ke localStorage
 */
export function saveSessionProgress(sessionId: string | number, progress: Omit<SessionProgress, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const dataToSave: SessionProgress = {
      ...progress,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Gagal menyimpan progres game:', error);
  }
}

/**
 * Mengambil progres sesi game yang tersimpan di localStorage
 */
export function getSessionProgress(sessionId: string | number): SessionProgress | null {
  if (typeof window === 'undefined') return null;

  try {
    const savedData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    if (!savedData) return null;

    return JSON.parse(savedData) as SessionProgress;
  } catch (error) {
    console.error('Gagal membaca progres game:', error);
    return null;
  }
}

/**
 * Menghapus data progres sesi (misal saat game selesai atau siswa memilih mulai ulang)
 */
export function clearSessionProgress(sessionId: string | number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
  } catch (error) {
    console.error('Gagal menghapus progres game:', error);
  }
}