export const colors = {
  ink: "#14233A",
  muted: "#5C6B80",
  line: "#D9E2EF",
  paper: "#E7EEF7",
  card: "#FFFFFF",
  field: "#F3F7FC",
  header: "#0E3A56",
  accent: "#E36414",
  warn: "#9A3412",
  warnBg: "#FFF6ED",
  south: "#0F766E",
  west: "#C2410C",
  north: "#1D4ED8",
  mrts: "#6D28D9",
  cross: "#475569",
};

export function corridorColor(name) {
  return colors[name] || colors.cross;
}
