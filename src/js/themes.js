/**
 * ChitraVithika — Dynamic Category Themes
 * Shared across Gallery, Home, Upload, and 404 pages.
 *
 * Each category maps to an accent color and ambient tones
 * that shift the UI feel to match the content.
 */

export const CATEGORY_THEMES = {
  all:         { accent: '#c8a96e', ambient1: 'rgba(200,169,110,0.06)', ambient2: 'rgba(100,80,50,0.04)', label: 'All' },
  landscape:   { accent: '#2e7d32', ambient1: 'rgba(46,125,50,0.08)',   ambient2: 'rgba(30,80,30,0.05)',  label: 'Landscape' },
  street:      { accent: '#e040fb', ambient1: 'rgba(224,64,251,0.07)',  ambient2: 'rgba(120,30,140,0.04)', label: 'Street' },
  abstract:    { accent: '#1565c0', ambient1: 'rgba(21,101,192,0.08)',  ambient2: 'rgba(15,60,120,0.05)',  label: 'Abstract' },
  macro:       { accent: '#00bcd4', ambient1: 'rgba(0,188,212,0.07)',   ambient2: 'rgba(0,100,120,0.04)', label: 'Macro' },
  documentary: { accent: '#f9a825', ambient1: 'rgba(249,168,37,0.07)', ambient2: 'rgba(140,100,20,0.04)', label: 'Documentary' },
  portrait:    { accent: '#ef5350', ambient1: 'rgba(239,83,80,0.07)',  ambient2: 'rgba(140,40,40,0.04)', label: 'Portrait' },
  wildlife:    { accent: '#66bb6a', ambient1: 'rgba(102,187,106,0.07)', ambient2: 'rgba(50,100,50,0.04)', label: 'Wildlife' },
  aquatic:     { accent: '#0097a7', ambient1: 'rgba(0,151,167,0.08)',   ambient2: 'rgba(0,80,90,0.05)',   label: 'Aquatic' },
  birds:       { accent: '#8bc34a', ambient1: 'rgba(139,195,74,0.07)', ambient2: 'rgba(70,100,35,0.04)', label: 'Birds' },
};

export function applyTheme(category) {
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.all;
  const root = document.documentElement;
  const isLight = root.getAttribute('data-theme') === 'light';
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-accent-bright', theme.accent);
  /* In light mode the page mesh is off; skip ambient overrides so CSS tokens stay cool/neutral */
  if (isLight) {
    root.style.removeProperty('--color-ambient-1');
    root.style.removeProperty('--color-ambient-2');
  } else {
    root.style.setProperty('--color-ambient-1', theme.ambient1);
    root.style.setProperty('--color-ambient-2', theme.ambient2);
  }
}

export function resetTheme() {
  const root = document.documentElement;
  root.style.removeProperty('--color-accent');
  root.style.removeProperty('--color-accent-bright');
  root.style.removeProperty('--color-ambient-1');
  root.style.removeProperty('--color-ambient-2');
}
