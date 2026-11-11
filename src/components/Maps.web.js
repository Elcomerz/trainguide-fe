import { useEffect, useId, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { corridorColor } from "../theme";
import { aimTrain, serviceColor, serviceLabel } from "../trains";

const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const TRAIN_CSS = [
  ".leaflet-div-icon.train-pin{background:transparent;border:none;}",
  ".nav-arrow{width:32px;height:32px;transform-origin:center center;",
  "filter:drop-shadow(0 1px 1px rgba(15,23,42,.45));}",
].join("");

function ensureTrainCss() {
  if (typeof document === "undefined") return;
  let style = document.getElementById("train-pin-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "train-pin-css";
    document.head.appendChild(style);
  }
  if (style.textContent !== TRAIN_CSS) style.textContent = TRAIN_CSS;
}

function trainIcon(color, bearing) {
  const turn = Number.isFinite(bearing) ? bearing : 0;
  return window.L.divIcon({
    className: "train-pin",
    html: [
      `<div class="nav-arrow" style="transform:rotate(${turn}deg)">`,
      `<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">`,
      `<path d="M16 1 L28 29 L16 22 L4 29 Z" fill="${color}" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>`,
      `</svg>`,
      `</div>`,
    ].join(""),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function loadLeaflet() {
  if (typeof document === "undefined") return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (!loadLeaflet.promise) {
    loadLeaflet.promise = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = LEAFLET;
      script.async = true;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("Could not load the map."));
      document.head.appendChild(script);
    });
  }
  return loadLeaflet.promise;
}

function useMap(nativeId, bounds, maxZoom = 16) {
  const mapRef = useRef(null);
  const boundsRef = useRef(bounds);
  const maxZoomRef = useRef(maxZoom);
  const [ready, setReady] = useState(false);
  boundsRef.current = bounds;
  maxZoomRef.current = maxZoom;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !L) return;
        const attach = () => {
          if (cancelled || mapRef.current) return;
          const el = document.getElementById(nativeId);
          if (!el) return;
          const map = L.map(el, { zoomControl: true });
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: "&copy; OpenStreetMap",
          }).addTo(map);
          if (boundsRef.current) {
            map.fitBounds(boundsRef.current, { padding: [20, 20], maxZoom: maxZoomRef.current });
          }
          mapRef.current = map;
          setReady(true);
          setTimeout(() => map.invalidateSize(), 50);
          setTimeout(() => map.invalidateSize(), 300);
        };
        attach();
        if (!mapRef.current) requestAnimationFrame(attach);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [nativeId]);

  return [mapRef, ready];
}

function drawNetwork(map, { stations, segments, trains, filter, onStation, onTrain }) {
  const L = window.L;
  if (!L) return null;
  ensureTrainCss();
  const layer = L.layerGroup().addTo(map);
  const visibleStations = stations.filter((station) => filter === "all" || station.corridors.includes(filter));
  const visibleSegments = segments.filter((segment) => filter === "all" || segment.corridors.includes(filter));
  const byCode = Object.fromEntries(stations.map((station) => [station.code, station]));

  visibleSegments.forEach((segment) => {
    const from = byCode[segment.from];
    const to = byCode[segment.to];
    if (!from || !to) return;
    L.polyline(
      [
        [from.lat, from.lon],
        [to.lat, to.lon],
      ],
      { color: corridorColor(segment.corridors[0]), weight: 3 },
    ).addTo(layer);
  });

  visibleStations.forEach((station) => {
    L.circleMarker([station.lat, station.lon], {
      radius: 5,
      color: "#ffffff",
      weight: 1,
      fillColor: corridorColor(station.corridor),
      fillOpacity: 1,
    })
      .addTo(layer)
      .bindTooltip(station.name)
      .on("click", () => onStation(station.code));
  });

  const aimed = trains.map((train) => aimTrain(train, byCode[train.legFrom], byCode[train.legTo]));
  aimed.forEach((train) => {
    const color = serviceColor(train.kind);
    const heading = train.direction ? `${serviceLabel(train.kind)} · ${train.direction}` : serviceLabel(train.kind);
    L.marker([train.lat, train.lon], {
      icon: trainIcon(color, train.bearing),
      zIndexOffset: 800,
    })
      .addTo(layer)
      .bindTooltip(`${heading}<br>${train.fromName} → ${train.toName}<br>${train.label}`)
      .on("click", () => onTrain(train.tripId));
  });

  return layer;
}

