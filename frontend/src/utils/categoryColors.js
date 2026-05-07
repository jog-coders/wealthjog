const PALETTE = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
];

const simpleHash = (str) => {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash);
};

export const getCategoryColor = (categoryName) => {
  const index = simpleHash(categoryName) % PALETTE.length;
  return PALETTE[index];
};

export const getCategoryColorMap = (categories) => {
  const colorMap = {};
  categories.forEach(cat => {
    if (cat) {
      colorMap[cat] = getCategoryColor(cat);
    }
  });
  return colorMap;
};
