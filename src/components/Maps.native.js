import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View } from "react-native";

import { corridorColor } from "../theme";
import { aimTrain, serviceColor, serviceLabel } from "../trains";

function regionFromBbox(bbox) {
  return {
    latitude: (bbox.south + bbox.north) / 2,
    longitude: (bbox.west + bbox.east) / 2,
    latitudeDelta: Math.max(0.2, (bbox.north - bbox.south) * 1.2),
    longitudeDelta: Math.max(0.2, (bbox.east - bbox.west) * 1.2),
  };
}

function regionFromStops(stops) {
  const lats = stops.map((stop) => stop.lat);
  const lons = stops.map((stop) => stop.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
    longitudeDelta: Math.max(0.05, (maxLon - minLon) * 1.5),
  };
}

function TrainPin({ kind, bearing }) {
  const color = serviceColor(kind);
  const turn = Number.isFinite(bearing) ? bearing : 0;
  return (
    <View style={[styles.nav, { transform: [{ rotate: `${turn}deg` }] }]} collapsable={false}>
      <View style={styles.navOutline} />
      <View style={[styles.navHead, { borderBottomColor: color }]} />
    </View>
  );
}

function focusStops(stops, train) {
  if (!train || !Number.isInteger(train.legIndex)) return stops;
  const atEnd = train.status === "at-station" && train.legIndex === stops.length - 1;
  const end = Math.min(stops.length - 1, train.legIndex + (atEnd ? 0 : 1));
  const slice = stops.slice(train.legIndex, end + 1);
  return slice.length ? slice : stops;
}

export function NetworkMap({ bbox, stations, segments, trains = [], filter, onStation, onTrain }) {
  const visibleStations = stations.filter((station) => filter === "all" || station.corridors.includes(filter));
  const visibleSegments = segments.filter((segment) => filter === "all" || segment.corridors.includes(filter));
  const byCode = Object.fromEntries(stations.map((station) => [station.code, station]));
  const aimed = trains.map((train) => aimTrain(train, byCode[train.legFrom], byCode[train.legTo]));

  return (
    <MapView style={styles.map} initialRegion={regionFromBbox(bbox)}>
      {visibleSegments.map((segment) => {
        const from = stations.find((station) => station.code === segment.from);
        const to = stations.find((station) => station.code === segment.to);
        if (!from || !to) return null;
        return (
          <Polyline
            key={`${segment.from}-${segment.to}`}
            coordinates={[
              { latitude: from.lat, longitude: from.lon },
              { latitude: to.lat, longitude: to.lon },
            ]}
            strokeColor={corridorColor(segment.corridors[0])}
            strokeWidth={3}
          />
        );
      })}
      {visibleStations.map((station) => (
        <Marker
          key={station.code}
          coordinate={{ latitude: station.lat, longitude: station.lon }}
          title={station.name}
          description={station.code}
          pinColor={corridorColor(station.corridor)}
          tracksViewChanges={false}
          onPress={() => onStation(station.code)}
          zIndex={1}
        />
      ))}
      {aimed.map((train) => (
        <Marker
          key={train.tripId}
          coordinate={{ latitude: train.lat, longitude: train.lon }}
          title={`${serviceLabel(train.kind)} · ${train.direction || train.fromName}`}
          description={`${train.fromName} → ${train.toName}. ${train.label}. ${train.detail}`}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges
          zIndex={2}
          onPress={() => onTrain(train.tripId)}
        >
          <TrainPin kind={train.kind} bearing={train.bearing} />
        </Marker>
      ))}
    </MapView>
  );
}

export function TripMap({ stops, train }) {
  if (!stops?.length) return null;
  const leg = focusStops(stops, train);
  return (
    <MapView style={styles.trip} initialRegion={regionFromStops(leg.length ? leg : stops)}>
      <Polyline
        coordinates={stops.map((stop) => ({ latitude: stop.lat, longitude: stop.lon }))}
        strokeColor="#CBD5E1"
        strokeWidth={4}
      />
      {leg.length >= 2 ? (
        <Polyline
          coordinates={leg.map((stop) => ({ latitude: stop.lat, longitude: stop.lon }))}
          strokeColor={serviceColor(train?.kind)}
          strokeWidth={5}
        />
      ) : null}
      {train ? (
        <Marker
          coordinate={{ latitude: train.lat, longitude: train.lon }}
          title={`${serviceLabel(train.kind)} · ${train.direction || train.label}`}
          description={train.detail}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges
        >
          <TrainPin kind={train.kind} bearing={train.bearing} />
        </Marker>
      ) : null}
      <Marker coordinate={{ latitude: stops[0].lat, longitude: stops[0].lon }} title={stops[0].name} pinColor="#0F766E" />
      <Marker
        coordinate={{ latitude: stops[stops.length - 1].lat, longitude: stops[stops.length - 1].lon }}
        title={stops[stops.length - 1].name}
        pinColor="#C2410C"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  trip: { height: 280 },
  nav: { width: 28, height: 32, alignItems: "center" },
  navOutline: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 30,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFFFFF",
  },
  navHead: {
    position: "absolute",
    top: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
