import { useLocation } from "react-router-dom";
import { allNavItems } from "@/config/navigation";

export const usePageTitle = () => {
  const { pathname } = useLocation();
  return allNavItems.find(i => i.path === pathname)?.title || "Page";
};
