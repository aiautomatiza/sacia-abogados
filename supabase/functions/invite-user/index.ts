import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { verifySuperAdmin } from '../_shared/auth.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('No autenticado');
    }

    // Verify user is super_admin
    await verifySuperAdmin(supabaseClient, user.id);

    const { email, full_name, role, tenant_id } = await req.json();

    // Validations
    if (!email || !full_name || !role) {
      throw new Error('Email, nombre completo y role son obligatorios');
    }

    if (!['super_admin', 'user_client'].includes(role)) {
      throw new Error('Role debe ser super_admin o user_client');
    }

    if (role === 'user_client' && !tenant_id) {
      throw new Error('user_client requiere tenant_id');
    }

    // Verify tenant exists if provided
    if (tenant_id) {
      const { data: tenant, error: tenantError } = await supabaseClient
        .from('tenants')
        .select('id')
        .eq('id', tenant_id)
        .single();
      
      if (tenantError || !tenant) {
        throw new Error('Cliente no encontrado');
      }
    }

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);
    
    if (existingUser) {
      throw new Error('Este email ya está registrado');
    }

    // Check if there's a pending invitation for this email
    const { data: existingInvitation } = await supabaseClient
      .from('user_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Ya existe una invitación pendiente para este email');
    }

    console.log('Creating invitation for:', { email, full_name, role, tenant_id });

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('user_invitations')
      .insert({
        email,
        full_name,
        role,
        tenant_id: role === 'user_client' ? tenant_id : null,
        invited_by: user.id
      })
      .select()
      .single();

    if (invitationError || !invitation) {
      console.error('Error creating invitation:', invitationError);
      throw new Error(`Error al crear invitación: ${invitationError?.message || 'Unknown error'}`);
    }

    // Create setup link using production domain if available
    const productionDomain = Deno.env.get('PRODUCTION_DOMAIN') || 'campañas.aiautomatiza.com';
    const setupLink = `https://${productionDomain}/setup-account?token=${invitation.token}`;

    console.log('Sending invitation email to:', email);
    console.log('Setup link:', setupLink);
    
    // Use the verified domain from environment or default to reportes.aiautomatiza.com
    const emailDomain = Deno.env.get('EMAIL_DOMAIN') || 'reportes.aiautomatiza.com';
    const fromEmail = `CRM AIAutomatiza <invitaciones@${emailDomain}>`;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: '¡Bienvenido a CRM Campaigns!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #0ea5e9; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>¡Bienvenido a CRM Campaigns!</h2>
            <p>Hola <strong>${full_name}</strong>,</p>
            <p>Has sido invitado a unirte a nuestra plataforma como <strong>${role === 'super_admin' ? 'Super Administrador' : 'Usuario Cliente'}</strong>.</p>
            <p>Para completar tu registro y establecer tu contraseña, haz clic en el siguiente botón:</p>
            <a href="${setupLink}" class="button">Configurar mi cuenta</a>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #0ea5e9;">${setupLink}</p>
            <p style="color: #666; font-size: 14px;">Este enlace expirará en 7 días.</p>
            <div class="footer">
              <p>Si no solicitaste esta invitación, puedes ignorar este correo.</p>
              <p><strong>CRM Campaigns Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Delete invitation if email fails
      await supabaseClient
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id);
      throw new Error(`Error al enviar el email: ${emailError.message}`);
    }

    console.log(`Invitation sent successfully to: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        message: 'Invitación enviada correctamente. El usuario recibirá un correo para configurar su cuenta.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in invite-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
