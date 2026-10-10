import { notFound } from "next/navigation";
import { getCurrentUser } from "./session";
import type { ManagerSection, User } from "@/modules/users/types";

/** Единственное место, где проверяется, что текущий пользователь — клиент. */
export async function requireClient(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.kind !== "client") {
    throw new Error("Доступ только для клиентов");
  }
  return user;
}

/**
 * Единственное место, где проверяется, что текущий пользователь — менеджер
 * с доступом к разделу `section` (если он указан).
 */
export async function requireManager(section?: ManagerSection): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.kind !== "manager") {
    throw new Error("Доступ только для менеджеров");
  }
  if (
    section &&
    !user.hasFullManagerAccess &&
    !user.managerSections.includes(section)
  ) {
    throw new Error(`Нет доступа к разделу «${section}»`);
  }
  return user;
}

/**
 * Для layout'ов и страниц `/client/*`: неверная роль — 404, а не редирект
 * (чтобы не раскрывать структуру чужого раздела).
 */
export async function requireClientOrNotFound(): Promise<User> {
  try {
    return await requireClient();
  } catch {
    notFound();
  }
}

/** Для layout'а `/manager/*` и страниц разделов внутри него: неверная роль или отсутствие прав на раздел — 404. */
export async function requireManagerOrNotFound(
  section?: ManagerSection,
): Promise<User> {
  try {
    return await requireManager(section);
  } catch {
    notFound();
  }
}
