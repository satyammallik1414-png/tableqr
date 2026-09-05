"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Droplets, Receipt, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import toast from "react-hot-toast";

interface WaiterRequestProps {
  tableId: string;
  branchId: string;
}

export function WaiterRequest({ tableId, branchId }: WaiterRequestProps) {
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { emit } = useSocket({ branchId });

  const handleRequest = (type: string) => {
    emit(type, { tableId, branchId, timestamp: new Date().toISOString() });
    setLastAction(type);
    toast.success(
      type === "waiter:called"
        ? "Waiter has been called!"
        : type === "water:requested"
          ? "Water has been requested!"
          : "Bill has been requested!",
    );
    setTimeout(() => {
      setLastAction(null);
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      {/* FAB */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <button
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white transition-all duration-200 hover:bg-gray-800 hover:scale-105 active:scale-95"
          aria-label="Request assistance"
        >
          <Bell className="h-6 w-6" />
        </button>
      </motion.div>

      {/* Action Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-lg"
            >
              <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-300" />
              <h3 className="mb-6 text-center font-heading text-xl font-bold">
                Need Assistance?
              </h3>

              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    id: "waiter:called",
                    icon: Bell,
                    label: "Call Waiter",
                    color: "bg-gray-100",
                  },
                  {
                    id: "water:requested",
                    icon: Droplets,
                    label: "Request Water",
                    color: "bg-gray-100",
                  },
                  {
                    id: "bill:requested",
                    icon: Receipt,
                    label: "Request Bill",
                    color: "bg-gray-100",
                  },
                ].map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleRequest(action.id)}
                    disabled={lastAction === action.id}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl ${action.color}`}
                    >
                      {lastAction === action.id ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <action.icon className="h-6 w-6" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                className="mt-6 w-full"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
