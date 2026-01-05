/**
 * Obtiene un valor anidado de un objeto usando una ruta en string
 * @param obj Objeto del cual extraer el valor
 * @param path Ruta separada por puntos (ej: "attributes.email")
 * @returns El valor en la ruta especificada, o undefined si no existe
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Establece un valor anidado en un objeto usando una ruta en string
 * @param obj Objeto en el cual establecer el valor
 * @param path Ruta separada por puntos (ej: "contact.email")
 * @param value Valor a establecer
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Mapea un objeto usando un diccionario de mapeo de campos
 * @param source Objeto fuente
 * @param mappings Diccionario de mapeo { sourcePath: targetPath }
 * @returns Objeto con campos mapeados
 */
export function mapObject(
  source: any,
  mappings: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [sourcePath, targetPath] of Object.entries(mappings)) {
    const value = getNestedValue(source, sourcePath);
    if (value !== undefined && value !== null) {
      setNestedValue(result, targetPath, value);
    }
  }

  return result;
}
