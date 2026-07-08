// Nightring CORS proxy for the Oura API.
// Deploy on Cloudflare Workers (free). It forwards requests to Oura and adds the
// CORS headers a browser requires. It stores nothing and only relays your token.

const ALLOWED_ORIGIN = 'https://jebbadee.github.io';
const OURA = 'https://api.ouraring.com';

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Only proxy Oura API paths
    if (!url.pathname.startsWith('/v2/')) {
      return new Response('Nightring proxy OK. Use /v2/... paths.', {
        status: 200, headers: cors,
      });
    }

    const target = OURA + url.pathname + url.search;
    let upstream;
    try {
      upstream = await fetch(target, {
        method: 'GET',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Accept': 'application/json',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'upstream_unreachable' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const body = await upstream.arrayBuffer();
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    return new Response(body, { status: upstream.status, headers });
  },
};
