import { notFound } from "next/navigation";
import { ErrorScreen } from "@/components/error-screen";
import { isCommonErrorCode } from "@/lib/common-errors";
export const metadata = { title: "Fehlerhilfe", robots: { index: false, follow: false } };
export default async function ErrorHelp({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isCommonErrorCode(code)) notFound();
  return <ErrorScreen code={code} information />;
}
