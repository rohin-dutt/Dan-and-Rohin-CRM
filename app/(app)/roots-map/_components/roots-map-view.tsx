"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { formatDate } from "@/lib/date-utils";

if (typeof window !== "undefined") {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
}

type MapPerson = {
  id: string;
  name: string;
  location: string | null;
  latitude: number;
  longitude: number;
  last_contacted_at: string | null;
};

export default function RootsMapView({ people }: { people: MapPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hasToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!hasToken || !containerRef.current || map.current) return;

    // Group people by rounded coordinates so same-city contacts share one pin
    const groups = new Map<string, MapPerson[]>();
    people.forEach((p) => {
      const key = `${Math.round(p.latitude * 1000)},${Math.round(p.longitude * 1000)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(p);
      } else {
        groups.set(key, [p]);
      }
    });

    map.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [0, 20],
      zoom: 1.5,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      if (groups.size > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        groups.forEach((group) => {
          bounds.extend([group[0].longitude, group[0].latitude]);
        });
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 10 });
      }

      groups.forEach((group) => {
        const anchor = group[0];
        const el = document.createElement("div");

        if (group.length === 1) {
          el.style.width = "14px";
          el.style.height = "14px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = "#7C9A7E";
          el.style.border = "2px solid white";
          el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
          el.style.cursor = "pointer";
        } else {
          el.style.width = "28px";
          el.style.height = "28px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = "#7C9A7E";
          el.style.border = "2px solid white";
          el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
          el.style.cursor = "pointer";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.color = "white";
          el.style.fontSize = "11px";
          el.style.fontWeight = "600";
          el.innerHTML = `${group.length}`;
        }

        let popupHTML: string;
        if (group.length === 1) {
          const person = group[0];
          popupHTML = `<div style="padding:8px;min-width:160px;font-family:sans-serif">
            <p style="font-weight:600;margin:0 0 4px">${person.name}</p>
            <p style="color:#6b7280;font-size:12px;margin:0 0 4px">${person.location ?? ""}</p>
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px">Last talked: ${formatDate(person.last_contacted_at)}</p>
            <a href="/people/${person.id}" style="color:#7C9A7E;font-size:12px;font-weight:500;text-decoration:none">View profile →</a>
          </div>`;
        } else {
          const rows = group
            .map(
              (person) =>
                `<div style="padding:6px 0;border-top:1px solid #f3f4f6">
                  <p style="font-weight:500;margin:0 0 2px;font-size:12px">${person.name}</p>
                  <p style="color:#6b7280;font-size:11px;margin:0 0 4px">Last talked: ${formatDate(person.last_contacted_at)}</p>
                  <a href="/people/${person.id}" style="color:#7C9A7E;font-size:11px;font-weight:500;text-decoration:none">View profile →</a>
                </div>`
            )
            .join("");
          popupHTML = `<div style="padding:8px;min-width:180px;font-family:sans-serif">
            <p style="font-weight:600;margin:0 0 8px;font-size:13px">${anchor.location ?? ""}</p>
            ${rows}
          </div>`;
        }

        const popup = new mapboxgl.Popup({ className: "roots-popup", offset: 12 }).setHTML(popupHTML);

        new mapboxgl.Marker({ element: el })
          .setLngLat([anchor.longitude, anchor.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // people is stable per render — page remounts this component via key prop when filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  if (!hasToken) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card h-64">
        <p className="text-sm text-muted-foreground">
          Map unavailable — configuration missing.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-border overflow-hidden shadow-sm"
      style={{ height: "calc(100vh - 280px)" }}
    />
  );
}
