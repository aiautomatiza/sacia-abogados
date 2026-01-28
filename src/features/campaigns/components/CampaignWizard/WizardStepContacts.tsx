/**
 * @fileoverview Wizard Step for CRM Contact Selection
 */

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ContactSelector } from '../ContactSelector';
import { useContactSelection } from '../../hooks/useContactSelection';

interface WizardStepContactsProps {
  onBack: () => void;
  onNext: (getContactIds: () => Promise<string[]>, count: number) => void;
}

export function WizardStepContacts({ onBack, onNext }: WizardStepContactsProps) {
  const selectionRef = useRef<ReturnType<typeof useContactSelection> | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  // Update selected count when selection changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectionRef.current) {
        setSelectedCount(selectionRef.current.selectedCount);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    if (selectionRef.current && selectionRef.current.selectedCount > 0) {
      onNext(
        selectionRef.current.getSelectedContactIds,
        selectionRef.current.selectedCount
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Seleccionar contactos</CardTitle>
        <CardDescription>
          Filtra y selecciona los contactos que recibiran la campana
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto min-h-0">
        <ContactSelector selectionRef={selectionRef} />
      </CardContent>

      <CardFooter className="flex-shrink-0 border-t bg-background pt-4">
        <div className="flex justify-between w-full">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atras
          </Button>
          <Button onClick={handleNext} disabled={selectedCount === 0}>
            Continuar con {selectedCount > 0 ? selectedCount.toLocaleString() : '0'} contactos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
