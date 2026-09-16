import { supabase } from '@/lib/supabase';
import { FunGame, GameSubmission } from '../types/game';

// 1. Menyimpan atau Membuat Game Baru oleh Guru
export async function createFunGame(gameData: FunGame) {
  const { data, error } = await supabase
    .from('fl_games')
    .insert([gameData])
    .select()
    .single();

  if (error) {
    console.error('Error creating fun game:', error.message);
    throw new Error(error.message);
  }

  return data;
}

export async function getGamesByTenantAndClass(tenantId: string, targetClass: string) {
  console.log("DEBUG - Tenant ID:", tenantId);
  console.log("DEBUG - Target Class siswa:", targetClass);

  const { data, error } = await supabase
    .from('fl_games')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_published', true)
    .ilike('target_class', `%${targetClass}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error.message);
    return [];
  }

  console.log("DEBUG - Hasil query game:", data);
  return data;
}

// 2. NEW: Fungsi khusus untuk mengambil status riwayat misi/submission siswa
export async function getStudentSubmissions(studentId: string) {
  const { data, error } = await supabase
    .from('fl_game_submissions')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching student submissions:', error.message);
    return [];
  }

  return data || [];
}


// 3. Menyimpan Hasil Pengerjaan Siswa per Sesi (Submission) & Mengupdate Statistik
export async function submitGameResult(submission: GameSubmission & { session_index: number }) {
  // A. Simpan/Update submission game berdasarkan kombinasi game_id, session_index, dan student_id
  const { data: subData, error: subError } = await supabase
    .from('fl_game_submissions')
    .upsert([submission], { onConflict: 'game_id, session_index, student_id' })
    .select()
    .single();

  if (subError) {
    console.error('Error submitting game result:', subError.message);
    throw new Error(subError.message);
  }

  // B. Penanganan Reward Fleksibel: Mengambil nilai EXP dari payload secara akurat
  const expGained = submission.earned_rewards?.exp_gained || 0;
  
  // Koin bersumber mutlak dari konversi EXP atau menggunakan koin spesifik dari payload
  const coinsGained = submission.earned_rewards?.coins_gained !== undefined 
    ? submission.earned_rewards.coins_gained 
    : expGained / 10; 

  // C. Ambil statistik siswa saat ini di fl_student_stats
  const { data: existingStats, error: statsError } = await supabase
    .from('fl_student_stats')
    .select('*')
    .eq('student_id', submission.student_id)
    .single();

  if (statsError && statsError.code === 'PGRST116') {
    await supabase.from('fl_student_stats').insert([{
      student_id: submission.student_id,
      tenant_id: submission.tenant_id,
      total_exp: expGained,
      total_coins: coinsGained,
      games_played_count: 1,
      updated_at: new Date().toISOString()
    }]);
  } else if (existingStats) {
    await supabase.from('fl_student_stats').update({
      total_exp: (existingStats.total_exp || 0) + expGained,
      total_coins: (existingStats.total_coins || 0) + coinsGained,
      games_played_count: (existingStats.games_played_count || 0) + 1,
      updated_at: new Date().toISOString()
    }).eq('student_id', submission.student_id);
  }

  return subData;
}

// 4. Mengupdate Modul Game yang Sudah Ada oleh Guru
export async function updateFunGame(gameId: string, gameData: Partial<FunGame>) {
  const { data, error } = await supabase
    .from('fl_games')
    .update(gameData)
    .eq('game_id', gameId)
    .select()
    .single();

  if (error) {
    console.error('Error updating fun game:', error.message);
    throw new Error(error.message);
  }

  return data;
}