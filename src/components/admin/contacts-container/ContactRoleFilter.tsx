"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllContactRoles } from "@/actions/contactRole.actions";
import type { ContactRole } from "@/models/contact.model";

// Select cannot hold an empty-string value, so all-roles gets a sentinel
const ALL = "all";

type Props = {
  roleId?: string;
  onRoleChange: (roleId?: string) => void;
};

export function ContactRoleFilter({ roleId, onRoleChange }: Props) {
  const [roles, setRoles] = useState<ContactRole[]>([]);

  useEffect(() => {
    getAllContactRoles().then((res) => Array.isArray(res) && setRoles(res));
  }, []);

  return (
    <Select
      value={roleId ?? ALL}
      onValueChange={(v) => onRoleChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger aria-label="Filter by role" className="h-8 w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All roles</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
