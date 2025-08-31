'use client';

import { useEffect } from 'react';
import { useTheme } from '@/store/theme';
import type { SelectedTheme, ThemeVariant } from '@/store/theme';

interface ThemeInitializerProps {
  selectedTheme: SelectedTheme;
  variant: ThemeVariant;
  image?: string | null;
  opacity?: number | null;
}

export const ThemeInitializer = ({ selectedTheme, variant, image, opacity }: ThemeInitializerProps) => {
  const { setTheme, setVariant, setInitialized, setAcrylicOpacity } = useTheme();

  useEffect(() => {
    setTheme(selectedTheme);
    setVariant(variant);
    setInitialized(true);
    if (opacity && variant === 'acrylic') {
      setAcrylicOpacity(opacity);
    }
  }, [selectedTheme, variant, setTheme, setVariant, setInitialized, image, opacity, setAcrylicOpacity]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (image) {
        document.documentElement.style.setProperty('--background-image', `url(${image})`);
      } else {
        document.documentElement.style.removeProperty('--background-image');
      }
    }
  }, [image]);

  return null;
};
