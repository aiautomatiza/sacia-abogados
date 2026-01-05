import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "El email es obligatorio" })
    .email({ message: "Email inválido" })
    .max(255, { message: "Email demasiado largo" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(72, { message: "Contraseña demasiado larga" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
