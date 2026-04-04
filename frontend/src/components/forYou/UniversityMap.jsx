import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * OpenStreetMap tiles + Leaflet. Markers from programme data (real lat/lng).
 */
export default function UniversityMap({ markers, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const valid = (markers || []).filter((m) => typeof m.lat === "number" && typeof m.lng === "number");
    if (valid.length === 0) {
      map.setView([54, -4], 5);
      mapRef.current = map;
      return () => {
        map.remove();
        mapRef.current = null;
      };
    }

    const group = L.featureGroup();
    valid.forEach((m) => {
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: 9,
        color: "#c8a45a",
        weight: 2,
        fillColor: "#0b0e1a",
        fillOpacity: 0.92,
      });
      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.4">
          <strong style="display:block;margin-bottom:4px">${m.title || "Campus"}</strong>
          ${m.sub ? `<span style="color:#444">${m.sub}</span>` : ""}
        </div>`,
      );
      marker.addTo(group);
    });
    group.addTo(map);
    map.fitBounds(group.getBounds().pad(0.15));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className={`z-0 min-h-[320px] w-full overflow-hidden rounded-xl border border-white/15 md:min-h-[420px] ${className}`}
    />
  );
}
