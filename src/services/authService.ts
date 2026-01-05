import { supabase } from '@/integrations/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  success: boolean;
  error?: string;
  errorType?: 'email_exists' | 'invalid_credentials' | 'weak_password' | 'network' | 'unknown';
}

export class AuthService {
  /**
   * Registro de nuevo usuario
   */
  static async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/import`,
        },
      });

      if (error) {
        return this.handleAuthError(error);
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No se pudo crear el usuario',
          errorType: 'unknown',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error en signUp:', error);
      return {
        success: false,
        error: 'Error de red. Verifica tu conexión.',
        errorType: 'network',
      };
    }
  }

  /**
   * Inicio de sesión
   */
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return this.handleAuthError(error);
      }

      return { success: true };
    } catch (error) {
      console.error('Error en signIn:', error);
      return {
        success: false,
        error: 'Error de red. Verifica tu conexión.',
        errorType: 'network',
      };
    }
  }

  /**
   * Cierre de sesión
   */
  static async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
          errorType: 'unknown',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error en signOut:', error);
      return {
        success: false,
        error: 'Error al cerrar sesión',
        errorType: 'network',
      };
    }
  }

  /**
   * Manejo centralizado de errores de Supabase Auth
   */
  private static handleAuthError(error: AuthError): AuthResponse {
    const errorMessage = error.message.toLowerCase();

    // Usuario ya existe
    if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      return {
        success: false,
        error: 'Este email ya está registrado. Intenta iniciar sesión.',
        errorType: 'email_exists',
      };
    }

    // Credenciales inválidas
    if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid password')) {
      return {
        success: false,
        error: 'Email o contraseña incorrectos.',
        errorType: 'invalid_credentials',
      };
    }

    // Contraseña débil
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return {
        success: false,
        error: 'La contraseña es demasiado débil.',
        errorType: 'weak_password',
      };
    }

    // Error genérico
    return {
      success: false,
      error: error.message || 'Error desconocido. Intenta de nuevo.',
      errorType: 'unknown',
    };
  }
}
