"use client";

import { ChefHat, Clock, Utensils, CheckCheck } from "lucide-react";

interface KitchenStatsProps {
  stats: {
    activeCount: number;
    preparingCount: number;
    readyCount: number;
    completedToday: number;
    averagePrepTime: number;
  };
}

export function KitchenStats({ stats }: KitchenStatsProps) {
  const statItems = [
    {
      label: "Active",
      value: stats.activeCount,
      icon: ChefHat,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Preparing",
      value: stats.preparingCount,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      label: "Ready",
      value: stats.readyCount,
      icon: Utensils,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Completed",
      value: stats.completedToday,
      icon: CheckCheck,
      color: "text-gray-600",
      bg: "bg-gray-100",
    },
  ];

  return (
    <div className="flex gap-4">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"
        >
          <div className={`rounded-lg p-1.5 ${stat.bg}`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <div>
            <p className="text-lg font-bold leading-none tabular-nums">
              {stat.value}
            </p>
            <p className="text-[10px] text-gray-500">{stat.label}</p>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
        <div className="rounded-lg bg-purple-100 p-1.5">
          <Clock className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none tabular-nums">
            {stats.averagePrepTime}m
          </p>
          <p className="text-[10px] text-gray-500">Avg Prep</p>
        </div>
      </div>
    </div>
  );
}
