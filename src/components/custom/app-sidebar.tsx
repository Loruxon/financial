"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutMockUser } from "@/modules/auth/actions";
import {
  getNavForUser,
  isNavGroup,
  type BadgeKey,
  type NavItem,
} from "@/modules/navigation/config";
import type { User } from "@/modules/users/types";
import { messages } from "@/messages/ru";

type AppSidebarProps = {
  user: User;
  badges: Record<BadgeKey, number>;
  organizationName: string | null;
};

export function AppSidebar({
  user,
  badges,
  organizationName,
}: AppSidebarProps) {
  const pathname = usePathname();
  const homeHref = user.kind === "client" ? "/client" : "/manager";
  // Иконки — React-компоненты, их нельзя передать как пропс с сервера на
  // клиент, поэтому структура меню вычисляется здесь же, из обычных данных user.
  const navItems: NavItem[] = getNavForUser(user);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={homeHref} />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold">
                FS
              </div>
              <span className="truncate font-semibold">Financial Systems</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) =>
              isNavGroup(item) ? (
                <NavGroupItem
                  key={item.title}
                  item={item}
                  pathname={pathname}
                />
              ) : (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.badgeKey && badges[item.badgeKey] > 0 ? (
                    <SidebarMenuBadge>{badges[item.badgeKey]}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} organizationName={organizationName} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavGroupItem({
  item,
  pathname,
}: {
  item: Extract<NavItem, { items: unknown }>;
  pathname: string;
}) {
  return (
    <Collapsible
      defaultOpen={item.items.some((sub) => pathname.startsWith(sub.href))}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.title} />}>
        <item.icon />
        <span>{item.title}</span>
        <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items.map((sub) => (
            <SidebarMenuSubItem key={sub.href}>
              <SidebarMenuSubButton
                isActive={pathname === sub.href}
                render={<Link href={sub.href} />}
              >
                <span>{sub.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavUser({
  user,
  organizationName,
}: {
  user: User;
  organizationName: string | null;
}) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {messages.users.kind[user.kind]}
                {organizationName ? ` · ${organizationName}` : ""}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{user.name}</span>
                <span className="text-muted-foreground text-xs">
                  {messages.users.kind[user.kind]}
                  {organizationName ? ` · ${organizationName}` : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/account" />}>
                <UserRound />
                {messages.account.title}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {messages.common.theme.light} / {messages.common.theme.dark}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun />
                {messages.common.theme.light}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                {messages.common.theme.dark}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor />
                {messages.common.theme.system}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <form action={signOutMockUser}>
              <DropdownMenuItem
                variant="destructive"
                render={<button type="submit" />}
              >
                <LogOut />
                {messages.auth.signOut}
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
