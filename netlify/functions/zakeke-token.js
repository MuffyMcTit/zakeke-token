// netlify/functions/zakeke-token.js
export async function handler(event) {
  // CORS
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
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "client_credentials" }).toString();

    const res = await fetch("https://api.zakeke.com/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    const hasJson = contentType.includes("application/json");
    const rawText = hasJson ? "" : await safeText(res);

    if (!res.ok) {
      const detail = hasJson ? await safeJson(res) : { statusText: res.statusText };
      console.log("Zakeke token response:", { status: res.status, contentType, hasJson, rawText });
      return json(500, { error: "Token request failed", status: res.status, contentType, detail });
    }

    const data = hasJson ? await res.json() : await safeJsonFromText(rawText);
    if (!data || !data.access_token) {
      console.log("Zakeke token response (no token):", { status: res.status, contentType, rawText });
      return json(500, { error: "Token request failed", status: res.status, contentType, detail: rawText || "" });
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ "access-token": data.access_token, "expires_in": data.expires_in }),
    };
  } catch (err) {
    console.log("Zakeke token exception:", err && (err.stack || err.message || err));
    return json(500, { error: "Token request failed", detail: "Network/exception" });
  }
}

function json(code, obj) {
  return {
    statusCode: code,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

async function safeText(res) {
  try { return await res.text(); } catch { return ""; }
}

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

function safeJsonFromText(t) {
  try { return JSON.parse(t); } catch { return {}; }
}
