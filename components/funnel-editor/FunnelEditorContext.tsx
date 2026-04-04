'use client';

import { createContext, useContext } from 'react';

interface FunnelEditorContextType {
  /** ID of the currently selected field within a lead/form block */
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
}

const FunnelEditorContext = createContext<FunnelEditorContextType>({
  selectedFieldId: null,
  setSelectedFieldId: () => {},
});

export function useFunnelEditorCtx() {
  return useContext(FunnelEditorContext);
}

export { FunnelEditorContext };
