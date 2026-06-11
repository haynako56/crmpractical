export const USER_COLORS = [
    { bg: '#e8f0f8', text: '#1a3a5c', accent: '#1a3a5c' }, // 0 navy
    { bg: '#d1fae5', text: '#065f46', accent: '#059669' }, // 1 green
    { bg: '#ede9fe', text: '#6d28d9', accent: '#7c3aed' }, // 2 purple
    { bg: '#fef3c7', text: '#b45309', accent: '#d97706' }, // 3 gold
    { bg: '#fee2e2', text: '#b91c1c', accent: '#dc2626' }, // 4 red
    { bg: '#ccfbf1', text: '#0f766e', accent: '#0d9488' }, // 5 teal
    { bg: '#ffedd5', text: '#c2410c', accent: '#ea580c' }, // 6 orange
    { bg: '#fce7f3', text: '#be185d', accent: '#db2777' }, // 7 pink
] as const;

export function getUserColor(colorIndex: number | null | undefined) {
    const idx = typeof colorIndex === 'number' ? Math.abs(colorIndex) % USER_COLORS.length : 0;
    return USER_COLORS[idx];
}
