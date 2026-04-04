import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * OpenStreetMap tiles + Leaflet. Markers from programme data (real lat/lng).
 */
export default function UniversityMap({
  markers,
  activeMarkerId,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const valid = (markers || []).filter(
      (m) => typeof m.lat === "number" && typeof m.lng === "number",
    );
    if (valid.length === 0) {
      mapRef.current.setView([54, -4], 5);
      return;
    }

    const group = L.featureGroup();
    valid.forEach((m) => {
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: 9,
        color: "#c8a45a",
        weight: 2,
        fillColor: "#0b0e1a",
        fillOpacity: 0.92,
      }).addTo(mapRef.current);

      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.4">
          <strong style="display:block;margin-bottom:4px">${m.title || "Campus"}</strong>
          ${m.sub ? `<span style="color:#444">${m.sub}</span>` : ""}
        </div>`,
      );

      if (m.id) markersRef.current[m.id] = marker;
      marker.addTo(group);
    });

    mapRef.current.fitBounds(group.getBounds().pad(0.15));
  }, [markers]);

  // Handle zooming to active marker
  useEffect(() => {
    if (!mapRef.current || !activeMarkerId) return;

    const markerData = markers.find((m) => m.id === activeMarkerId);
    if (markerData && typeof markerData.lat === "number") {
      mapRef.current.setView([markerData.lat, markerData.lng], 14, {
        animate: true,
      });
      // Open popup if exists
      if (markersRef.current[activeMarkerId]) {
        markersRef.current[activeMarkerId].openPopup();
      }
    }
  }, [activeMarkerId, markers]);

  return (
    <div
      ref={containerRef}
      className={`z-0 min-h-[320px] w-full overflow-hidden rounded-xl border border-white/15 md:min-h-[420px] ${className}`}
    />
  );
}
