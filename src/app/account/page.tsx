import { redirect } from "next/navigation";
import { AppShell } from "@/components/custom/app-shell";
import { PageHeader } from "@/components/custom/page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/modules/auth/session";
import { messages } from "@/messages/ru";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={user}>
      <PageHeader title={messages.account.title} />
      <Card>
        <CardHeader>
          <CardTitle>{messages.account.password.title}</CardTitle>
          <CardDescription>
            {messages.account.password.description}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{messages.account.twoFactor.title}</CardTitle>
          <CardDescription>
            {messages.account.twoFactor.description}
          </CardDescription>
        </CardHeader>
      </Card>
    </AppShell>
  );
}
