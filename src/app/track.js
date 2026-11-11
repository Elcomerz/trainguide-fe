import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";

import { getJson } from "../api";
import { NetworkMap } from "../components/Maps";
import { colors } from "../theme";
import { trackingWarning } from "../trains";

function bboxOf(path) {
  const lats = path.map((stop) => stop.lat);
  const lons = path.map((stop) => stop.lon);
  const latPad = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 0.25);
  const lonPad = Math.max(0.02, (Math.max(...lons) - Math.min(...lons)) * 0.25);
  return {
    south: Math.min(...lats) - latPad,
    north: Math.max(...lats) + latPad,
    west: Math.min(...lons) - lonPad,
    east: Math.max(...lons) + lonPad,
  };
}

export default function TrackScreen() {
  const params = useLocalSearchParams();
  const from = String(params.from || "");
  const to = String(params.to || "");
  const scoped = from.length >= 2 && to.length >= 2;
  const [route, setRoute] = useState(null);
  const [network, setNetwork] = useState(null);
  const [trains, setTrains] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = scoped
      ? getJson(`/api/journeys?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&hours=2`).then((body) => {
          if (alive) setRoute(body);
        })
      : getJson("/api/network").then((body) => {
          if (alive) setNetwork(body);
        });
    load.catch(() => {
      if (alive) setError("Could not load the map. Restart the API, then open it again.");
    });
    return () => {
      alive = false;
    };
  }, [scoped, from, to]);

  useEffect(() => {
    let alive = true;
    const path = scoped ? `/api/positions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "/api/positions";
    const tick = () => {
      getJson(path)
        .then((body) => {
          if (alive) setTrains(body.trains);
        })
        .catch(() => {});
    };
    tick();
    const handle = setInterval(tick, 20000);
    return () => {
      alive = false;
      clearInterval(handle);
    };
  }, [scoped, from, to]);

  const path = route?.path || [];
  const stations = scoped ? path : network?.stations || [];
  const segments = scoped
    ? path.slice(0, -1).map((stop, index) => ({
        from: stop.code,
        to: path[index + 1].code,
        corridors: [stop.corridor || "cross"],
      }))
    : network?.segments || [];
  const bbox = scoped ? (path.length ? bboxOf(path) : null) : network?.bbox;
  const title = scoped ? (route ? `${route.from.name} → ${route.to.name}` : "Live train tracking") : "Live train tracking";

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {!error && scoped && route && path.length === 0 ? (
        <Text style={styles.empty}>No trains stop at both stations in that direction.</Text>
      ) : null}
      {!error && bbox && stations.length > 0 ? (
        <View style={styles.mapWrap}>
          <NetworkMap
            bbox={bbox}
            stations={stations}
            segments={segments}
            trains={trains || []}
            filter="all"
            onStation={(code) => router.push(`/station/${code}`)}
            onTrain={(tripId) => router.push(`/trip/${tripId}`)}
          />
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>
              {trains
                ? `${trains.length} trains ${scoped ? "between these stations" : "running now"}`
                : "Placing trains from the timetable…"}
            </Text>
            <Text style={styles.warn}>{trackingWarning}</Text>
          </View>
        </View>
      ) : !error && !route && !network ? (
        <Text style={styles.empty}>Loading the map…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  mapWrap: { flex: 1, minHeight: 420 },
  empty: { padding: 20, color: colors.muted, fontSize: 16 },
  badge: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badgeText: { textAlign: "center", color: colors.ink, fontWeight: "700" },
  warn: { marginTop: 4, textAlign: "center", color: colors.muted, fontSize: 13 },
});
