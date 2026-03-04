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
  TemplateComponentType,
} from '../../types';

interface TemplateVariableMapperProps {
  variables: TemplateVariable[];
  customFields: CustomField[];
  mapping: TemplateVariableMapping[];
  bodyText: string;
  headerText?: string | null;
  footerText?: string | null;
  onMappingChange: (mapping: TemplateVariableMapping[]) => void;
  previewContact?: any; // Add optional contact data for accurate previews
}

type SourceType = 'fixed_field' | 'custom_field' | 'location_field' | 'static_value';

const FIXED_FIELDS = [
  { value: 'nombre', label: 'Nombre del contacto' },
  { value: 'numero', label: 'Numero de telefono' },
] as const;

const LOCATION_FIELDS = [
  { value: 'name', label: 'Nombre de la sede' },
  { value: 'address_line1', label: 'Dirección' },
  { value: 'city', label: 'Ciudad' },
  { value: 'phone', label: 'Teléfono de sede' },
  { value: 'email', label: 'Email de sede' },
  { value: 'code', label: 'Código de sede' },
] as const;

// Example values for preview
const EXAMPLE_VALUES: Record<string, string> = {
  nombre: 'Juan Perez',
  numero: '+34 600 000 000',
  location_name: 'Sede Central',
  location_city: 'Madrid',
};

