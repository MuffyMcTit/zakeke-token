// Robust Zakeke token proxy with fallback & detailed logging
export async function handler(event) {
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

  const fail = (code, detail, extra = {}) => ({
    statusCode: code,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Token request failed", status: code, ...extra, detail }),
  });

  if (!clientId || !clientSecret) {
    return fail(500, "Missing env vars");
  }

  const endpoint = "https://api.zakeke.com/token"; // per docs
  const commonHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const baseParams = new URLSearchParams({
    grant_type: "client_credentials",
    access_type: "C2S", // explicit, though default is C2S
  });

  // --- Attempt 1: Basic Auth (recommended by Zakeke docs)
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { ...commonHeaders, Authorization: `Basic ${basicAuth}` },
      body: baseParams.toString(),
    });

    const text = await res.text();
    const hasJson = (res.headers.get("content-type") || "").includes("application/json");
    const data = hasJson && text ? JSON.parse(text) : null;

    if (res.ok && data && data["access-token"]) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ "access-token": data["access-token"], "expires_in": data["expires_in"] }),
      };
    }

    // fall through to Attempt 2 only on non-2xx
  } catch (e) {
    // continue to attempt 2
  }

  // --- Attempt 2: Send client_id / client_secret in the body (alternative method per docs)
  try {
    const params = new URLSearchParams(baseParams);
    params.set("client_id", clientId);
    params.set("client_secret", clientSecret);

    const res2 = await fetch(endpoint, {
      method: "POST",
      headers: commonHeaders,
      body: params.toString(),
    });

    const text2 = await res2.text();
    const hasJson2 = (res2.headers.get("content-type") || "").includes("application/json");
    const data2 = hasJson2 && text2 ? JSON.parse(text2) : null;

    if (res2.ok && data2 && data2["access-token"]) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ "access-token": data2["access-token"], "expires_in": data2["expires_in"] }),
      };
    }

    return fail(res2.status || 500, text2 || "No response body", {
      contentType: res2.headers.get("content-type") || "",
    });
  } catch (e) {
    return fail(500, e.message || "Exception in Attempt 2");
  }
}
