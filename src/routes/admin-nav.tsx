"use client";
import { useLingui } from "@lingui/react/macro";
import { useLocation } from "react-router";
import { TabLinks } from "../ui/tab-links";
import { sectionOf } from "./admin-section";

// Client-side so aria-current follows client navigations, which don't re-render the admin layout.
export const AdminNav = () => {
  const { t } = useLingui();
  const section = sectionOf(useLocation().pathname);
  const tabs = [
    { href: "/admin", label: t({ id: "admin.nav.collections", message: "Collections" }) },
    { href: "/admin/export", label: t({ id: "admin.nav.export", message: "Export" }) },
    { href: "/admin/settings", label: t({ id: "admin.nav.settings", message: "Settings" }) },
  ].map((tab) => ({ ...tab, current: tab.href === section }));
  return <TabLinks variant="nav" label={t({ id: "admin.nav.label", message: "Admin sections" })} tabs={tabs} />;
};
