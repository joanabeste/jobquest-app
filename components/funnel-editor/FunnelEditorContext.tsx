'use client';

import { createContext, useContext } from 'react';
import type { VariableDef } from '@/lib/funnel-variables';
import type { Dimension } from '@/lib/types';

interface FunnelEditorContextType {
  /** ID of the currently selected field within a lead/form block */
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  /** Variables available in the current funnel (for @ mention dropdown) */
  availableVars: VariableDef[];
  /** Dimensions defined on the parent CareerCheck (empty for quests/forms) */
  dimensions: Dimension[];
}

const FunnelEditorContext = createContext<FunnelEditorContextType>({
  selectedFieldId: null,
  setSelectedFieldId: () => {},
  availableVars: [],
  dimensions: [],
});

export function useFunnelEditorCtx() {
  return useContext(FunnelEditorContext);
}

export { FunnelEditorContext };
