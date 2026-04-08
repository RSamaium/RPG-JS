const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export interface PayPalOrder {
  id: string;
  status: string;
  approveUrl: string | null;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function createPremiumOrder(
  playerId: string,
  returnUrl: string,
  cancelUrl: string
): Promise<PayPalOrder> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "EUR", value: "10.00" },
          description: `Premium Membership for player ${playerId}`,
          custom_id: playerId,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: "Chronicles of the Ancients",
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal order creation failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const approveLink = data.links?.find(
    (l: { rel: string }) => l.rel === "approve"
  );

  return {
    id: data.id,
    status: data.status,
    approveUrl: approveLink?.href || null,
  };
}

export async function captureOrder(
  orderId: string
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    return { success: false, error: `Capture failed: ${res.status}` };
  }

  const data = await res.json();
  if (data.status !== "COMPLETED") {
    return { success: false, error: `Order status: ${data.status}` };
  }

  const playerId = data.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
    data.purchase_units?.[0]?.custom_id;
  return { success: true, playerId };
}

export function isPayPalConfigured(): boolean {
  return !!PAYPAL_CLIENT_ID && !!PAYPAL_CLIENT_SECRET;
}

export function getPayPalClientId(): string {
  return PAYPAL_CLIENT_ID;
}
