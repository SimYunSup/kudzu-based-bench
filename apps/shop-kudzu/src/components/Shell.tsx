import Header from "./Header";
import Footer from "./Footer";

/**
 * Shared layout for the shopping journey.
 *
 * Kudzu requires every route in a `navigation` group to export the same
 * layout identity (build.mjs: "must export a layout function so Kudzu can
 * emit route markers"). Layout DOM, state, and effects persist across
 * same-document transitions while the route range is replaced — which is
 * what keeps the cart count alive from list to detail without a client store.
 */
export default function Shell({ children }: { children?: unknown }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
