"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils";
import { Edit2, Trash2, UserX, UserCheck } from "lucide-react";
import type { User } from "@/types";

interface StaffTableProps {
  staff: User[];
  onEdit?: (user: User) => void;
  onToggleActive?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

const roleColors: Record<string, "default" | "secondary" | "destructive" | "success" | "outline"> = {
  ADMIN: "default",
  MANAGER: "success",
  KITCHEN: "secondary",
  CASHIER: "outline",
  WAITER: "secondary",
};

export function StaffTable({
  staff,
  onEdit,
  onToggleActive,
  onDelete,
}: StaffTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Staff</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.image ?? undefined} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={roleColors[member.role] ?? "secondary"}>
                {member.role}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={member.isActive ? "success" : "destructive"}
              >
                {member.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-gray-500">
              {formatDate(member.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(member)}
                    aria-label="Edit staff"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {onToggleActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleActive(member)}
                    aria-label={
                      member.isActive ? "Deactivate staff" : "Activate staff"
                    }
                  >
                    {member.isActive ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(member.id)}
                    aria-label="Delete staff"
                  >
                    <Trash2 className="h-4 w-4 text-danger-500" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
