export async function verifySuperAdmin(supabaseClient: any, userId: string): Promise<void> {
  const { data: roles } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const isSuperAdmin = roles?.some((r: any) => r.role === 'super_admin');
  
  if (!isSuperAdmin) {
    throw new Error('No autorizado - requiere rol superAdmin');
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}
