'use client';

import { createContext, useContext } from 'react';

export interface CI {
  primary: string;
  accent: string;
  br: string;
}

const defaults: CI = {
  primary: '#7c3aed', // violet-600
  accent:  '#06b6d4',
  br:      '12px',
};

export const CIContext = createContext<CI>(defaults);
export function useCi(): CI { return useContext(CIContext); }
