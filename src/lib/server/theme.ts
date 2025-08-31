import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import type { SelectedTheme, Theme, ThemeVariant } from '@/store/theme';

export function getTheme({ cookies }: { cookies: ReadonlyRequestCookies }): {
  selectedTheme: SelectedTheme;
  theme: Theme;
  variant: ThemeVariant;
  image: string | null;
  acrylicOpacity: number;
} {
  const themeCookie = cookies.get('theme');
  const selectedThemeCookie = cookies.get('selectedTheme');
  const themeVariantCookie = cookies.get('themeVariant');
  const imageCookie = cookies.get('themeImageUrl');
  const acrylicOpacityCookie = cookies.get('acrylicOpacity');

  const selectedTheme = (selectedThemeCookie?.value as SelectedTheme) || 'dark';
  const theme = (themeCookie?.value as Theme) || 'dark';
  const variant = (themeVariantCookie?.value as ThemeVariant) || 'default';
  const image = imageCookie?.value || null;
  let acrylicOpacity = 1;
  if (acrylicOpacityCookie && !isNaN(Number(acrylicOpacityCookie.value))) {
    const val = Number(acrylicOpacityCookie.value);
    if (val >= 0 && val <= 1) acrylicOpacity = val;
  }

  return {
    selectedTheme,
    theme,
    variant,
    image,
    acrylicOpacity,
  };
}
