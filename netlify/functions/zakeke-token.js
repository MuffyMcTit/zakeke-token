// netlify/functions/zakeke-token.js

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: "",
    };
  }

  const clientId = process.env.ZAKEKE_CLIENT_ID;
  const clientSecret = process.env.ZAKEKE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return jsonError(500, "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET");
  }

  const endpoint = "https://api.zakeke.com/token";
  const commonHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    // NOTE: we set Authorization only in the Basic-auth attempt below
  };

  // --- Attempt #1: Basic Auth (recommended by Zakeke docs)
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body1 = new URLSearchParams({
    grant_type: "client_credentials",
    // default access_type is C2S; uncomment next line only if you need S2S tokens:
    // access_type: "C2S"
  }).toString();

  let res = await safeFetch(endpoint, {
    method: "POST",
    headers: { ...commonHeaders, Authorization: `Basic ${basicAuth}` },
    body: body1,
  });

  if (!res.ok || !res.data?.["access-token"]) {
    // --- Attempt #2: send client_id / client_secret in the body
    const body2 = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      // access_type: "C2S"
    }).toString();

    res = await safeFetch(endpoint, {
      method: "POST",
      headers: commonHeaders,
      body: body2,
    });
  }

  if (res.ok && res.data?.["access-token"]) {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "access-token": res.data["access-token"],
        "expires_in": res.data["expires_in"],
      }),
    };
  }

  // If we’re here, both attempts failed — return rich diagnostics
  return jsonError(
    res.status || 500,
    "Token request failed",
    {
      status: res.status,
      statusText: res.statusText || "",
      contentType: res.contentType || "",
      rawText: res.rawText || "",
    }
  );
}

/** Util: wraps fetch and safely parses JSON (or captures raw text). */
async function safeFetch(url, init) {
  try {
    const r = await fetch(url, init);
    const contentType = r.headers.get("content-type") || "";
    let data = null;
    let rawText = "";

    if (contentType.includes("application/json")) {
      try {
        data = await r.json();
      } catch {
        // fall back to text if JSON parsing fails
        rawText = await r.text();
      }
    } else {
      // no/unknown content-type — read as text
      rawText = await r.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        // keep rawText only
      }
    }

    return {
      ok: r.ok,
      status: r.status,
      statusText: r.statusText,
      contentType,
      data,
      rawText,
    };
  } catch (e) {
    return {
      ok: false,
      status: 500,
      statusText: `Fetch error: ${e?.message || e}`,
      contentType: "",
      data: null,
      rawText: "",
    };
  }
}

function jsonError(statusCode, message, detail = {}) {
  return {
    statusCode,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify({ error: message, ...detail }),
  };
}
