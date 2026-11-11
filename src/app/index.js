import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getJson, untilLabel } from "../api";
import { CloseCircle, NavIcon, SwapIcon } from "../icons";
import { colors } from "../theme";
import { serviceColor, serviceLabel, trackingWarning } from "../trains";

function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function matches(station, text) {
  const needle = text.trim().toLowerCase();
  if (!needle) return false;
  return station.name.toLowerCase().includes(needle) || station.code.toLowerCase().includes(needle);
}

export default function HomeScreen() {
  const [stations, setStations] = useState([]);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [active, setActive] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    let activeLoad = true;
    getJson("/api/stations")
      .then((rows) => {
        if (activeLoad) setStations(rows);
      })
      .catch(() => {
        if (activeLoad) setError("Cannot reach the API. Start the Python server on port 8000.");
      });
    return () => {
      activeLoad = false;
    };
  }, []);

  useEffect(() => {
    if (!from || !to || from.code === to.code) {
      setPlan(null);
      setLookupError("");
      return undefined;
    }
    let alive = true;
    setLookupError("");
    getJson(`/api/journeys?from=${encodeURIComponent(from.code)}&to=${encodeURIComponent(to.code)}&hours=2`)
      .then((body) => {
        if (alive) setPlan(body);
      })
      .catch(() => {
        if (alive) setLookupError("Could not load trains for this route. Restart the API, then try again.");
      });
    return () => {
      alive = false;
    };
  }, [from, to]);

  const query = active === "from" ? fromText : active === "to" ? toText : "";
  const blocked = active === "from" ? to?.code : from?.code;
  const suggestions = query.trim()
    ? stations.filter((station) => station.code !== blocked && matches(station, query)).slice(0, 8)
    : [];
  const picking = Boolean(active && query.trim());
  const ready = from && to && from.code !== to.code;
  const insets = useSafeAreaInsets();

  function choose(station) {
    if (active === "to") {
      setTo(station);
      setToText(station.name);
    } else {
      setFrom(station);
      setFromText(station.name);
    }
    setActive(null);
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setFromText(to ? to.name : "");
    setToText(from ? from.name : "");
    setActive(null);
  }

  function openLive() {
    if (ready) {
      router.push({ pathname: "/track", params: { from: from.code, to: to.code } });
      return;
    }
    router.push("/track");
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "TrainGuide" }} />
      <View style={styles.card}>
        <Text style={styles.kicker}>Chennai suburban</Text>
        <Text style={styles.label}>Boarding station</Text>
        <View style={styles.field}>
          <TextInput
            value={fromText}
            onChangeText={(text) => {
              setFromText(text);
              setFrom(null);
              setActive("from");
            }}
            onFocus={() => setActive("from")}
            placeholder="Search a station"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {fromText ? (
            <Pressable
              accessibilityLabel="Clear boarding station"
              onPress={() => {
                setFrom(null);
                setFromText("");
                setActive("from");
              }}
              hitSlop={8}
            >
              <CloseCircle color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.swap} accessibilityLabel="Swap stations" onPress={swap}>
          <SwapIcon color={colors.accent} />
        </Pressable>
        <Text style={styles.label}>Destination</Text>
        <View style={styles.field}>
          <TextInput
            value={toText}
            onChangeText={(text) => {
              setToText(text);
              setTo(null);
              setActive("to");
            }}
            onFocus={() => setActive("to")}
            placeholder="Search a station"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {toText ? (
            <Pressable
              accessibilityLabel="Clear destination"
              onPress={() => {
                setTo(null);
                setToText("");
                setActive("to");
              }}
              hitSlop={8}
            >
              <CloseCircle color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {from && to && from.code === to.code ? <Text style={styles.empty}>Choose two different stations.</Text> : null}

      <FlatList
        data={picking ? suggestions : plan?.journeys || []}
        keyExtractor={(item) => item.code || item.tripId}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          picking || error ? null : ready ? (
            <Text style={styles.section}>
              {lookupError
                ? lookupError
                : !plan
                  ? "Looking up trains…"
                  : plan.path.length === 0
                    ? "No trains stop at both stations in that direction."
                    : plan.journeys.length === 0
                      ? "No departures in the next 2 hours."
                      : `Next 2 hours · ${plan.journeys.length} trains`}
            </Text>
          ) : (
            <Text style={styles.empty}>Search a boarding station and a destination to see trains in the next 2 hours.</Text>
          )
        }
        renderItem={({ item }) =>
          picking ? (
            <Pressable style={styles.suggestion} onPress={() => choose(item)}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.meta}>{item.code}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.train} onPress={() => router.push(`/trip/${item.tripId}`)}>
              <View style={styles.times}>
                <Text style={styles.clock}>{item.departure}</Text>
                <Text style={styles.duration}>{durationLabel(item.duration)}</Text>
                <Text style={styles.clock}>{item.arrival}</Text>
              </View>
              <Text style={styles.meta}>
                <Text style={{ color: serviceColor(item.kind), fontWeight: "700" }}>{serviceLabel(item.kind)}</Text>
                {` · ${untilLabel(item.minutesUntil)}`}
                {item.platform ? ` · pf ${item.platform}` : ""}
                {` · ${item.service}`}
              </Text>
            </Pressable>
          )
        }
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={styles.warn}>{trackingWarning}</Text>
        <Pressable style={styles.track} onPress={openLive}>
          <NavIcon />
          <View>
            <Text style={styles.trackText}>Live train tracking</Text>
            <Text style={styles.trackMeta}>{ready ? `${from.name} to ${to.name}` : "All trains running now"}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  card: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#0E3A56",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  kicker: { color: colors.accent, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  field: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.field,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 17, color: colors.ink, fontWeight: "600" },
  swap: {
    alignSelf: "center",
    marginVertical: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  footer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  warn: { marginBottom: 8, color: colors.warn, fontSize: 12, fontWeight: "600" },
  track: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  trackText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  trackMeta: { color: "#FFE8D6", fontSize: 12, fontWeight: "600", marginTop: 1 },
  section: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, color: colors.muted, fontWeight: "700" },
  suggestion: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  train: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  times: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  clock: { fontSize: 22, fontWeight: "800", color: colors.ink },
  duration: { color: colors.accent, fontWeight: "700" },
  title: { fontSize: 16, color: colors.ink, fontWeight: "700" },
  meta: { marginTop: 4, color: colors.muted },
  empty: { paddingHorizontal: 16, paddingVertical: 12, color: colors.muted, fontSize: 16 },
});
