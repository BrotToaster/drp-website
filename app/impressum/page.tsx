import { permanentRedirect } from "next/navigation";

export default function PreviousOperatorPage() {
  permanentRedirect("/datenschutz#verantwortlicher");
}
