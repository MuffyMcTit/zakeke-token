// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke with robust error handling.

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
    return json(500, { error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" });
  }

  try {
    // Build Basic auth header
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // Timeout guard (12s)
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(new Error("Fetch timeout")), 12000);

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
      signal: controller.signal,
    }).catch((e) => {
      throw new Error(`Network error to Zakeke: ${e.message}`);
    });
    clearTimeout(to);

    // Always read as text first (handles empty/HTML/plain text bodies)
    const raw = await res.text();
    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    let parsed = null;
    if (raw && contentType.includes("application/json")) {
      try { parsed = JSON.parse(raw); } catch { /* ignore parse error */ }
    }

    if (!res.ok) {
      // Prefer parsed JSON error if available, else fall back to raw/statusText
      const detail = parsed || (raw ? { raw } : { statusText: res.statusText || "" });
      return json(res.status || 500, {
        error: "Token request failed",
        status: res.status || 500,
        contentType,
        detail,
        hint: "Double-check ZAKEKE_CLIENT_ID / ZAKEKE_CLIENT_SECRET and that they were saved before redeploy.",
      });
    }

    // Success path: need access_token in the parsed JSON
    if (!parsed || !parsed.access_token) {
      return json(500, {
        error: "Token response missing access_token",
        contentType,
        raw: raw || "",
      });
    }

    return json(200, {
      "access-token": parsed.access_token,
      "expires_in": parsed.expires_in,
    });

  } catch (err) {
    return json(500, {
      error: "Function error",
      message: String(err && err.message ? err.message : err),
    });
  }
}

// helper
function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  };
}
