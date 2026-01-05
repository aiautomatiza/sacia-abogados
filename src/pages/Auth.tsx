import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { AuthService } from '@/services/authService';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { AlertCircle, Mail, Lock } from 'lucide-react';
import logoAiAutomatiza from '@/assets/logo-aiautomatiza.png';

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const [authError, setAuthError] = useState<string | null>(null);

  // Form para Login
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (user && !roleLoading && role) {
      // Redirect based on role
      if (role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'user_client') {
        navigate('/contacts', { replace: true });
      }
    }
  }, [user, role, roleLoading, navigate]);

  const handleLogin = async (data: LoginInput) => {
    setAuthError(null);

    const result = await AuthService.signIn(data.email, data.password);

    if (!result.success) {
      setAuthError(result.error || 'Error al iniciar sesión');
      toast.error(result.error || 'Error al iniciar sesión');
      return;
    }

    toast.success('¡Bienvenido!');
    // Navigation is handled by useEffect based on role
  };

  const isLoading = loginForm.formState.isSubmitting;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-4">
      {/* Logo y título superior */}
      <div className="mb-8 text-center">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 p-3">
          <img src={logoAiAutomatiza} alt="AIAutomatiza" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-heading font-semibold text-foreground">AIAutomatiza</h1>
      </div>

      <Card className="w-full max-w-md shadow-sm border-border bg-card">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-xl font-medium text-foreground">Iniciar Sesión</CardTitle>
          <CardDescription className="text-muted-foreground">
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mensaje de error global */}
          {authError && (
            <Alert variant="destructive" className="mb-4 border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{authError}</AlertDescription>
            </Alert>
          )}

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-left block font-medium">Email</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<Mail className="h-5 w-5" />}
                        type="email"
                        placeholder="Ingresa tu email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-left block font-medium">Contraseña</FormLabel>
                    <FormControl>
                      <InputWithIcon
                        icon={<Lock className="h-5 w-5" />}
                        type="password"
                        placeholder="Ingresa tu contraseña"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-6" 
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            ¿No tienes una cuenta? Contacta con un administrador para recibir una invitación.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
