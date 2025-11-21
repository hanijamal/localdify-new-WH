

import { useContext } from 'react';
// FIX: Corrected import path for LanguageContext to resolve module export error.
import { LanguageContext } from '../contexts/LanguageContext';

export const useLanguage = () => {
  return useContext(LanguageContext);
};