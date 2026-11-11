import { StyleSheet, View } from "react-native";

export function CloseCircle({ color = "#5C6B80", size = 22 }) {
  const arm = Math.round(size * 0.42);
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <View style={[styles.arm, { width: arm, backgroundColor: color, transform: [{ rotate: "45deg" }] }]} />
      <View style={[styles.arm, { width: arm, backgroundColor: color, transform: [{ rotate: "-45deg" }] }]} />
    </View>
  );
}

function Arrow({ color }) {
  return (
    <View style={styles.arrowRow}>
      <View style={[styles.shaft, { backgroundColor: color }]} />
      <View style={[styles.head, { borderLeftColor: color }]} />
    </View>
  );
}

export function SwapIcon({ color = "#E36414", size = 22 }) {
  return (
    <View style={{ width: size, height: size, justifyContent: "center", gap: 4 }}>
      <Arrow color={color} />
      <View style={{ transform: [{ rotate: "180deg" }] }}>
        <Arrow color={color} />
      </View>
    </View>
  );
}

export function NavIcon({ color = "#FFFFFF", size = 18 }) {
  const wing = Math.round(size * 0.42);
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: wing,
        borderRightWidth: wing,
        borderBottomWidth: size,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: color,
      }}
    />
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 1.6, alignItems: "center", justifyContent: "center" },
  arm: { position: "absolute", height: 1.6, borderRadius: 1 },
  arrowRow: { flexDirection: "row", alignItems: "center" },
  shaft: { width: 12, height: 2, borderRadius: 1 },
  head: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
});
