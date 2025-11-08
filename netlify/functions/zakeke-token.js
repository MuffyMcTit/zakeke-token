// netlify/functions/zakeke-token.js
// Returns a short-lived OAuth token from Zakeke using form POST.
// Sends client_id & client_secret in the BODY (per docs).

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

  try {
    const clientId = process.env.ZAKEKE_CLIENT_ID;
    const clientSecret = process.env.ZAKEKE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return json(500, { error: "Server is missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" });
    }

    // Build form-encoded body (exactly as in Zakeke docs)
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      access_type: "C2S", // explicit, default for client-side usage
    }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    const rawText = await res.text(); // read once
    const hasJson = contentType.includes("application/json");
    const data = hasJson && rawText ? safeJson(rawText) : null;

    // helpful server logs
    console.log("Zakeke token response:", {
      status: res.status,
      contentType,
      hasJson,
      rawText: hasJson ? "(json)" : rawText.slice(0, 120),
    });

    if (!res.ok) {
      return json(res.status, {
        error: "Token request failed",
        status: res.status,
        contentType,
        detail: hasJson ? data : rawText,
      });
    }

    // Zakeke returns: { "access-token": "...", "token_type": "Bearer", "expires_in": 3600 }
    if (!data || !data["access-token"]) {
      return json(500, {
        error: "Token response missing access-token",
        status: res.status,
        contentType,
        detail: hasJson ? data : rawText,
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "access-token": data["access-token"],
        "expires_in": data["expires_in"],
      }),
    };
  } catch (err) {
    console.error("Function error", err);
    return json(500, { error: "Function error", message: String(err && err.message || err) });
  }
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj ?? {}),
  };
}

function safeJson(txt) {
  try { return JSON.parse(txt); } catch { return null; }
}
