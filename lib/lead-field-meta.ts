import { AlignLeft, CheckSquare, List, ListChecks, Mail, Phone, Type } from 'lucide-react';
import type { LeadFieldType } from '@/lib/funnel-types';

export const LEAD_FIELD_META: Record<LeadFieldType, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  text:           { label: 'Text',             icon: Type,        bg: 'bg-blue-50',   color: 'text-blue-500'   },
  email:          { label: 'E-Mail',           icon: Mail,        bg: 'bg-violet-50', color: 'text-violet-500' },
  tel:            { label: 'Telefon',          icon: Phone,       bg: 'bg-green-50',  color: 'text-green-500'  },
  textarea:       { label: 'Mehrzeilig',       icon: AlignLeft,   bg: 'bg-amber-50',  color: 'text-amber-500'  },
  checkbox:       { label: 'Checkbox',         icon: CheckSquare, bg: 'bg-rose-50',   color: 'text-rose-500'   },
  checkbox_group: { label: 'Checkbox-Gruppe',  icon: ListChecks,  bg: 'bg-rose-50',   color: 'text-rose-500'   },
  select:         { label: 'Dropdown',         icon: List,        bg: 'bg-slate-100', color: 'text-slate-500'  },
};

export const LEAD_FIELD_TYPES = Object.keys(LEAD_FIELD_META) as LeadFieldType[];
