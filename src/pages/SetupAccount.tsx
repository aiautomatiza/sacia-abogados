import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { setupPasswordSchema, type SetupPasswordInput } from '@/lib/validations/setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface InvitationData {
  email: string;
  full_name: string;
  role: string;
}

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SetupPasswordInput>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    if (!token) {
      setError('No se proporcionó un token de invitación válido');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('complete-invitation', {
        body: {
          action: 'validate_token',
          token
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Token inválido');

      setInvitationData({
        email: data.email,
        full_name: data.full_name,
        role: data.role
      });
      setError(null);
    } catch (err: any) {
      console.error('Error validating token:', err);
      setError(err.message || 'Error al validar el token de invitación');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: SetupPasswordInput) => {
    try {
      setValidating(true);
      
      const { data, error } = await supabase.functions.invoke('complete-invitation', {
        body: {
          action: 'complete_invitation',
          token,
          password: values.password
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error al crear la cuenta');

      toast.success('¡Cuenta creada exitosamente!', {
        description: 'Serás redirigido a la página de inicio de sesión'
      });

      setTimeout(() => {
        navigate('/auth?message=account_created');
      }, 2000);
    } catch (err: any) {
      console.error('Error completing invitation:', err);
      toast.error('Error', {
        description: err.message || 'No se pudo completar el registro'
      });
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitación inválida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              variant="outline"
            >
              Ir a inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>¡Bienvenido a CRM Campaigns!</CardTitle>
          <CardDescription>
            Configura tu contraseña para completar el registro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitationData && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{invitationData.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{invitationData.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <Badge variant={invitationData.role === 'super_admin' ? 'default' : 'secondary'}>
                  {invitationData.role === 'super_admin' ? 'Super Administrador' : 'Usuario Cliente'}
                </Badge>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Mínimo 8 caracteres"
                        {...field}
                        disabled={validating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Repite tu contraseña"
                        {...field}
                        disabled={validating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={validating}
                >
                  {validating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear mi cuenta'
                  )}
                </Button>
              </div>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground">
            <p>¿Ya tienes una cuenta?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal"
                onClick={() => navigate('/auth')}
              >
                Inicia sesión aquí
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
