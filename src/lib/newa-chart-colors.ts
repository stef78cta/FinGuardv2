/**
 * NEWA Design System - Chart Color Helper
 * 
 * Provides chart color palettes from newa_design-tokens.jsonc
 * for use with any charting library (Recharts, Chart.js, etc.)
 * 
 * Colors are defined as CSS variables in index.css and this helper
 * provides easy access to use them in JavaScript/TypeScript.
 */

/**
 * Sequential indigo palette (5 steps)
 * Use for: heatmaps, gradient visualizations, single-series depth
 */
export const chartPalette = {
  "1": "var(--newa-chart-1)", // #6366F1 - Indigo-500 (darkest)
  "2": "var(--newa-chart-2)", // #818CF8 - Indigo-400
  "3": "var(--newa-chart-3)", // #A5B4FC - Indigo-300
  "4": "var(--newa-chart-4)", // #C7D2FE - Indigo-200
  "5": "var(--newa-chart-5)", // #E0E7FF - Indigo-100 (lightest)
} as const;

/**
 * Semantic chart colors
 * Use for: profit/loss indicators, positive/negative trends, benchmark comparisons
 */
export const chartSemantic = {
  positive: "var(--newa-chart-positive)", // #34D399 - Emerald
  negative: "var(--newa-chart-negative)", // #F43F5E - Rose
  neutral: "var(--newa-chart-neutral)", // #94A3B8 - Slate
} as const;

/**
 * Categorical palette (8 distinct colors)
 * Use for: multi-series charts, pie charts, categorical comparisons
 */
export const chartCategorical = [
  "var(--newa-chart-cat-1)", // #6366F1 - Indigo
  "var(--newa-chart-cat-2)", // #34D399 - Emerald
  "var(--newa-chart-cat-3)", // #F59E0B - Amber
  "var(--newa-chart-cat-4)", // #3B82F6 - Blue
  "var(--newa-chart-cat-5)", // #F43F5E - Rose
  "var(--newa-chart-cat-6)", // #14B8A6 - Teal
  "var(--newa-chart-cat-7)", // #A855F7 - Purple
  "var(--newa-chart-cat-8)", // #64748B - Slate
] as const;

/**
 * Raw hex values for libraries that don't support CSS variables
 * These should match the values in index.css
 */
export const chartColorsHex = {
  palette: {
    "1": "#6366F1",
    "2": "#818CF8",
    "3": "#A5B4FC",
    "4": "#C7D2FE",
    "5": "#E0E7FF",
  },
  semantic: {
    positive: "#34D399",
    negative: "#F43F5E",
    neutral: "#94A3B8",
  },
  categorical: [
    "#6366F1", // Indigo
    "#34D399", // Emerald
    "#F59E0B", // Amber
    "#3B82F6", // Blue
    "#F43F5E", // Rose
    "#14B8A6", // Teal
    "#A855F7", // Purple
    "#64748B", // Slate
  ],
} as const;

/**
 * Helper to get a categorical color by index (cycles if index > 7)
 */
export function getCategoricalColor(index: number): string {
  return chartCategorical[index % chartCategorical.length];
}

/**
 * Helper to get a categorical hex color by index (cycles if index > 7)
 */
export function getCategoricalColorHex(index: number): string {
  return chartColorsHex.categorical[index % chartColorsHex.categorical.length];
}

/**
 * Returns the semantic color based on value comparison
 * @param value - The value to evaluate
 * @param threshold - The threshold for comparison (default: 0)
 * @returns CSS variable for positive, negative, or neutral color
 */
export function getSemanticColor(
  value: number,
  threshold: number = 0
): string {
  if (value > threshold) return chartSemantic.positive;
  if (value < threshold) return chartSemantic.negative;
  return chartSemantic.neutral;
}

/**
 * Returns the semantic hex color based on value comparison
 * @param value - The value to evaluate
 * @param threshold - The threshold for comparison (default: 0)
 * @returns Hex color for positive, negative, or neutral
 */
export function getSemanticColorHex(
  value: number,
  threshold: number = 0
): string {
  if (value > threshold) return chartColorsHex.semantic.positive;
  if (value < threshold) return chartColorsHex.semantic.negative;
  return chartColorsHex.semantic.neutral;
}
