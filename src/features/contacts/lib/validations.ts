import { z } from 'zod';
import type { CustomField } from '../types';

export function buildContactSchema(customFields: CustomField[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {
    numero: z.string().min(1, 'El número es obligatorio'),
    nombre: z.string().optional(),
  };

  customFields.forEach(field => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.field_type) {
      case 'email':
        fieldSchema = z.string().email('Email inválido');
        break;
      case 'phone':
        fieldSchema = z.string().regex(/^\+?[0-9]{8,15}$/, 'Teléfono inválido');
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        break;
      case 'date':
        fieldSchema = z.string();
        break;
      case 'checkbox':
        fieldSchema = z.boolean().default(false);
        break;
      case 'select':
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case 'url':
        fieldSchema = z.string().url('URL inválida');
        break;
      case 'textarea':
        fieldSchema = z.string();
        break;
      default:
        fieldSchema = z.string();
    }

    if (field.required) {
      if (field.field_type === 'checkbox') {
        fieldSchema = z.boolean();
      } else {
        fieldSchema = fieldSchema.refine(val => val !== '' && val !== null && val !== undefined, {
          message: `${field.field_label} es obligatorio`,
        });
      }
    } else {
      fieldSchema = fieldSchema.optional();
    }

    schemaShape[field.field_name] = fieldSchema;
  });

  return z.object(schemaShape);
}
