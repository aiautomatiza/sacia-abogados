/**
 * @fileoverview Advanced filtering types for campaign contact segmentation
 */

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in';

export interface AdvancedContactFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | string[] | number | boolean | null;
}

export interface SegmentFilters {
  logic: 'AND' | 'OR';
  conditions: AdvancedContactFilter[];
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  starts_with: 'comienza con',
  ends_with: 'termina con',
  greater_than: 'mayor que',
  less_than: 'menor que',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
  in: 'es uno de',
  not_in: 'no es uno de',
};

export const TEXT_OPERATORS: FilterOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
];

export const NUMBER_OPERATORS: FilterOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty',
];

export const SELECT_OPERATORS: FilterOperator[] = [
  'equals',
  'not_equals',
  'in',
  'not_in',
  'is_empty',
  'is_not_empty',
];

export const BOOLEAN_OPERATORS: FilterOperator[] = ['equals'];

export function getOperatorsForFieldType(
  fieldType: string
): FilterOperator[] {
  switch (fieldType) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'select':
      return SELECT_OPERATORS;
    case 'checkbox':
      return BOOLEAN_OPERATORS;
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'textarea':
    default:
      return TEXT_OPERATORS;
  }
}
