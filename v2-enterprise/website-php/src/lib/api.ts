import type { LeadPayload } from "@/lib/types";
import { VEHICLES } from "@/lib/data/vehicles";
import { LOCATIONS } from "@/lib/data/locations";

/**
 * Lead submission client for the public-facing site.
 *
 * Submits to this app's own /api/leads route (see src/app/api/leads/route.ts),
 * which server-side proxies to the real v2-enterprise backend's
 * PublicVehiclesController (src/API/Controllers/PublicVehiclesController.cs) —
 * an [AllowAnonymous] controller that already implements:
 *
 *   POST /api/public/vehicles/leads          — general inquiry (creates/matches a
 *                                               Customer + logs a CrmInteraction)
 *   POST /api/public/vehicles/visit-requests — test drive / showroom visit booking
 *
 * Proxying server-side avoids exposing the backend URL to the browser and
 * sidesteps CORS entirely. Every other endpoint on that API (accounting,
 * installments, ledgers, staff inventory management) is JWT-protected
 * internal tooling and is intentionally never called from the public site.
 *
 * Note: the backend's per-unit inventory (real purchased vehicles, tracked by
 * VIN/cost for accounting) is a different data model from this site's
 * marketing catalog (BYD model specs/features/imagery in lib/data/vehicles.ts),
 * so vehicle identity is passed as free text in the message rather than a
 * database foreign key.
 */

function describeVehicle(vehicleId?: string) {
  if (!vehicleId) return null;
  return VEHICLES.find((v) => v.id === vehicleId || v.slug === vehicleId) ?? null;
}

function describeLocation(locationId?: string) {
  if (!locationId) return null;
  return LOCATIONS.find((l) => l.id === locationId) ?? null;
}

function buildMessage(payload: LeadPayload): string {
  const parts: string[] = [];
  const typeLabel: Record<LeadPayload["type"], string> = {
    "test-drive": "Test drive request",
    "trade-in": "Trade-in request",
    contact: "Contact form",
    finance: "Financing application",
    newsletter: "Newsletter signup",
    brochure: "Brochure download",
  };
  parts.push(`[${typeLabel[payload.type]}]`);

  const vehicle = describeVehicle(payload.vehicleId);
  if (vehicle) parts.push(`Vehicle: ${vehicle.nameEn}`);

  const location = describeLocation(payload.locationId);
  if (location) parts.push(`Showroom: ${location.nameEn}`);

  if (payload.email) parts.push(`Email: ${payload.email}`);
  if (payload.message) parts.push(`Message: ${payload.message}`);

  return parts.join(" — ");
}

export async function submitLead(payload: LeadPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: payload.type,
        name: payload.name,
        phone: payload.phone,
        vehicleId: payload.vehicleId,
        preferredDate: payload.preferredDate,
        message: buildMessage(payload),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: json?.message ?? "Something went wrong. Please try again." };
    return { success: true, message: json?.message };
  } catch {
    return { success: false, message: "Network error. Please try again." };
  }
}