export function TemplateVariableMapper({
  variables,
  customFields,
  mapping,
  bodyText,
  headerText,
  footerText,
  onMappingChange,
  previewContact,
}: TemplateVariableMapperProps) {
  // Sort variables by position
  const sortedVariables = useMemo(
    () => [...variables].sort((a, b) => a.position - b.position),
    [variables]
  );

  // Normalize mapping: fill in missing component field for old DB mappings
  const normalizedMapping = useMemo(() => {
    return mapping.map((m) => {
      if (m.component) return m;
      // Detect component from template texts
      const placeholder = `{{${m.position}}}`;
      let component: TemplateComponentType = 'BODY';
      if (headerText?.includes(placeholder)) component = 'HEADER';
      else if (footerText?.includes(placeholder)) component = 'FOOTER';
      return { ...m, component };
    });
  }, [mapping, headerText, footerText]);

  // Get current mapping for a variable
  const getMappingForVariable = (position: number, component: TemplateComponentType): TemplateVariableMapping | undefined => {
    return normalizedMapping.find((m) => m.position === position && m.component === component);
  };

  // Get the source type from a mapping
  const getSourceType = (position: number, component: TemplateComponentType): SourceType | '' => {
    const m = getMappingForVariable(position, component);
    return m?.source.type || '';
  };

  // Get the selected value for a source type
  const getSourceValue = (position: number, component: TemplateComponentType): string => {
    const m = getMappingForVariable(position, component);
    if (!m) return '';

    switch (m.source.type) {
      case 'fixed_field':
        return m.source.field;
      case 'custom_field':
        return m.source.fieldName;
      case 'location_field':
        return (m.source as any).field || '';
      case 'static_value':
        return m.source.value;
      default:
        return '';
    }
  };

  // Handle source type change
  const handleSourceTypeChange = (position: number, component: TemplateComponentType, variableName: string, sourceType: SourceType) => {
    const newMapping = normalizedMapping.filter((m) => !(m.position === position && m.component === component));

    // Create default source based on type
    let source: TemplateVariableSource;
    switch (sourceType) {
      case 'fixed_field':
        source = { type: 'fixed_field', field: 'nombre' };
        break;
      case 'custom_field':
        source = { type: 'custom_field', fieldName: customFields[0]?.field_name || '' };
        break;
      case 'location_field':
        source = { type: 'location_field', field: 'name' } as any;
        break;
      case 'static_value':
        source = { type: 'static_value', value: '' };
        break;
    }

    newMapping.push({
      position,
      component,
      variableName,
      source,
    });

    onMappingChange(newMapping.sort((a, b) => a.position - b.position));
  };

  // Handle source value change
  const handleSourceValueChange = (position: number, component: TemplateComponentType, variableName: string, value: string) => {
    const currentMapping = getMappingForVariable(position, component);
    if (!currentMapping) return;

    const newMapping = normalizedMapping.filter((m) => !(m.position === position && m.component === component));

    let source: TemplateVariableSource;
    switch (currentMapping.source.type) {
      case 'fixed_field':
        source = { type: 'fixed_field', field: value as 'numero' | 'nombre' };
        break;
      case 'custom_field':
        source = { type: 'custom_field', fieldName: value };
        break;
      case 'location_field':
        source = { type: 'location_field', field: value as any };
        break;
      case 'static_value':
        source = { type: 'static_value', value };
        break;
      default:
        return;
    }

    newMapping.push({
      position,
      component,
      variableName,
      source,
    });

    onMappingChange(newMapping.sort((a, b) => a.position - b.position));
  };

  // Generate preview text by replacing variables with example values or real contact data
  const { previewHeader, previewBody, previewFooter } = useMemo(() => {
    const replaceVarsInComponent = (text: string | null | undefined, compType: TemplateComponentType) => {
      if (!text) return text;
      let result = text;

      // Filter variables that belong to this component
      const componentVars = sortedVariables.filter((v) => v.component === compType);

      componentVars.forEach((variable) => {
        const m = normalizedMapping.find((item) => item.position === variable.position && item.component === compType);
        let value = `{{${variable.position}}}`;

        if (m) {
          switch (m.source.type) {
            case 'fixed_field':
              if (previewContact && m.source.field === 'numero') {
                value = previewContact.numero || EXAMPLE_VALUES['numero'];
              } else if (previewContact && m.source.field === 'nombre') {
                value = previewContact.nombre || EXAMPLE_VALUES['nombre'];
              } else {
                 value = EXAMPLE_VALUES[m.source.field] || `[${m.source.field}]`;
              }
              break;
              
          case 'custom_field': {
              const source = m.source as { type: 'custom_field'; fieldName: string };
              const field = customFields.find((f) => f.field_name === source.fieldName);
              if (previewContact && previewContact.attributes && source.fieldName) {
                 // Extract real data if we have it
                 let attributes = previewContact.attributes;
                 if (typeof attributes === 'string') {
                   try { attributes = JSON.parse(attributes); } catch { attributes = {}; }
                 }
                 
                 let contactVal = undefined;
                 if (attributes[source.fieldName] !== undefined) {
                   contactVal = attributes[source.fieldName];
                 } else {
                   const matchKey = Object.keys(attributes).find(k => k.toLowerCase() === source.fieldName!.toLowerCase());
                   if (matchKey) contactVal = attributes[matchKey];
                 }
                 
                 if (contactVal !== undefined && contactVal !== "") {
                    value = String(contactVal);
                 } else {
                    value = field ? `[${field.field_label}]` : `[${source.fieldName}]`;
                 }
              } else {
                 value = field ? `[${field.field_label}]` : `[${source.fieldName}]`;
              }
              break;
            }
            case 'static_value':
              value = m.source.value || `{{${variable.position}}}`;
              break;
            case 'location_field' as any: {
              const field = (m.source as any).field;
              if (previewContact?.location && previewContact.location[field]) {
                value = String(previewContact.location[field]);
              } else {
                const label = LOCATION_FIELDS.find(f => f.value === field)?.label || field;
                value = `[${label}]`;
              }
              break;
            }
          }
        }

        result = result.replace(`{{${variable.position}}}`, value);
      });

      return result;
    };

    return {
      previewHeader: replaceVarsInComponent(headerText, 'HEADER'),
      previewBody: replaceVarsInComponent(bodyText, 'BODY'),
      previewFooter: replaceVarsInComponent(footerText, 'FOOTER'),
    };
  }, [bodyText, headerText, footerText, sortedVariables, normalizedMapping, customFields, previewContact]);

  // Check if all variables are mapped
  const unmappedVariables = sortedVariables.filter((v) => {
    const m = getMappingForVariable(v.position, v.component);
    if (!m) return true;
    if (m.source.type === 'static_value' && !m.source.value) return true;
    if (m.source.type === 'custom_field' && !(m.source as { type: 'custom_field'; fieldName: string }).fieldName) return true;
    return false;
  });

  return (
    <div className="space-y-4">
      {/* Variable Mappers (only if template has variables) */}
      {sortedVariables.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
        <Variable className="h-4 w-4" />
        <span>Configurar variables de la plantilla</span>
      </div>

      {/* Variable Mappers */}
      <div className="space-y-3">
        {sortedVariables.map((variable) => (
          <Card key={`${variable.component}-${variable.position}`} className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {variable.position}
              </div>
              <span className="text-sm font-medium flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal border">
                  {variable.component}
                </span>
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
                  value={getSourceType(variable.position, variable.component)}
                  onValueChange={(value) =>
                    handleSourceTypeChange(variable.position, variable.component, variable.name, value as SourceType)
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
                    <SelectItem value="location_field">
                      <div className="flex items-center gap-2">
                        <Type className="h-3.5 w-3.5" />
                        Campo Sede
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
                {getSourceType(variable.position, variable.component) === 'fixed_field' && (
                  <Select
                    value={getSourceValue(variable.position, variable.component)}
                    onValueChange={(value) =>
                      handleSourceValueChange(variable.position, variable.component, variable.name, value)
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

                {getSourceType(variable.position, variable.component) === 'custom_field' && (
                  <Select
                    value={getSourceValue(variable.position, variable.component)}
                    onValueChange={(value) =>
                      handleSourceValueChange(variable.position, variable.component, variable.name, value)
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

                {getSourceType(variable.position, variable.component) === 'location_field' && (
                  <Select
                    value={getSourceValue(variable.position, variable.component)}
                    onValueChange={(value) =>
                      handleSourceValueChange(variable.position, variable.component, variable.name, value)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar atributo" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {getSourceType(variable.position, variable.component) === 'static_value' && (
                  <Input
                    value={getSourceValue(variable.position, variable.component)}
                    onChange={(e) =>
                      handleSourceValueChange(variable.position, variable.component, variable.name, e.target.value)
                    }
                    placeholder="Ingrese el valor"
                    className="h-9"
                  />
                )}

                {!getSourceType(variable.position, variable.component) && (
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
              {unmappedVariables.map((v) => `${v.component} {{${v.position}}}`).join(', ')}
            </p>
          </div>
        </div>
      )}
      </>
      )}

      {/* Preview */}
      <Card className="p-3 bg-muted/30">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-sm font-medium">Vista previa del mensaje</span>
        </div>
        <div className="space-y-1 text-sm">
          {previewHeader && (
            <p className="font-semibold whitespace-pre-wrap">{previewHeader}</p>
          )}
          <p className="whitespace-pre-wrap">{previewBody}</p>
          {previewFooter && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{previewFooter}</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Los valores entre corchetes [ ] se reemplazaran con los datos reales de cada contacto.
        </p>
      </Card>
    </div>
  );
}
