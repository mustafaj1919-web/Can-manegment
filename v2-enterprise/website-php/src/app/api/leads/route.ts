import { NextResponse } from 'next/server';

/**
 * Server-side proxy to the v2-enterprise backend's public lead-capture
 * endpoints (PublicVehiclesController). Keeping this on the server means:
 *  - the real API base URL never has to be exposed to the browser
 *  - no CORS configuration is needed between this site and the backend
 *  - if the backend is briefly unreachable, we can fail soft instead of
 *    breaking the visitor's experience
 *
 * Body: { type, name, phone, vehicleId?, locationId?, preferredDate?, email?, message? }
 * `type: "test-drive"` is routed to /api/public/vehicles/visit-requests,
 * everything else goes to /api/public/vehicles/leads.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, name, phone, preferredDate, message } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'Name and phone are required' }, { status: 400 });
    }

    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'https://alsadaka.com').replace(/\/$/, '');
    const isVisit = type === 'test-drive';
    const apiUrl = `${apiBaseUrl}${isVisit ? '/api/public/vehicles/visit-requests' : '/api/public/vehicles/leads'}`;

    const upstreamBody = isVisit
      ? {
          Name: name,
          Phone: phone,
          VisitDate: preferredDate ? new Date(preferredDate).toISOString() : new Date().toISOString(),
        }
      : {
          Name: name,
          Phone: phone,
          Message: message || '',
        };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    });

    const responseText = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawResponse: responseText };
    }

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to submit to backend', details: data },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true, ...(typeof data === 'object' && data ? data : {}) });
  } catch (error) {
    console.error('Error in leads API proxy:', error);
    // Soft success so a temporarily unreachable backend doesn't break the visitor's experience.
    return NextResponse.json({
      success: true,
      warning: 'Local mock success since backend was unreachable',
      mocked: true,
    });
  }
}
