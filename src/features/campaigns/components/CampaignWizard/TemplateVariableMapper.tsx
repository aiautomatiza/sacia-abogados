/**
 * @fileoverview Template Variable Mapper Component
 * @description Allows users to map WhatsApp template variables to contact fields or static values
 */

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Variable, User, Hash, Type, AlertCircle } from 'lucide-react';
import type { CustomField } from '@/features/contacts/types';
import type {
  TemplateVariable,
  TemplateVariableMapping,
  TemplateVariableSource,
} from '../../types';

interface TemplateVariableMapperProps {
  variables: TemplateVariable[];
  customFields: CustomField[];
  mapping: TemplateVariableMapping[];
  bodyText: string;
  onMappingChange: (mapping: TemplateVariableMapping[]) => void;
}

type SourceType = 'fixed_field' | 'custom_field' | 'static_value';

const FIXED_FIELDS = [
  { value: 'nombre', label: 'Nombre del contacto' },
  { value: 'numero', label: 'Numero de telefono' },
] as const;

// Example values for preview
const EXAMPLE_VALUES: Record<string, string> = {
  nombre: 'Juan Perez',
  numero: '+52 55 1234 5678',
};

export function TemplateVariableMapper({
  variables,
  customFields,
  mapping,
  bodyText,
  onMappingChange,
}: TemplateVariableMapperProps) {
  // Sort variables by position
  const sortedVariables = useMemo(
    () => [...variables].sort((a, b) => a.position - b.position),
    [variables]
  );

  // Get current mapping for a variable
  const getMappingForVariable = (position: number): TemplateVariableMapping | undefined => {
    return mapping.find((m) => m.position === position);
  };

  // Get the source type from a mapping
  const getSourceType = (position: number): SourceType | '' => {
    const m = getMappingForVariable(position);
    return m?.source.type || '';
  };

  // Get the selected value for a source type
  const getSourceValue = (position: number): string => {
    const m = getMappingForVariable(position);
    if (!m) return '';

    switch (m.source.type) {
      case 'fixed_field':
        return m.source.field;
      case 'custom_field':
        return m.source.fieldName;
      case 'static_value':
        return m.source.value;
      default:
        return '';
    }
  };

  // Handle source type change
  const handleSourceTypeChange = (position: number, variableName: string, sourceType: SourceType) => {
    const newMapping = mapping.filter((m) => m.position !== position);

    // Create default source based on type
    let source: TemplateVariableSource;
    switch (sourceType) {
      case 'fixed_field':
        source = { type: 'fixed_field', field: 'nombre' };
        break;
      case 'custom_field':
        source = { type: 'custom_field', fieldName: customFields[0]?.field_name || '' };
        break;
      case 'static_value':
        source = { type: 'static_value', value: '' };
        break;
    }

    newMapping.push({
      position,
      variableName,
      source,
    });

    onMappingChange(newMapping.sort((a, b) => a.position - b.position));
  };

  // Handle source value change
  const handleSourceValueChange = (position: number, variableName: string, value: string) => {
    const currentMapping = getMappingForVariable(position);
    if (!currentMapping) return;

    const newMapping = mapping.filter((m) => m.position !== position);

    let source: TemplateVariableSource;
    switch (currentMapping.source.type) {
      case 'fixed_field':
        source = { type: 'fixed_field', field: value as 'numero' | 'nombre' };
        break;
      case 'custom_field':
        source = { type: 'custom_field', fieldName: value };
        break;
      case 'static_value':
        source = { type: 'static_value', value };
        break;
      default:
        return;
    }

    newMapping.push({
      position,
      variableName,
      source,
    });

    onMappingChange(newMapping.sort((a, b) => a.position - b.position));
  };

  // Generate preview text by replacing variables with example values
  const previewText = useMemo(() => {
    let text = bodyText;

    sortedVariables.forEach((variable) => {
      const m = mapping.find((item) => item.position === variable.position);
      let value = `{{${variable.position}}}`;

      if (m) {
        switch (m.source.type) {
          case 'fixed_field':
            value = EXAMPLE_VALUES[m.source.field] || `[${m.source.field}]`;
            break;
          case 'custom_field': {
            const field = customFields.find((f) => f.field_name === m.source.fieldName);
            value = field ? `[${field.field_label}]` : `[${m.source.fieldName}]`;
            break;
          }
          case 'static_value':
            value = m.source.value || `{{${variable.position}}}`;
            break;
        }
      }

      text = text.replace(`{{${variable.position}}}`, value);
    });

    return text;
  }, [bodyText, sortedVariables, mapping, customFields]);

  // Check if all variables are mapped
  const unmappedVariables = sortedVariables.filter((v) => {
    const m = getMappingForVariable(v.position);
    if (!m) return true;
    if (m.source.type === 'static_value' && !m.source.value) return true;
    if (m.source.type === 'custom_field' && !m.source.fieldName) return true;
    return false;
  });

  if (sortedVariables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Variable className="h-4 w-4" />
        <span>Configurar variables de la plantilla</span>
      </div>

      {/* Variable Mappers */}
      <div className="space-y-3">
        {sortedVariables.map((variable) => (
          <Card key={variable.position} className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {variable.position}
              </div>
              <span className="text-sm font-medium">
                Variable {`{{${variable.position}}}`}
                {variable.name && (
                  <span className="text-muted-foreground font-normal ml-1">
                    - {variable.name}
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Source Type Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de fuente</Label>
                <Select
                  value={getSourceType(variable.position)}
                  onValueChange={(value) =>
                    handleSourceTypeChange(variable.position, variable.name, value as SourceType)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_field">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Campo fijo
                      </div>
                    </SelectItem>
                    <SelectItem value="custom_field" disabled={customFields.length === 0}>
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5" />
                        Campo personalizado
                      </div>
                    </SelectItem>
                    <SelectItem value="static_value">
                      <div className="flex items-center gap-2">
                        <Type className="h-3.5 w-3.5" />
                        Valor estatico
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source Value Selector/Input */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor</Label>
                {getSourceType(variable.position) === 'fixed_field' && (
                  <Select
                    value={getSourceValue(variable.position)}
                    onValueChange={(value) =>
                      handleSourceValueChange(variable.position, variable.name, value)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIXED_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {getSourceType(variable.position) === 'custom_field' && (
                  <Select
                    value={getSourceValue(variable.position)}
                    onValueChange={(value) =>
                      handleSourceValueChange(variable.position, variable.name, value)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {customFields.map((field) => (
                        <SelectItem key={field.field_name} value={field.field_name}>
                          {field.field_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {getSourceType(variable.position) === 'static_value' && (
                  <Input
                    value={getSourceValue(variable.position)}
                    onChange={(e) =>
                      handleSourceValueChange(variable.position, variable.name, e.target.value)
                    }
                    placeholder="Ingrese el valor"
                    className="h-9"
                  />
                )}

                {!getSourceType(variable.position) && (
                  <div className="h-9 flex items-center text-sm text-muted-foreground">
                    Seleccione un tipo primero
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Warning for unmapped variables */}
      {unmappedVariables.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Variables sin configurar</p>
            <p className="text-xs mt-1">
              Configura todas las variables antes de lanzar la campana:{' '}
              {unmappedVariables.map((v) => `{{${v.position}}}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      <Card className="p-3 bg-muted/30">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-sm font-medium">Vista previa del mensaje</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{previewText}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Los valores entre corchetes [ ] se reemplazaran con los datos reales de cada contacto.
        </p>
      </Card>
    </div>
  );
}
