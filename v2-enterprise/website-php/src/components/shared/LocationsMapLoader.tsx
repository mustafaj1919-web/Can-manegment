"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`/`document` at import time, so it must never be
// pulled into the server render — ssr:false is only permitted inside a
// Client Component boundary in the App Router, which is exactly what this
// tiny wrapper provides.
const LocationsMap = dynamic(() => import("./LocationsMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-[420px] w-full rounded-3xl" />,
});

export default LocationsMap;
