"use client";

import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  CookingPot,
  Receipt,
  BarChart3,
  Shield,
  Smartphone,
  Star,
  Check,
} from "lucide-react";
import {
  APP_NAME,
  APP_DESCRIPTION,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/shared/Navbar";

const features = [
  {
    icon: QrCode,
    title: "QR Menu Ordering",
    description: "Customers scan QR code, browse menu, and order from their phone. No app download needed.",
  },
  {
    icon: CookingPot,
    title: "Kitchen Display System",
    description: "Real-time order tickets with timers. Color-coded by wait time. Sound notifications.",
  },
  {
    icon: Receipt,
    title: "Smart Billing",
    description: "Auto-calculate GST, split bills, multiple payment modes. Generate invoices instantly.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Revenue trends, top items, peak hours, customer insights. Export PDF/Excel reports.",
  },
  {
    icon: Shield,
    title: "Multi-Branch Management",
    description: "Manage multiple restaurants and branches from a single dashboard. Role-based access.",
  },
  {
    icon: Smartphone,
    title: "Real-Time Sync",
    description: "Orders sync instantly across kitchen, counter, and customer devices via WebSockets.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: 0,
    period: "free",
    description: "Perfect for small cafes testing the waters",
    features: [
      "Up to 10 tables",
      "Single branch",
      "QR menu ordering",
      "Basic billing",
      "Email support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Growth",
    price: 2999,
    period: "/month",
    description: "For growing restaurants that need more power",
    features: [
      "Up to 50 tables",
      "Up to 3 branches",
      "Kitchen display system",
      "Advanced analytics",
      "Staff management",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: 9999,
    period: "/month",
    description: "For large chains with advanced requirements",
    features: [
      "Unlimited tables",
      "Unlimited branches",
      "Custom integrations",
      "Dedicated account manager",
      "API access",
      "SLA guarantee",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Owner, Spice Garden Restaurant",
    content: "SmartServe AI transformed our business. Order processing time reduced by 60%. Our customers love the QR ordering!",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Manager, Brew & Bites Cafe",
    content: "The kitchen display system is a game-changer. No more lost chits or miscommunication between staff.",
    rating: 5,
  },
  {
    name: "Amit Patel",
    role: "Owner, Fusion House",
    content: "Analytics helped us identify our best-selling items and peak hours. Revenue increased by 35% in 3 months.",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="px-4 pb-20 pt-20 md:pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-500">
              <Star className="h-4 w-4" />
              Trusted by 500+ restaurants
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
              Transform Your Restaurant with AI-Powered Management
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
              {APP_DESCRIPTION}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="group text-base">
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#features">See How It Works</Link>
              </Button>
            </div>

            <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
              {[
                { value: 500, label: "Restaurants", suffix: "" },
                { value: 50, label: "Cities", suffix: "+" },
                { value: 2, label: "Orders Served", suffix: "M+" },
                { value: 4.9, label: "Rating", suffix: "" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}+{stat.suffix}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-gray-200 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Everything You Need to Run Smarter
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Complete restaurant management platform from table to billing
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <feature.icon className="h-6 w-6 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-gray-200 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Start free, scale as you grow. No hidden fees.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {pricing.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border p-8 ${
                    tier.popular
                      ? "border-gray-900 bg-white"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-full border border-gray-900 px-4 py-1 text-xs font-semibold text-gray-900">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {tier.description}
                    </p>
                    <div className="mt-6">
                      <span className="text-4xl font-bold text-gray-900">
                        {tier.price === 0
                          ? "Free"
                          : formatCurrency(tier.price)}
                      </span>
                      {tier.price > 0 && (
                        <span className="text-sm text-gray-500">
                          {tier.period}
                        </span>
                      )}
                    </div>
                    <ul className="mt-8 space-y-3">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-500">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-700" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className="mt-8 w-full"
                      variant={tier.popular ? "default" : "outline"}
                    >
                      <Link href="/register">{tier.cta}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-t border-gray-200 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Loved by Restaurant Owners
              </h2>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-gray-300 text-gray-300"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-gray-200 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-200 px-4 py-24">
          <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Ready to Transform Your Restaurant?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              Join 500+ restaurants already using SmartServe AI. Start your free
              trial today. No credit card required.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8"
            >
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-900">
                  SS
                </div>
                <span className="font-bold text-gray-900">{APP_NAME}</span>
              </div>
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
