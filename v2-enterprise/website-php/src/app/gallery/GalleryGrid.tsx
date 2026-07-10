"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { VEHICLES } from "@/lib/data/vehicles";
import VehicleStudioRender from "@/components/vehicles/VehicleStudioRender";

const ANGLES: ("side" | "three-quarter")[] = ["side", "three-quarter"];

export default function GalleryGrid() {
  const { locale } = useI18n();
  const [active, setActive] = useState<{ vehicleId: string; angle: "side" | "three-quarter" } | null>(null);

  const tiles = VEHICLES.flatMap((v) => ANGLES.map((angle) => ({ vehicle: v, angle })));
  const activeVehicle = active ? VEHICLES.find((v) => v.id === active.vehicleId) : null;

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {tiles.map(({ vehicle, angle }, i) => (
          <button
            key={`${vehicle.id}-${angle}`}
            onClick={() => setActive({ vehicleId: vehicle.id, angle })}
            className="card-elevated block w-full overflow-hidden rounded-2xl text-start"
          >
            <VehicleStudioRender
              category={vehicle.category}
              angle={angle}
              className={i % 3 === 0 ? "h-72" : "h-56"}
            />
            <div className="p-4">
              <p className="text-sm font-extrabold">{locale === "ar" ? vehicle.nameAr : vehicle.nameEn}</p>
              <p className="text-xs text-fg-subtle">{locale === "ar" ? vehicle.typeAr : vehicle.typeEn}</p>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activeVehicle && active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-6"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-bg-elevated"
            >
              <button
                onClick={() => setActive(null)}
                className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <VehicleStudioRender category={activeVehicle.category} angle={active.angle} className="h-96" />
              <div className="p-6">
                <p className="text-lg font-extrabold">{locale === "ar" ? activeVehicle.nameAr : activeVehicle.nameEn}</p>
                <p className="text-sm text-fg-subtle">{locale === "ar" ? activeVehicle.typeAr : activeVehicle.typeEn}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
