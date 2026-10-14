"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { useTranslations } from "@/utils/translations";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";

interface CrumbSegment {
  label: string;
  href?: string;
}

const NON_NAVIGABLE_BREADCRUMB_PATHS = new Set([
  "/dashboard/receipts/preview",
]);

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useTranslations();

  const crumbs = useMemo<CrumbSegment[]>(() => {
    if (!pathname) {
      return [{ label: t("navigation.dashboard"), href: "/dashboard" }];
    }

                                   
    const parts = pathname
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean);

                                             
    const routeMap: Record<string, string> = {
      dashboard: "navigation.dashboard",
      members: "navigation.members",
      "billing-rules": "navigation.billingRules",
      "income-report": "navigation.incomeReport",
    };

                                
    const segments: CrumbSegment[] = [];

                                       
    segments.push({
      label: t("navigation.dashboard") || "Dashboard",
      href: "/dashboard",
    });

                                                
    let currentPath = "";
    for (const part of parts) {
      currentPath += `/${part}`;

                                                 
      if (part === "dashboard") {
        continue;
      }

                                                 
      const translationKey = routeMap[part];
      const label = translationKey ? (t(translationKey) || part) : part;

      segments.push({
        label,
        href: NON_NAVIGABLE_BREADCRUMB_PATHS.has(currentPath) ? undefined : currentPath,
      });
    }

    return segments;
  }, [pathname, t]);

                                                
  if (crumbs.length === 0) {
    return (
      <Breadcrumb className="w-full">
        <BreadcrumbList className="text-sm text-muted-foreground">
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-foreground">
              {t("navigation.dashboard") || "Dashboard"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb className="w-full">
      <BreadcrumbList className="text-sm text-muted-foreground">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const shouldShowAsLink = !isLast && Boolean(crumb.href);

          return (
            <React.Fragment key={`${crumb.href || crumb.label}-${idx}`}>
              <BreadcrumbItem>
                {shouldShowAsLink ? (
                  <BreadcrumbLink asChild>
                    {                                                                                        }
                    <Link href={crumb.href!} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-medium text-foreground">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
