import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, UserCheck } from "lucide-react";
import type { AppointmentAssignmentTab, AppointmentTabCounts } from "../types";
import { ASSIGNMENT_TAB_LABELS } from "../types";
import { cn } from "@/lib/utils";

interface AppointmentsTabsProps {
  activeTab: AppointmentAssignmentTab;
  onTabChange: (tab: AppointmentAssignmentTab) => void;
  counts?: AppointmentTabCounts | null;
  isLoading?: boolean;
}

export function AppointmentsTabs({
  activeTab,
  onTabChange,
  counts,
  isLoading,
}: AppointmentsTabsProps) {
  const tabs = [
    {
      value: "pending_assignment" as const,
      icon: Phone,
      count: counts?.pending_assignment,
    },
    {
      value: "assigned" as const,
      icon: UserCheck,
      count: counts?.assigned,
    },
  ];

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as AppointmentAssignmentTab)}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
            <tab.icon className="h-4 w-4" />
            {ASSIGNMENT_TAB_LABELS[tab.value]}
            {!isLoading && tab.count !== undefined && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1 text-xs",
                  tab.value === "pending_assignment" &&
                    tab.count > 0 &&
                    "bg-orange-100 text-orange-800"
                )}
              >
                {tab.count}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
