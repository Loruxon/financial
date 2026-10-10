import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { getCurrentUser } from "@/modules/auth/session";
import type { User } from "./types";

export async function listUsers(): Promise<User[]> {
  await requireManager("users");
  await mockLatency();
  return getStore().users;
}

export async function getCurrentUserProfile(): Promise<User | null> {
  return getCurrentUser();
}

/** Для шага 03: список всех активных пользователей для имитации входа. */
export async function listLoginableUsers(): Promise<User[]> {
  await mockLatency();
  return getStore().users.filter((u) => u.isActive);
}

/** Менеджеры, которых можно назначить исполнителем заявки. Доступ к разделу «Пользователи» не требуется. */
export async function listManagersForAssignment(): Promise<User[]> {
  await requireManager();
  await mockLatency();
  return getStore().users.filter((u) => u.kind === "manager" && u.isActive);
}

/** Имена пользователей для отображения (история статусов, авторы файлов). Не раскрывает прав и организаций. */
export async function listUserNames(): Promise<
  Pick<User, "id" | "name" | "kind">[]
> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");
  await mockLatency();
  return getStore().users.map((u) => ({
    id: u.id,
    name: u.name,
    kind: u.kind,
  }));
}
