import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function PreviewNotice() {
  const session = await auth();
  return <aside className="preview-notice" aria-label="Entscheidungsvorschau"><strong>Entscheidungsvorschau – Testdaten</strong>
    {session?.user ? <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button type="submit">Testkonto wechseln</button></form> : <Link href="/login">Testkonten</Link>}
  </aside>;
}
