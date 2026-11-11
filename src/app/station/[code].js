import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";

import { delayLabel, getJson, untilLabel } from "../../api";
import { colors, corridorColor } from "../../theme";

export default function StationScreen() {
  const { code } = useLocalSearchParams();
  const [body, setBody] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await getJson(`/api/stations/${code}/departures?limit=30&hours=4`);
      setBody(next);
      setError("");
    } catch {
      setError("Could not load this station.");
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const station = body?.station;
  const live = body?.live;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: station?.name || "Station" }} />
      {error ? <Text style={styles.note}>{error}</Text> : null}
      <FlatList
        data={body?.departures || []}
        keyExtractor={(item) => item.tripId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          station ? (
            <View style={styles.header}>
              <Text style={[styles.kicker, { color: corridorColor(station.corridor) }]}>
                {station.code} · {station.corridor}
              </Text>
              <Text style={styles.section}>Next suburban departures</Text>
              {live ? (
                <View style={styles.liveBox}>
                  <Text style={styles.section}>Live board</Text>
                  {live.available ? (
                    live.trains.map((train) => (
                      <View key={`${train.number}-${train.scheduledDeparture}`} style={styles.liveRow}>
                        <Text style={styles.title}>
                          {train.scheduledDeparture}  {train.number} {train.name}
                        </Text>
                        <Text style={styles.meta}>
                          {[train.status, delayLabel(train.delayMinutes), train.platform ? `pf ${train.platform}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.meta}>{live.reason}</Text>
                  )}
                  {live.stale ? <Text style={styles.meta}>{live.reason}</Text> : null}
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.note}>Loading departures…</Text>
          )
        }
        ListEmptyComponent={body ? <Text style={styles.note}>No more departures today.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/trip/${item.tripId}`)}>
            <Text style={[styles.time, { color: corridorColor(item.corridor) }]}>{item.departure}</Text>
            <View style={styles.rowBody}>
              <Text style={styles.title}>{item.toName}</Text>
              <Text style={styles.meta}>
                {item.name} · {untilLabel(item.minutesUntil)}
                {item.platform ? ` · pf ${item.platform}` : ""}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingTop: 8 },
  kicker: { paddingHorizontal: 16, paddingTop: 8, fontWeight: "700", textTransform: "uppercase" },
  section: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  liveBox: { marginBottom: 8 },
  liveRow: { paddingHorizontal: 16, paddingVertical: 8 },
  row: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  time: { width: 58, fontSize: 18, fontWeight: "700" },
  rowBody: { flex: 1 },
  title: { fontSize: 16, color: colors.ink, fontWeight: "600" },
  meta: { marginTop: 2, color: colors.muted },
  note: { padding: 16, color: colors.muted, fontSize: 16 },
});
