import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BookOpen,
  Building2,
  Calculator,
  CreditCard,
  FileText,
  LayoutDashboard,
  Receipt,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ManagerSection, User } from "@/modules/users/types";
import { messages } from "@/messages/ru";

export type BadgeKey =
  "clientPaymentOrders" | "managerPaymentOrders" | "managerIncomingPayments";

export type NavLeaf = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Если указано — пункт виден только менеджеру с доступом к этому разделу. */
  section?: ManagerSection;
  badgeKey?: BadgeKey;
};

export type NavGroup = {
  title: string;
  icon: LucideIcon;
  items: NavLeaf[];
};

export type NavItem = NavLeaf | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

export const CLIENT_NAV: NavLeaf[] = [
  {
    title: messages.nav.client.overview,
    href: "/client",
    icon: LayoutDashboard,
  },
  {
    title: messages.nav.client.paymentOrders,
    href: "/client/payment-orders",
    icon: FileText,
    badgeKey: "clientPaymentOrders",
  },
  {
    title: messages.nav.client.beneficiaries,
    href: "/client/beneficiaries",
    icon: Users,
  },
  {
    title: messages.nav.client.statement,
    href: "/client/statement",
    icon: Receipt,
  },
];

export const MANAGER_NAV: NavItem[] = [
  {
    title: messages.nav.manager.overview,
    href: "/manager",
    icon: LayoutDashboard,
  },
  {
    title: messages.nav.manager.paymentOrders,
    href: "/manager/payment-orders",
    icon: FileText,
    section: "payment_orders",
    badgeKey: "managerPaymentOrders",
  },
  {
    title: messages.nav.manager.incomingPayments,
    href: "/manager/incoming-payments",
    icon: ArrowDownToLine,
    section: "incoming_payments",
    badgeKey: "managerIncomingPayments",
  },
  {
    title: messages.nav.manager.internalTransfers,
    href: "/manager/internal-transfers",
    icon: ArrowLeftRight,
    section: "internal_transfers",
  },
  {
    title: messages.nav.manager.outgoingPayments,
    href: "/manager/outgoing-payments",
    icon: ArrowUpFromLine,
    section: "outgoing_payments",
  },
  {
    title: messages.nav.manager.balances,
    href: "/manager/balances",
    icon: Wallet,
    section: "organization_balances",
  },
  {
    title: messages.nav.manager.ledger,
    href: "/manager/ledger",
    icon: BookOpen,
    section: "ledger",
  },
  {
    title: messages.nav.manager.settings,
    icon: Building2,
    items: [
      {
        title: messages.nav.manager.settingsOrganizations,
        href: "/manager/settings/organizations",
        icon: Building2,
        section: "reference_data",
      },
      {
        title: messages.nav.manager.settingsPayers,
        href: "/manager/settings/payers",
        icon: CreditCard,
        section: "reference_data",
      },
      {
        title: messages.nav.manager.settingsExecutionSchemes,
        href: "/manager/settings/execution-schemes",
        icon: Calculator,
        section: "reference_data",
      },
      {
        title: messages.nav.manager.settingsInternalAccounts,
        href: "/manager/settings/internal-accounts",
        icon: Wallet,
        section: "reference_data",
      },
      {
        title: messages.nav.manager.settingsSuppliers,
        href: "/manager/settings/suppliers",
        icon: Truck,
        section: "reference_data",
      },
      {
        title: messages.nav.manager.settingsUsers,
        href: "/manager/settings/users",
        icon: UserCog,
        section: "users",
      },
    ],
  },
];

export type BreadcrumbEntry = { title: string; groupTitle?: string };

/**
 * Для хлебных крошек: href → заголовок (и заголовок родительской группы меню,
 * если пункт лежит внутри неё), по всем известным статическим маршрутам.
 */
export function buildBreadcrumbTitles(): Map<string, BreadcrumbEntry> {
  const map = new Map<string, BreadcrumbEntry>();
  map.set("/client", { title: messages.nav.client.overview });
  map.set("/manager", { title: messages.nav.manager.overview });
  map.set("/account", { title: messages.nav.manager.account });

  for (const item of CLIENT_NAV) {
    map.set(item.href, { title: item.title });
  }
  for (const item of MANAGER_NAV) {
    if (isNavGroup(item)) {
      for (const sub of item.items) {
        map.set(sub.href, { title: sub.title, groupTitle: item.title });
      }
    } else {
      map.set(item.href, { title: item.title });
    }
  }
  return map;
}

function hasManagerSection(user: User, section?: ManagerSection): boolean {
  if (!section) return true;
  return user.hasFullManagerAccess || user.managerSections.includes(section);
}

/** Пункты меню, недоступные пользователю по разделам, не возвращаются вовсе. */
export function getNavForUser(user: User): NavItem[] {
  if (user.kind === "client") return CLIENT_NAV;

  const items: NavItem[] = [];
  for (const item of MANAGER_NAV) {
    if (isNavGroup(item)) {
      const visibleSubItems = item.items.filter((sub) =>
        hasManagerSection(user, sub.section),
      );
      if (visibleSubItems.length > 0)
        items.push({ ...item, items: visibleSubItems });
    } else if (hasManagerSection(user, item.section)) {
      items.push(item);
    }
  }
  return items;
}

export function collectBadgeKeys(navItems: NavItem[]): Set<BadgeKey> {
  const keys = new Set<BadgeKey>();
  for (const item of navItems) {
    if (!isNavGroup(item) && item.badgeKey) keys.add(item.badgeKey);
  }
  return keys;
}
