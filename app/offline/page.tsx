import Link from "next/link";
import { CloudOff } from "lucide-react";

export default function OfflinePage() {
  return <main className="offline-page"><CloudOff /><h1>You’re offline</h1><p>Your cart is safe on this device. Reconnect before submitting an order or payment.</p><Link href="/">Try again</Link></main>;
}
