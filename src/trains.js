export const serviceColors = {
  local: "#166534",
  fast: "#B91C1C",
};

export function serviceColor(kind) {
  return kind === "fast" ? serviceColors.fast : serviceColors.local;
}

export function serviceLabel(kind) {
  return kind === "fast" ? "Fast" : "Local";
}

export const trackingWarning =
  "Calculated from the timetable and station positions. Actual trains may deviate from this point.";

export function bearingDegrees(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  return Math.round((((Math.atan2(y, x) * 180) / Math.PI + 360) % 360) * 10) / 10;
}

export function aimTrain(train, fromStop, toStop) {
  if (!fromStop || !toStop || fromStop.code === toStop.code) return train;
  return {
    ...train,
    bearing: Number.isFinite(train.bearing) ? train.bearing : bearingDegrees(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon),
    direction: train.direction || `Towards ${toStop.name}`,
  };
}


