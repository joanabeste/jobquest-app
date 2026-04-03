'use client';

import { createContext, useContext } from 'react';

export interface CI {
  primary: string;
  accent: string;
  headingColor: string;
  textColor: string;
  br: string;
}

const defaults: CI = {
  primary:      '#7c3aed',
  accent:       '#f59e0b',
  headingColor: '#0f172a',
  textColor:    '#1e293b',
  br:           '12px',
};

export const CIContext = createContext<CI>(defaults);
export function useCi(): CI { return useContext(CIContext); }
