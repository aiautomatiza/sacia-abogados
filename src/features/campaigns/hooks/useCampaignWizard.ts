/**
 * @fileoverview Campaign Wizard Hook
 * @description Centralizes all wizard state and logic for creating campaigns
 * Supports both CSV/Excel import and CRM contact selection
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useCustomFields } from '@/features/contacts';
import type {
  WizardStep,
  CampaignWizardState,
  ColumnMapping,
  ContactSourceType,
  ContactSelectionState,
  SelectedTemplate,
} from '../types';

interface UseCampaignWizardOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const initialCrmSelection: ContactSelectionState = {
  mode: 'manual',
  selectedIds: [],
  excludedIds: [],
  totalFiltered: 0,
};

const initialState: CampaignWizardState = {
  sourceType: null,
  file: null,
  data: [],
  columns: [],
  mapping: {},
  stats: null,
  importedContactIds: [],
  crmSelection: initialCrmSelection,
  selectedChannel: null,
  selectedWhatsAppNumberId: null,
  selectedWhatsAppWabaId: null,
  selectedTemplate: null,
  validation: null,
  loading: false,
};

export function useCampaignWizard({ onSuccess, onError }: UseCampaignWizardOptions = {}) {
  const [step, setStep] = useState<WizardStep>('source');
  const [state, setState] = useState<CampaignWizardState>(initialState);

  // Contact IDs getter for CRM selection (set by WizardStepContacts)
  const [crmContactIdsGetter, setCrmContactIdsGetter] = useState<(() => Promise<string[]>) | null>(null);
  const [crmSelectedCount, setCrmSelectedCount] = useState(0);

  const { data: customFields = [] } = useCustomFields();

  const requiredFields = useMemo(() =>
    customFields.filter(f => f.required),
    [customFields]
  );

  // Navigation
  const goToStep = useCallback((newStep: WizardStep) => {
    setStep(newStep);
  }, []);

  // Source selection
  const handleSourceSelect = useCallback((source: ContactSourceType) => {
    setState(prev => ({ ...prev, sourceType: source }));
    if (source === 'import') {
      setStep('upload');
    } else if (source === 'crm') {
      setStep('contacts');
    }
  }, []);

  // Parse Excel file
  const parseExcelFile = useCallback((file: File): Promise<{ headers: string[]; rows: any[][] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false
          }) as any[][];

          if (jsonData.length === 0) {
            reject(new Error('El archivo Excel esta vacio'));
            return;
          }

          const headers = jsonData[0]
            .map((h: any) => String(h || '').trim())
            .filter((h: string) => h !== '');

          const headerCount = headers.length;
          const rows = jsonData.slice(1)
            .filter(row => row.some(cell => cell !== ''))
            .map(row => {
              return row
                .slice(0, jsonData[0].length)
                .map((cell, idx) => {
                  const originalHeader = String(jsonData[0][idx] || '').trim();
                  return originalHeader !== '' ? String(cell || '').trim() : null;
                })
                .filter((cell): cell is string => cell !== null);
            })
            .filter(row => row.length === headerCount);

          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsBinaryString(file);
    });
  }, []);

  // Process imported data
  const processImportData = useCallback((headers: string[], rows: any[][]) => {
    if (headers.length === 0 || rows.length === 0) {
      toast.error('El archivo no contiene datos validos');
      return;
    }

    setState(prev => ({
      ...prev,
      columns: headers,
      data: rows,
    }));

    const autoMapping: ColumnMapping = {};
    headers.forEach((header) => {
      if (!header || header.trim() === '') return;

      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('numero') || lowerHeader.includes('phone') || lowerHeader.includes('telefono')) {
        autoMapping[header] = 'numero';
      } else if (lowerHeader.includes('nombre') || lowerHeader.includes('name')) {
        autoMapping[header] = 'nombre';
      } else {
        autoMapping[header] = 'custom';
      }
    });

    setState(prev => ({ ...prev, mapping: autoMapping }));
    goToStep('mapping');
    toast.success(`Archivo procesado: ${rows.length} filas encontradas`);
  }, [goToStep]);

  // File selection handler
  const handleFileSelect = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, file, loading: true }));

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        Papa.parse(file, {
          complete: (result) => {
            const data = result.data as any[][];
            if (data.length === 0) {
              toast.error('El archivo CSV esta vacio');
              setState(prev => ({ ...prev, loading: false }));
              return;
            }

            const headers = data[0]
              .map((h: any) => String(h || '').trim())
              .filter((h: string) => h !== '');

            const headerCount = headers.length;
            const rows = data.slice(1)
              .filter(row => row.some(cell => cell !== ''))
              .map(row => {
                return row
                  .slice(0, data[0].length)
                  .map((cell, idx) => {
                    const originalHeader = String(data[0][idx] || '').trim();
                    return originalHeader !== '' ? String(cell || '').trim() : null;
                  })
                  .filter((cell): cell is string => cell !== null);
              })
              .filter(row => row.length === headerCount);

            processImportData(headers, rows);
            setState(prev => ({ ...prev, loading: false }));
          },
          error: (error) => {
            toast.error('Error al leer el CSV: ' + error.message);
            setState(prev => ({ ...prev, loading: false }));
          },
        });
        return;
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const result = await parseExcelFile(file);
        processImportData(result.headers, result.rows);
      } else {
        toast.error('Formato de archivo no soportado');
      }
    } catch (error: any) {
      toast.error('Error al procesar el archivo: ' + error.message);
      onError?.(error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [parseExcelFile, processImportData, onError]);

  // Column mapping change
  const handleMappingChange = useCallback((column: string, value: string) => {
    setState(prev => ({
      ...prev,
      mapping: { ...prev.mapping, [column]: value }
    }));
  }, []);

  const hasNumeroMapping = Object.values(state.mapping).includes('numero');

  // Import contacts from file
  const handleImport = useCallback(async () => {
    if (!hasNumeroMapping) {
      toast.error('Debe mapear al menos una columna a "Numero"');
      return;
    }

    const unmappedRequiredFields = requiredFields.filter(field => {
      const isMapped = Object.values(state.mapping).includes(`custom:${field.field_name}`);
      return !isMapped;
    });

    if (unmappedRequiredFields.length > 0) {
      toast.error(
        `Faltan campos obligatorios: ${unmappedRequiredFields.map(f => f.field_label).join(', ')}`
      );
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      const contacts = state.data.map((row) => {
        const contact: any = { attributes: {} };
        state.columns.forEach((col, idx) => {
          if (!col || col.trim() === '') return;

          const value = row[idx];
          if (!value || value.trim() === '') return;

          if (state.mapping[col] === 'numero') {
            contact.numero = value;
          } else if (state.mapping[col] === 'nombre') {
            contact.nombre = value;
          } else if (state.mapping[col].startsWith('custom:')) {
            const fieldName = state.mapping[col].replace('custom:', '');
            contact.attributes[fieldName] = value;
          } else if (state.mapping[col] === 'custom') {
            contact.attributes[col] = value;
          }
        });
        return contact;
      }).filter(c => c.numero);

      const { data, error } = await supabase.functions.invoke('import-contacts', {
        body: { contacts },
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        stats: data.stats,
        importedContactIds: data.contactIds,
      }));

      toast.success(`Importacion completada: ${data.stats.created} creados, ${data.stats.updated} actualizados`);
      goToStep('launch');
    } catch (error: any) {
      toast.error('Error al importar contactos: ' + error.message);
      onError?.(error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.data, state.columns, state.mapping, hasNumeroMapping, requiredFields, goToStep, onError]);

  // CRM contact selection
  const handleCrmContactsSelect = useCallback((
    getContactIds: () => Promise<string[]>,
    count: number
  ) => {
    setCrmContactIdsGetter(() => getContactIds);
    setCrmSelectedCount(count);
    goToStep('launch');
  }, [goToStep]);

  // Get final contact IDs for campaign
  const getContactIdsForCampaign = useCallback(async (): Promise<string[]> => {
    if (state.sourceType === 'import') {
      return state.importedContactIds;
    } else if (state.sourceType === 'crm' && crmContactIdsGetter) {
      return await crmContactIdsGetter();
    }
    return [];
  }, [state.sourceType, state.importedContactIds, crmContactIdsGetter]);

  // Get contact count for display
  const getContactCount = useCallback((): number => {
    if (state.sourceType === 'import') {
      return state.importedContactIds.length;
    } else if (state.sourceType === 'crm') {
      return crmSelectedCount;
    }
    return 0;
  }, [state.sourceType, state.importedContactIds.length, crmSelectedCount]);

  // Launch campaign
  const handleLaunchCampaign = useCallback(async () => {
    if (!state.selectedChannel) {
      toast.error('Selecciona un canal');
      return;
    }

    if (state.selectedChannel === 'whatsapp' && !state.selectedWhatsAppNumberId) {
      toast.error('Selecciona un numero de WhatsApp');
      return;
    }

    if (state.selectedChannel === 'whatsapp' && !state.selectedTemplate) {
      toast.error('Selecciona una plantilla de WhatsApp');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const contactIds = await getContactIdsForCampaign();

      if (contactIds.length === 0) {
        toast.error('No hay contactos seleccionados');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: {
          contact_ids: contactIds,
          channel: state.selectedChannel,
          phone_number_id: state.selectedWhatsAppNumberId,
          // Include template info for WhatsApp campaigns
          template_id: state.selectedTemplate?.templateId,
          template_name: state.selectedTemplate?.name,
        },
      });

      if (error) throw error;

      const totalBatches = Math.ceil(contactIds.length / 20);
      const estimatedTime = totalBatches > 1 ? `en aproximadamente ${(totalBatches - 1) * 2} minutos` : '';

      toast.success(
        `Campana iniciada! Se enviaran ${totalBatches} ${totalBatches === 1 ? 'batch' : 'batches'} de 20 contactos ${estimatedTime}.`
      );

      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al lanzar campana');
      onError?.(error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.selectedChannel, state.selectedWhatsAppNumberId, state.selectedTemplate, getContactIdsForCampaign, onSuccess, onError]);

  // Channel selection
  const handleChannelSelect = useCallback((channel: 'whatsapp' | 'llamadas') => {
    setState(prev => ({
      ...prev,
      selectedChannel: channel,
      selectedWhatsAppNumberId: channel === 'whatsapp' ? prev.selectedWhatsAppNumberId : null,
      selectedWhatsAppWabaId: channel === 'whatsapp' ? prev.selectedWhatsAppWabaId : null,
      selectedTemplate: channel === 'whatsapp' ? prev.selectedTemplate : null,
    }));
  }, []);

  // WhatsApp number selection (with waba_id)
  const handleWhatsAppNumberSelect = useCallback((phoneNumberId: string, wabaId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedWhatsAppNumberId: phoneNumberId,
      selectedWhatsAppWabaId: wabaId,
      // Reset template when changing number (different WABA = different templates)
      selectedTemplate: prev.selectedWhatsAppNumberId !== phoneNumberId ? null : prev.selectedTemplate,
    }));
  }, []);

  // Template selection
  const handleTemplateSelect = useCallback((template: SelectedTemplate | null) => {
    setState(prev => ({ ...prev, selectedTemplate: template }));
  }, []);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setState(initialState);
    setStep('source');
    setCrmContactIdsGetter(null);
    setCrmSelectedCount(0);
  }, []);

  // Go back to source selection
  const goBackToSource = useCallback(() => {
    setState(prev => ({
      ...prev,
      sourceType: null,
      file: null,
      data: [],
      columns: [],
      mapping: {},
      stats: null,
      importedContactIds: [],
    }));
    setCrmContactIdsGetter(null);
    setCrmSelectedCount(0);
    setStep('source');
  }, []);

  return {
    step,
    state,
    requiredFields,
    hasNumeroMapping,
    crmSelectedCount,
    goToStep,
    goBackToSource,
    handleSourceSelect,
    handleFileSelect,
    handleMappingChange,
    handleImport,
    handleCrmContactsSelect,
    handleLaunchCampaign,
    handleChannelSelect,
    handleWhatsAppNumberSelect,
    handleTemplateSelect,
    resetWizard,
    getContactCount,
  };
}
