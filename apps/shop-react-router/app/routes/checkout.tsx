/**
 * Terminal step of the measured journey. Next.js Commerce hands off to
 * Shopify here; the fixture stops at a static confirmation so no variant
 * needs a server.
 */
export default function CheckoutPage() {
  return (
    <main className="checkout">
      <h1>결제</h1>
      <p>벤치마크 픽스처입니다. 실제 결제는 진행되지 않습니다.</p>
    </main>
  );
}
