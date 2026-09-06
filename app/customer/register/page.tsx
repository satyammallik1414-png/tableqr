"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeReturnUrl(value: string | null) {
  return value?.startsWith("/order/") || value?.startsWith("/menu/") ? value : "/";
}

function CustomerRegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnUrl = safeReturnUrl(params.get("callbackUrl"));
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2 || form.phone.trim().length < 10 || form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      toast.error("Enter valid details. Password needs 8 characters, one capital letter and one number."); return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/customer-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Registration failed");
      toast.success("Account created. Please sign in to view the menu.");
      router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Registration failed"); }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-4">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">SS</div><h1 className="mt-4 text-2xl font-bold">Create customer account</h1><p className="mt-1 text-sm text-slate-500">Register securely to open the scanned menu and place orders.</p></div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="customer-name">Name</Label><Input id="customer-name" autoComplete="name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="space-y-1.5"><Label htmlFor="customer-email">Email</Label><Input id="customer-email" type="email" autoComplete="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div className="space-y-1.5"><Label htmlFor="customer-phone">Phone</Label><Input id="customer-phone" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div className="space-y-1.5"><Label htmlFor="customer-password">Password</Label><div className="relative"><Input id="customer-password" type={showPassword?"text":"password"} autoComplete="new-password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-slate-500">{showPassword?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}</button></div><p className="text-xs text-slate-500">At least 8 characters, one capital letter and one number.</p></div>
        <Button className="w-full" disabled={loading}>{loading?"Creating account…":<><UserPlus className="mr-2 h-4 w-4"/>Create account</>}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already registered? <Link className="font-semibold text-slate-900" href={`/login?callbackUrl=${encodeURIComponent(returnUrl)}`}>Sign in</Link></p>
    </section>
  </main>;
}

export default function CustomerRegisterPage() { return <Suspense fallback={<div className="min-h-[100dvh] bg-slate-50"/>}><CustomerRegisterForm/></Suspense>; }
