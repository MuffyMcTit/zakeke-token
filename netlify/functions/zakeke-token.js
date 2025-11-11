export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }};
  }

  const clientId = process.env.ZAKEKE_CLIENT_ID;
  const clientSecret = process.env.ZAKEKE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json(500, { error: "Missing ZAKEKE_CLIENT_ID or ZAKEKE_CLIENT_SECRET" });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "public_api"
  }).toString();

  const res = await fetch("https://api.zakeke.com/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body
  });

  const contentType = res.headers.get("content-type") || "";
  const hasJson = contentType.includes("application/json");
  const payload = hasJson ? await safeJson(res) : await res.text();

  if (!res.ok) {
    // Show exactly what Zakeke returned so we can diagnose
    return json(res.status, {
      error: "Token request failed",
      status: res.status,
      detail: payload || "",
    });
  }

  // Zakeke’s JSON contains access_token + expires_in
  const { access_token, expires_in } = payload;
  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify({ "access-token": access_token, "expires_in": expires_in })
  };
}

async function safeJson(res) {
  try { return await res.json(); }
  catch { return {}; }
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
}
