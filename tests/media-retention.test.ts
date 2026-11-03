import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const asset = { id: "shared-image", cloudinaryPublicId: "shared", resourceType: "image", deliveryType: "upload" };
  const tx = {
    rule: { delete: vi.fn(), findUnique: vi.fn().mockResolvedValue({ revisions: [{ media: [{ media: asset }] }] }) },
    newsPost: { delete: vi.fn(), findUnique: vi.fn().mockResolvedValue({ thumbnail: asset, revisions: [{ media: [{ media: asset }] }] }) },
    auditLog: { create: vi.fn() },
  };
  return {
    tx, providerDelete: vi.fn(), assetDelete: vi.fn(),
    db: {
      ...tx,
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      ruleRevisionMedia: { count: vi.fn().mockResolvedValue(0) },
      newsRevisionMedia: { count: vi.fn().mockResolvedValue(0) },
      newsPost: { ...tx.newsPost, count: vi.fn().mockResolvedValue(0) },
      homepageSettings: { count: vi.fn().mockResolvedValue(1) },
    },
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks.db, mediaAsset: { delete: mocks.assetDelete } } }));
vi.mock("@/lib/cloudinary", () => ({ deleteCloudinaryAsset: mocks.providerDelete }));
vi.mock("@/lib/authz", () => ({ requirePermission: vi.fn().mockResolvedValue({ user: { id: "test-editor" } }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { deleteNewsAction, deleteRuleAction } from "@/app/actions/staff";

beforeEach(() => vi.clearAllMocks());
describe("Gemeinsam genutzte Bilder beim Löschen von Inhalten", () => {
  for (const kind of ["rule", "news"] as const) {
    it(`behält ein weiterhin auf der Startseite genutztes Bild nach ${kind}-Löschung`, async () => {
      const data = new FormData(); data.set(kind === "rule" ? "ruleId" : "postId", "content-to-delete");
      await (kind === "rule" ? deleteRuleAction : deleteNewsAction)(data);
      expect(kind === "rule" ? mocks.tx.rule.delete : mocks.tx.newsPost.delete).toHaveBeenCalledWith({ where: { id: "content-to-delete" } });
      expect(mocks.tx.auditLog.create).toHaveBeenCalled();
      expect(mocks.providerDelete).not.toHaveBeenCalled();
      expect(mocks.assetDelete).not.toHaveBeenCalled();
    });
  }
});
