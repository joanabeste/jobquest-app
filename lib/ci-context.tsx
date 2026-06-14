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
  primary:      '#3A22E0',
  accent:       '#FF6B4A',
  headingColor: '#15123A',
  textColor:    '#1e293b',
  br:           '12px',
};

export const CIContext = createContext<CI>(defaults);
export function useCi(): CI { return useContext(CIContext); }
