"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, LayoutDashboard, Menu, Settings, Users, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
const admin = [["/admin/dashboard","Home",LayoutDashboard],["/admin/orders","Orders",ClipboardList],["/admin/menu","Menu",Utensils],["/admin/settings","More",Menu]] as const;
const superAdmin = [["/super-admin","Home",LayoutDashboard],["/super-admin/businesses","Business",Building2],["/super-admin/users","Users",Users],["/super-admin/settings","More",Settings]] as const;
export function MobileBottomNav({kind}:{kind:"admin"|"super-admin"}) { const pathname=usePathname(); const items=kind==="admin"?admin:superAdmin; return <nav className="mobile-bottom-nav" aria-label="Primary navigation">{items.map(([href,label,Icon])=>{const active=href==="/super-admin"?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={cn(active&&"active")} aria-current={active?"page":undefined}><Icon/><span>{label}</span></Link>})}</nav> }
