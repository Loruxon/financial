"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_USER_COOKIE } from "./session";

/**
 * Этап прототипа: вход выбором тестового пользователя. Поля логина и пароля
 * на странице входа пока не используются.
 */
export async function signInAsMockUser(formData: FormData): Promise<void> {
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    throw new Error("Не указан пользователь");
  }
  const cookieStore = await cookies();
  cookieStore.set(MOCK_USER_COOKIE, userId, { path: "/" });
  redirect("/");
}

export async function signOutMockUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MOCK_USER_COOKIE);
  redirect("/login");
}
