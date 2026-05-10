// Radiant dark-mode color palette — vivid, high-contrast
export const PALETTE = [
  '#00D28E', // vibrant green  (primary brand)
  '#38BDF8', // sky blue
  '#818CF8', // indigo
  '#FB923C', // vivid orange
  '#F472B6', // hot pink
  '#A3E635', // electric lime
  '#E879F9', // fuchsia
  '#FBBF24', // amber gold
  '#34D399', // emerald
  '#60A5FA', // bright blue
  '#F87171', // coral red
  '#2DD4BF', // teal
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
  categories.forEach((cat, i) => {
    if (cat) colorMap[cat] = PALETTE[i % PALETTE.length];
  });
  return colorMap;
};
