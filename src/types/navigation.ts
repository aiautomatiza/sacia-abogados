import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  group: string;
  badge?: string | number;
  disabled?: boolean;
  roles?: string[];
}
