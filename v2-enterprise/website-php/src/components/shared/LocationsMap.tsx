"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/lib/i18n/context";
import { LOCATIONS } from "@/lib/data/locations";

// A brand-colored dot marker built from inline HTML — sidesteps the classic
// "Leaflet's default marker images 404 under a bundler" issue entirely,
// since no external icon assets are referenced at all.
const markerIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:30px;height:30px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.4)"></span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const BAGHDAD_CENTER: [number, number] = [33.3128, 44.3615];

export default function LocationsMap() {
  const { locale } = useI18n();

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-3xl border border-border">
      <MapContainer
        center={BAGHDAD_CENTER}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
        aria-label={locale === "ar" ? "خريطة معارض الأصدقاء للسيارات" : "Al-Sadaka Motors showroom map"}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {LOCATIONS.map((l) => (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={markerIcon}>
            <Popup>
              <div className="min-w-[180px] text-sm">
                <p className="font-bold">{locale === "ar" ? l.nameAr : l.nameEn}</p>
                <p className="mt-1 text-xs text-neutral-600">{locale === "ar" ? l.addressAr : l.addressEn}</p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline"
                >
                  {locale === "ar" ? "احصل على الاتجاهات ↗" : "Get Directions ↗"}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
