import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import { getJson } from "../../api";
import { TripMap } from "../../components/Maps";
import { colors, corridorColor } from "../../theme";
import { bearingDegrees, serviceColor, serviceLabel, trackingWarning } from "../../trains";

function stopState(index, estimate) {
  if (!estimate || !Number.isInteger(estimate.legIndex)) return "ahead";
  if (estimate.status === "at-station") {
    if (index < estimate.legIndex) return "passed";
    if (index === estimate.legIndex) return "here";
    return "ahead";
  }
  if (index < estimate.legIndex) return "passed";
  if (index === estimate.legIndex) return "left";
  if (index === estimate.legIndex + 1) return "next";
  return "ahead";
}

function completeEstimate(stops, estimate) {
  if (!estimate) return null;
  const index = Number.isInteger(estimate.legIndex)
    ? estimate.legIndex
    : stops.findIndex((stop) => stop.code === estimate.legFrom);
  const here = index >= 0 ? stops[index] : null;
  const next = index >= 0 ? stops[index + 1] : null;
  const bearing = Number.isFinite(estimate.bearing)
    ? estimate.bearing
    : here && next
      ? bearingDegrees(here.lat, here.lon, next.lat, next.lon)
      : estimate.bearing;
  const direction = estimate.direction || (next ? `Towards ${next.name}` : here ? `Arrived at ${here.name}` : "");
  return { ...estimate, legIndex: index >= 0 ? index : estimate.legIndex, bearing, direction };
}

function placeLine(estimate) {
  if (!estimate) return "Not running at this time.";
  if (estimate.status === "at-station") {
    return `${estimate.label}. ${estimate.detail}. ${estimate.direction}.`;
  }
  const percent = Math.round((estimate.progress || 0) * 100);
  const speed = estimate.speedKmh ? ` About ${estimate.speedKmh} km/h.` : "";
  return `${percent}% of the way from ${estimate.legFromName} to ${estimate.legToName}.${speed} ${estimate.detail}.`;
}

export default function TripScreen() {
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      getJson(`/api/trips/${id}`)
        .then((body) => {
          if (!active) return;
          setTrip(body);
          setError("");
        })
        .catch(() => {
          if (active) setError("Could not load this train.");
        });
    };
    load();
    const timer = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  const kind = trip?.kind === "fast" ? "fast" : "local";
  const estimate = trip ? completeEstimate(trip.stops, trip.estimate) : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: trip ? `${serviceLabel(kind)} ${trip.from}–${trip.to}` : "Train" }} />
      {error ? <Text style={styles.note}>{error}</Text> : null}
      <FlatList
        data={trip?.stops || []}
        keyExtractor={(item, index) => `${item.code}-${index}`}
        ListHeaderComponent={
          trip ? (
            <View>
              <TripMap stops={trip.stops} train={estimate} />
              <View style={styles.header}>
                <Text style={[styles.kicker, { color: serviceColor(kind) }]}>
                  {serviceLabel(kind)}
                  {kind === "fast" ? ` · skips ${trip.skips} stations` : " · stops along the way"}
                  {" · "}
                  <Text style={{ color: corridorColor(trip.corridor) }}>{trip.corridor}</Text>
                </Text>
                <Text style={styles.title}>{trip.fromName} → {trip.toName}</Text>
                <Text style={styles.place}>{placeLine(estimate)}</Text>
                {estimate?.direction ? <Text style={styles.meta}>{estimate.direction}</Text> : null}
                <Text style={styles.warn}>{trackingWarning}</Text>
                <Text style={styles.meta}>
                  {trip.departure}–{trip.arrival} · {trip.service} · {trip.stopCount} stops
                </Text>
                <Text style={styles.meta}>Feed id {trip.id}. This is not a confirmed public train number.</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.note}>Loading the timetable…</Text>
          )
        }
        renderItem={({ item, index }) => {
          const state = stopState(index, estimate);
          const note =
            state === "here" ? "Train is at this station" : state === "next" ? "Next station" : state === "left" ? "Left this station" : "";
          return (
            <View
              style={[
                styles.row,
                (state === "here" || state === "next") && { backgroundColor: kind === "fast" ? "#FEF2F2" : "#F0FDF4" },
                state === "passed" && styles.rowPassed,
              ]}
            >
              <View style={styles.rail}>
                <View style={[styles.dot, (state === "here" || state === "next") && { backgroundColor: serviceColor(kind) }]} />
                {trip && index < trip.stops.length - 1 ? <View style={styles.stem} /> : null}
              </View>
              <View style={styles.body}>
                <Text style={styles.stopName}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.arrival === item.departure ? item.departure : `${item.arrival}–${item.departure}`}
                  {item.platform ? ` · pf ${item.platform}` : ""}
                  {note ? ` · ${note}` : ""}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  kicker: { fontWeight: "700", textTransform: "uppercase" },
  title: { marginTop: 4, fontSize: 20, fontWeight: "700", color: colors.ink },
  place: { marginTop: 8, fontSize: 16, fontWeight: "600", color: colors.ink },
  warn: { marginTop: 8, color: colors.warn, fontWeight: "600" },
  meta: { marginTop: 4, color: colors.muted },
  row: { flexDirection: "row", paddingHorizontal: 16, backgroundColor: colors.card },
  rowPassed: { opacity: 0.55 },
  rail: { width: 24, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink, marginTop: 16 },
  stem: { width: 2, flex: 1, backgroundColor: colors.line },
  body: { flex: 1, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  stopName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  note: { padding: 16, color: colors.muted, fontSize: 16 },
});
