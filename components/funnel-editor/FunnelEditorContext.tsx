'use client';

import { createContext, useContext } from 'react';
import type { VariableDef } from '@/lib/funnel-variables';

interface FunnelEditorContextType {
  /** ID of the currently selected field within a lead/form block */
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  /** Variables available in the current funnel (for @ mention dropdown) */
  availableVars: VariableDef[];
}

const FunnelEditorContext = createContext<FunnelEditorContextType>({
  selectedFieldId: null,
  setSelectedFieldId: () => {},
  availableVars: [],
});

export function useFunnelEditorCtx() {
  return useContext(FunnelEditorContext);
}

export { FunnelEditorContext };
