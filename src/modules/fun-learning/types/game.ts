export type GameType = 
  | 'matching_pair' 
  | 'card_quiz' 
  | 'word_scramble' 
  | 'puzzle_reveal' 
  | 'word_search'
  | 'math_grid'
  | 'equation_balance'
  | 'number_merge'
  | 'fraction_slice';

// --- TAMBAHAN BARU UNTUK STRUKTUR MODULAR (WORDWALL x DUOLINGO) ---

// Blok engine tunggal di dalam sebuah sesi
export interface EngineBlock {
  block_id: string;
  engine_type: GameType;
  config_data: any; // Data spesifik per engine (pairs, items, questions, dll)
}

// Sesi pembelajaran bertingkat (stages)
export interface LearningSession {
  session_id: string;
  session_title: string;
  target_exp: number;
  blocks: EngineBlock[];
}

// Struktur config utama yang mendukung multi-sesi atau single config lama
export interface ModularGameConfig {
  sessions: LearningSession[];
}

// -----------------------------------------------------------------

export interface FunGame {
  game_id?: string;
  tenant_id: string;
  creator_id?: string;
  title: string;
  subject: string;
  target_class: string;
  game_type: GameType | 'multi_stage_module'; // Ditambahkan dukungan tipe multi-stage
  reward_exp: number;
  reward_coins: number;
  config: ModularGameConfig | any; // Mendukung struktur modular sessions atau config lama
  is_published: boolean;
  created_at?: string;
}

export interface GameSubmission {
  submission_id?: string;
  game_id: string;
  student_id: string;
  tenant_id: string;
  score: number;
  accuracy_percentage: number;
  time_taken_seconds: number;
  is_completed: boolean;
  earned_rewards: {
    exp_gained: number;
    coins_gained: number;
    completed_sessions?: string[]; // Ditambahkan untuk tracking sesi siswa
    coins_spent_for_retry?: number; // Ditambahkan untuk tracking tebus koin
  };
  submitted_at?: string;
}