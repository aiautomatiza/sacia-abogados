import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Save } from 'lucide-react';

interface FieldMappingEditorProps {
  mappings: Record<string, string>;
  onSave: (mappings: Record<string, string>) => void;
  isLoading?: boolean;
}

export function FieldMappingEditor({ mappings, onSave, isLoading }: FieldMappingEditorProps) {
  const [localMappings, setLocalMappings] = useState(mappings);

  const addMapping = () => {
    const tempKey = `new_field_${Date.now()}`;
    setLocalMappings({
      ...localMappings,
      [tempKey]: '',
    });
  };

  const removeMapping = (sourceField: string) => {
    const newMappings = { ...localMappings };
    delete newMappings[sourceField];
    setLocalMappings(newMappings);
  };

  const updateMapping = (oldSource: string, newSource: string, target: string) => {
    const newMappings = { ...localMappings };

    // Si cambió la clave
    if (oldSource !== newSource) {
      delete newMappings[oldSource];
    }

    newMappings[newSource] = target;
    setLocalMappings(newMappings);
  };

  const handleSave = () => {
    // Filtrar mappings vacíos
    const cleanedMappings = Object.entries(localMappings).reduce((acc, [key, value]) => {
      if (key.trim() && value.trim()) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    onSave(cleanedMappings);
  };

  const entries = Object.entries(localMappings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeo de Campos</CardTitle>
        <CardDescription>
          Configura cómo se mapean los campos del dashboard con los campos del software externo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay campos mapeados. Haz clic en "Agregar Campo" para comenzar.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(([source, target]) => (
              <div key={source} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Campo en Dashboard</Label>
                  <Input
                    value={source.startsWith('new_field_') ? '' : source}
                    onChange={(e) => updateMapping(source, e.target.value, target)}
                    placeholder="ej: nombre, attributes.email"
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Campo en Software Externo</Label>
                  <Input
                    value={target}
                    onChange={(e) => updateMapping(source, source, e.target.value)}
                    placeholder="ej: full_name, email"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMapping(source)}
                  title="Eliminar campo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={addMapping} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Campo
          </Button>
          <Button onClick={handleSave} disabled={isLoading} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Ejemplos de campos del Dashboard:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li><code>numero</code> - Número de teléfono</li>
            <li><code>nombre</code> - Nombre del contacto</li>
            <li><code>attributes.email</code> - Email (campo custom)</li>
            <li><code>attributes.empresa</code> - Empresa (campo custom)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
