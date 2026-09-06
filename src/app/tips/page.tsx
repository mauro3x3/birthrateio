import { permanentRedirect } from "next/navigation";

/** Alias for /contribute. */
export default function TipsRedirect() {
  permanentRedirect("/contribute");
}
