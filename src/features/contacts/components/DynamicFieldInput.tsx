import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ControllerRenderProps } from 'react-hook-form';
import type { CustomField } from '../types';

interface DynamicFieldInputProps {
  field: CustomField;
  formField: ControllerRenderProps<any, any>;
}

export function DynamicFieldInput({ field, formField }: DynamicFieldInputProps) {
  const renderInput = () => {
    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={`Ingrese ${field.field_label.toLowerCase()}`}
            {...formField}
            value={formField.value || ''}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formField.value || false}
              onCheckedChange={formField.onChange}
            />
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {field.field_label}
            </label>
          </div>
        );

      case 'select':
        return (
          <Select onValueChange={formField.onChange} value={formField.value || ''}>
            <SelectTrigger>
              <SelectValue placeholder={`Seleccione ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={`Ingrese ${field.field_label.toLowerCase()}`}
            {...formField}
            value={formField.value || ''}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            placeholder={`Ingrese ${field.field_label.toLowerCase()}`}
            {...formField}
            value={formField.value || ''}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            placeholder={`Ingrese ${field.field_label.toLowerCase()}`}
            {...formField}
            value={formField.value || ''}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            {...formField}
            value={formField.value || ''}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            placeholder={`Ingrese ${field.field_label.toLowerCase()}`}
            {...formField}
            value={formField.value || ''}
          />
        );

      default:
        return (
          <Input
            placeholder={`Ingrese ${field.field_label.toLowerCase()}`}
            {...formField}
            value={formField.value || ''}
          />
        );
    }
  };

  if (field.field_type === 'checkbox') {
    return (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
        <FormControl>{renderInput()}</FormControl>
        <FormMessage />
      </FormItem>
    );
  }

  return (
    <FormItem>
      <FormLabel>
        {field.field_label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <FormControl>{renderInput()}</FormControl>
      <FormMessage />
    </FormItem>
  );
}