export function NetworkMap({ bbox, stations, segments, trains = [], filter, onStation, onTrain }) {
  const nativeId = `net-${useId().replace(/:/g, "")}`;
  const bounds = bbox ? [[bbox.south, bbox.west], [bbox.north, bbox.east]] : null;
  const [mapRef, ready] = useMap(nativeId, bounds);
  const layerRef = useRef(null);
  const handlers = useRef({ onStation, onTrain });
  handlers.current = { onStation, onTrain };

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !window.L) return undefined;
    const render = () => {
      layerRef.current?.remove();
      layerRef.current = drawNetwork(map, {
        stations,
        segments,
        trains,
        filter,
        onStation: (code) => handlers.current.onStation(code),
        onTrain: (id) => handlers.current.onTrain(id),
      });
    };
    render();
    map.on("zoomend", render);
    const timer = setTimeout(render, 350);
    return () => {
      clearTimeout(timer);
      map.off("zoomend", render);
    };
  }, [ready, stations, segments, trains, filter, mapRef]);

  return <View nativeID={nativeId} style={styles.fill} />;
}

function focusStops(stops, train) {
  if (!train || !Number.isInteger(train.legIndex)) return stops;
  const end = Math.min(stops.length - 1, train.legIndex + (train.status === "at-station" && train.legIndex === stops.length - 1 ? 0 : 1));
  const slice = stops.slice(train.legIndex, end + 1);
  return slice.length ? slice : stops;
}

export function TripMap({ stops, train }) {
  const nativeId = `trip-${useId().replace(/:/g, "")}`;
  const focus = stops?.length ? focusStops(stops, train) : [];
  const bounds = focus.length
    ? [
        [Math.min(...focus.map((stop) => stop.lat)), Math.min(...focus.map((stop) => stop.lon))],
        [Math.max(...focus.map((stop) => stop.lat)), Math.max(...focus.map((stop) => stop.lon))],
      ]
    : null;
  const [mapRef, ready] = useMap(nativeId, bounds, 14);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !window.L || !stops?.length) return undefined;
    const L = window.L;
    ensureTrainCss();
    const layer = L.layerGroup().addTo(map);
    L.polyline(
      stops.map((stop) => [stop.lat, stop.lon]),
      { color: "#CBD5E1", weight: 4 },
    ).addTo(layer);
    const leg = focusStops(stops, train);
    if (leg.length >= 2) {
      L.polyline(
        leg.map((stop) => [stop.lat, stop.lon]),
        { color: serviceColor(train?.kind), weight: 5 },
      ).addTo(layer);
    }
    stops.forEach((stop) => {
      L.circleMarker([stop.lat, stop.lon], {
        radius: 4,
        color: "#ffffff",
        weight: 1,
        fillColor: "#0F172A",
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindTooltip(stop.name);
    });
    if (train) {
      L.marker([train.lat, train.lon], {
        icon: trainIcon(serviceColor(train.kind), train.bearing),
        zIndexOffset: 800,
      })
        .addTo(layer)
        .bindTooltip(`${serviceLabel(train.kind)} · ${train.direction || train.label}`);
    }
    return () => layer.remove();
  }, [ready, stops, train, mapRef]);

  if (!stops?.length) return null;
  return <View nativeID={nativeId} style={styles.trip} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 420, width: "100%" },
  trip: { height: 300, width: "100%" },
});
