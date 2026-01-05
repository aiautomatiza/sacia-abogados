import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateTokenRequest {
  action: 'validate_token';
  token: string;
}

interface CompleteInvitationRequest {
  action: 'complete_invitation';
  token: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request = await req.json() as ValidateTokenRequest | CompleteInvitationRequest;
    const { action, token } = request;

    if (!token) {
      throw new Error('Token es obligatorio');
    }

    // Validate token exists and is not expired
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      throw new Error('Token inválido o expirado');
    }

    // Check if token has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseClient
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      
      throw new Error('Este enlace de invitación ha expirado');
    }

    // VALIDATE TOKEN ACTION
    if (action === 'validate_token') {
      return new Response(
        JSON.stringify({
          success: true,
          email: invitation.email,
          full_name: invitation.full_name,
          role: invitation.role
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // COMPLETE INVITATION ACTION
    if (action === 'complete_invitation') {
      const { password } = request as CompleteInvitationRequest;

      if (!password) {
        throw new Error('Contraseña es obligatoria');
      }

      // Validate password strength (basic validation)
      if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      console.log('Completing invitation for:', invitation.email);

      // Check again if user already exists
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === invitation.email);
      
      if (existingUser) {
        throw new Error('Este email ya está registrado');
      }

      // Create user in auth.users
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: invitation.full_name }
      });

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError);
        throw new Error(`Error al crear usuario: ${createError?.message || 'Unknown error'}`);
      }

      const userId = newUser.user.id;

      console.log('User created, assigning role:', userId);

      // Insert role
      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role: invitation.role });

      if (roleInsertError) {
        console.error('Error inserting role:', roleInsertError);
        // Cleanup: delete the user
        await supabaseClient.auth.admin.deleteUser(userId);
        throw new Error(`Error al asignar role: ${roleInsertError.message}`);
      }

      console.log('Role assigned, updating profile');

      // Update profile with tenant_id
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ 
          tenant_id: invitation.role === 'user_client' ? invitation.tenant_id : null 
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Cleanup: delete role and user
        await supabaseClient.from('user_roles').delete().eq('user_id', userId);
        await supabaseClient.auth.admin.deleteUser(userId);
        throw new Error(`Error al actualizar perfil: ${profileError.message}`);
      }

      console.log('Profile updated, marking invitation as completed');

      // Mark invitation as completed
      const { error: updateInvitationError } = await supabaseClient
        .from('user_invitations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          user_id: userId
        })
        .eq('id', invitation.id);

      if (updateInvitationError) {
        console.error('Error updating invitation:', updateInvitationError);
      }

      console.log(`Invitation completed successfully for: ${invitation.email}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.',
          user_id: userId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Acción no válida');

  } catch (error: any) {
    console.error('Error in complete-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
