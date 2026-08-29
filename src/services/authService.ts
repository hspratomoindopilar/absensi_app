import { supabase } from '@/lib/supabase';
import { RegisterTenantPayload } from '@/types/database';


export async function registerTenantAndAdmin(payload: RegisterTenantPayload) {
  // 1. Buat akun di Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Gagal membuat akun pengguna.');

  const userId = authData.user.id;

  // 2. Panggil PostgreSQL RPC function yang aman melewati RLS dengan hak akses database
  const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_tenant', {
    p_school_name: payload.schoolName,
    p_slug: payload.slug,
    p_admin_name: payload.adminName,
    p_email: payload.email,
    p_user_id: userId,
    p_class_name: payload.className,
    p_academic_year: payload.academicYear,
    p_school_days: payload.schoolDays,
  });

  if (rpcError) {
    throw new Error(rpcError.message || 'Gagal mendaftarkan data institusi.');
  }

  return rpcData;
}