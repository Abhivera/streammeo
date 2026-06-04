/** Verify Shopify Admin API credentials (Phase 3). */
export async function testShopifyCredentials(
  shopDomain: string,
  accessToken: string,
): Promise<boolean> {
  const url = `https://${shopDomain}/admin/api/2024-01/shop.json`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": accessToken },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!res.ok) return false;
    const data = (await res.json()) as { shop?: unknown };
    return !!data.shop;
  } catch {
    return false;
  }
}
