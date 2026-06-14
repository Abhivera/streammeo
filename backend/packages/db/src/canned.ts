import type { CannedResponse } from "./types.js";
import { getItem, newId, putItem, queryPk, deleteItem, type DbItem } from "./store.js";
import { workspacePk } from "./tickets.js";

type CannedItem = DbItem & CannedResponse & { entityType: "canned_response" };

export async function listCannedResponses(workspaceId: string): Promise<CannedResponse[]> {
  const items = await queryPk<CannedItem>(workspacePk(workspaceId), "CANNED#");
  return items
    .map((i) => ({ id: i.id, workspaceId: i.workspaceId, title: i.title, body: i.body }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function createCannedResponse(
  workspaceId: string,
  data: { title: string; body: string },
): Promise<CannedResponse> {
  const id = newId();
  const item: CannedResponse = { id, workspaceId, ...data };
  await putItem({
    pk: workspacePk(workspaceId),
    sk: `CANNED#${id}`,
    entityType: "canned_response",
    ...item,
  });
  return item;
}

export async function updateCannedResponse(
  workspaceId: string,
  id: string,
  patch: Partial<{ title: string; body: string }>,
): Promise<CannedResponse | null> {
  const existing = await getItem<CannedItem>(workspacePk(workspaceId), `CANNED#${id}`);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await putItem({ ...existing, ...updated });
  return { id: updated.id, workspaceId: updated.workspaceId, title: updated.title, body: updated.body };
}

export async function deleteCannedResponse(workspaceId: string, id: string): Promise<boolean> {
  const existing = await getItem<CannedItem>(workspacePk(workspaceId), `CANNED#${id}`);
  if (!existing) return false;
  await deleteItem(workspacePk(workspaceId), `CANNED#${id}`);
  return true;
}
