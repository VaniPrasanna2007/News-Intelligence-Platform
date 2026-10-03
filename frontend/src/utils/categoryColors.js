/**
 * Centralized Category Color Configuration
 * 
 * STRICT PALETTE (Decoupled from application Emerald/Graphite theme):
 * - Business: AMBER / GOLD (#F59E0B)
 * - Education: VIOLET / PURPLE (#8B5CF6)
 * - Entertainment: PINK / MAGENTA (#EC4899)
 * - Sports: ORANGE / RED-ORANGE (#F97316)
 * - Technology: CYAN / TEAL-BLUE (#06B6D4)
 * 
 * Emerald/Green (#10B981) is STRICTLY reserved for UI chrome, buttons,
 * active nav, match verified states, and system health status.
 */

export const CANONICAL_DOMAINS = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

export const CATEGORY_COLORS = {
  Business: {
    name: 'Business',
    colorName: 'Amber / Gold',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    hex: '#F59E0B',
    fill: '#F59E0B',
    primary: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706'
  },
  Education: {
    name: 'Education',
    colorName: 'Violet / Purple',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    dot: 'bg-violet-400',
    bar: 'bg-violet-500',
    badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
    hex: '#8B5CF6',
    fill: '#8B5CF6',
    primary: '#8B5CF6',
    light: '#A78BFA',
    dark: '#7C3AED'
  },
  Entertainment: {
    name: 'Entertainment',
    colorName: 'Pink / Magenta',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    dot: 'bg-pink-400',
    bar: 'bg-pink-500',
    badge: 'bg-pink-500/10 text-pink-400 border border-pink-500/30',
    hex: '#EC4899',
    fill: '#EC4899',
    primary: '#EC4899',
    light: '#F472B6',
    dark: '#DB2777'
  },
  Sports: {
    name: 'Sports',
    colorName: 'Orange / Red-Orange',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    bar: 'bg-orange-500',
    badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    hex: '#F97316',
    fill: '#F97316',
    primary: '#F97316',
    light: '#FB923C',
    dark: '#EA580C'
  },
  Technology: {
    name: 'Technology',
    colorName: 'Cyan / Teal-Blue',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
    bar: 'bg-cyan-500',
    badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    hex: '#06B6D4',
    fill: '#06B6D4',
    primary: '#06B6D4',
    light: '#22D3EE',
    dark: '#0891B2'
  }
};

// Non-enumerable lowercase properties for case-insensitive lookup without polluting Object.entries
Object.defineProperty(CATEGORY_COLORS, 'business', { get() { return CATEGORY_COLORS.Business; }, enumerable: false });
Object.defineProperty(CATEGORY_COLORS, 'education', { get() { return CATEGORY_COLORS.Education; }, enumerable: false });
Object.defineProperty(CATEGORY_COLORS, 'entertainment', { get() { return CATEGORY_COLORS.Entertainment; }, enumerable: false });
Object.defineProperty(CATEGORY_COLORS, 'sports', { get() { return CATEGORY_COLORS.Sports; }, enumerable: false });
Object.defineProperty(CATEGORY_COLORS, 'technology', { get() { return CATEGORY_COLORS.Technology; }, enumerable: false });

/**
 * Returns complete styling bundle for any category name (handles undefined/case variation)
 */
export function getCategoryStyle(category) {
  if (!category) return CATEGORY_COLORS.Technology;
  const capitalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  return CATEGORY_COLORS[capitalized] || {
    name: category,
    colorName: 'Muted Slate',
    bg: 'bg-slate-800/40',
    border: 'border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
    bar: 'bg-slate-500',
    badge: 'bg-slate-800/40 text-slate-300 border border-slate-700',
    hex: '#718079',
    fill: '#718079',
    primary: '#718079',
    light: '#A7B5AE',
    dark: '#4E6157'
  };
}

/**
 * Convenience helper returning hex code for SVG/canvas/charts
 */
export function getCategoryHex(category) {
  return getCategoryStyle(category).hex;
}
