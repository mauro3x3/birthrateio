import { permanentRedirect } from "next/navigation";

/** India dots map removed — tiles were never shipped to production. */
export default function IndiaDotsRedirect() {
  permanentRedirect("/population");
}
