import { cookies } from "next/headers";
import { getStore } from "@/mocks/store";
import type { User } from "@/modules/users/types";
import { MOCK_USER_COOKIE } from "./constants";

export { MOCK_USER_COOKIE };

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(MOCK_USER_COOKIE)?.value;
  if (!id) return null;
  const user = getStore().users.find((u) => u.id === id);
  if (!user || !user.isActive) return null;
  return user;
}
