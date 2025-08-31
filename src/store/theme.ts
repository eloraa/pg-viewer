import { create } from 'zustand';
import { themeColor } from '@/constants';
import { generateUUID } from '@/lib/utils';

export type SelectedTheme = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';
export type ThemeVariant = 'default' | 'default-amoled' | 'claude' | 'vitesse' | 'solarized' | 'mono' | 'acrylic';
interface ThemeState {
  selectedTheme: SelectedTheme;
  theme: Theme;
  variant: ThemeVariant;
  initialized: boolean;
  image: string | null;
  acrylicOpacity: number;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setVariant: (variant: ThemeVariant) => void;
  setInitialized: (initialized: boolean) => void;
  setImage: (file: File) => Promise<void>;
  clearImage: () => void;
  setAcrylicOpacity: (opacity: number) => void;
}

const applyTheme = (theme: 'light' | 'dark', variant: string) => {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;

  Object.keys(themeColor).forEach(v => document.documentElement.classList.remove(v));
  document.documentElement.classList.add(variant);

  const color = themeColor[variant]?.[theme] || (theme === 'dark' ? '#1c1c1c' : '#fefafb');
  const colorScheme = theme;

  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute('content', color);

  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta');
    colorSchemeMeta.setAttribute('name', 'color-scheme');
    document.head.appendChild(colorSchemeMeta);
  }
  colorSchemeMeta.setAttribute('content', colorScheme);
};

const IMAGE_COOKIE = 'themeImageUrl';
const ACRYLIC_OPACITY_COOKIE = 'acrylicOpacity';

const setCookie = (name: string, value: string) => {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=${value};path=/;max-age=31536000`;
};

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useTheme = create<ThemeState>(set => {
  let initialImage: string | null = null;
  let initialAcrylicOpacity: number = 1;
  if (typeof window !== 'undefined') {
    initialImage = getCookie(IMAGE_COOKIE);
    const opacityStr = getCookie(ACRYLIC_OPACITY_COOKIE);
    if (opacityStr && !isNaN(Number(opacityStr))) {
      initialAcrylicOpacity = Math.max(0, Math.min(1, Number(opacityStr)));
    }
  }
  return {
    selectedTheme: 'light',
    theme: 'light',
    variant: 'default',
    initialized: false,
    image: initialImage,
    acrylicOpacity: initialAcrylicOpacity,
    setTheme: theme => {
      const newSelectedTheme = theme;
      const newTheme = theme === 'system' ? getSystemTheme() : theme;
      set(() => ({
        selectedTheme: newSelectedTheme,
        theme: newTheme,
      }));
      set(state => {
        applyTheme(newTheme, state.variant);
        return {};
      });
      setCookie('selectedTheme', newSelectedTheme);
      setCookie('theme', newTheme);
    },
    setVariant: (variant: ThemeVariant) => {
      set(state => {
        applyTheme(state.theme, variant);
        return { variant };
      });
      setCookie('themeVariant', variant);
    },
    setInitialized: (initialized: boolean) => {
      set({ initialized });
    },
    setImage: async (file: File) => {
      if (typeof window === 'undefined') return;
      set(state => {
        if (state.variant !== 'acrylic') throw new Error('Image can only be set for acrylic variant');
        return {};
      });
      if (!file.type.startsWith('image/')) throw new Error('File must be an image');
      const uuid = generateUUID();
      const cacheUrl = `/cache/v1/${uuid}`;
      const cache = await window.caches.open('cache/v1');
      const response = new Response(file, { headers: { 'Content-Type': file.type } });
      await cache.put(cacheUrl, response);
      set(state => {
        setCookie(IMAGE_COOKIE, cacheUrl);
        document.documentElement.style.setProperty('--background-image', `url('${cacheUrl}')`);
        const updates: { image: string; acrylicOpacity?: number } = { image: cacheUrl };
        if (!state.image) {
          setCookie(ACRYLIC_OPACITY_COOKIE, '0.8');
          document.documentElement.style.setProperty('--acrylic-opacity', '0.8');
          updates.acrylicOpacity = 0.8;
        }
        return updates;
      });
    },
    clearImage: () => {
      if (typeof window === 'undefined') return;
      set(() => {
        setCookie(IMAGE_COOKIE, '');
        document.documentElement.style.removeProperty('--background-image');
        return { image: null };
      });
    },
    setAcrylicOpacity: (opacity: number) => {
      if (typeof window === 'undefined') return;
      set(state => {
        if (state.variant !== 'acrylic') throw new Error('Opacity can only be set for acrylic variant');
        const clamped = Math.max(0, Math.min(1, opacity));
        setCookie(ACRYLIC_OPACITY_COOKIE, String(clamped));
        document.documentElement.style.setProperty('--acrylic-opacity', String(clamped));
        return { acrylicOpacity: clamped };
      });
    },
  };
});

export const getTheme = useTheme;
