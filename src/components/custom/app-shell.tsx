import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/custom/app-sidebar";
import {
  BreadcrumbLabelProvider,
  Breadcrumbs,
} from "@/components/custom/breadcrumbs";
import { computeBadges } from "@/modules/navigation/badges";
import { collectBadgeKeys, getNavForUser } from "@/modules/navigation/config";
import { getOrganization } from "@/modules/organizations/queries";
import type { User } from "@/modules/users/types";

export async function AppShell({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const navItems = getNavForUser(user);
  const badges = await computeBadges(user, collectBadgeKeys(navItems));
  const organization = user.organizationId
    ? await getOrganization(user.organizationId)
    : undefined;

  return (
    <BreadcrumbLabelProvider>
      <SidebarProvider>
        <AppSidebar
          user={user}
          badges={badges}
          organizationName={organization?.name ?? null}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumbs />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6 pt-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbLabelProvider>
  );
}
