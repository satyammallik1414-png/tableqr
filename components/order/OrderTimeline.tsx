"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  Utensils,
  XCircle,
  PhoneCall,
  AlertTriangle,
  Timer,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderTimelineProps {
  status: string;
  submittedAt: string | Date;
  acceptedAt?: string | Date | null;
  estimatedReadyMinutes?: number | null;
  estimatedReadyAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  cancellationReason?: string | null;
  restaurantPhone?: string | null;
  restaurantName?: string | null;
  isPendingTimeout?: boolean;
  elapsedMinutes?: number;
}

export function OrderTimeline({
  status,
  submittedAt,
  acceptedAt,
  estimatedReadyMinutes,
  estimatedReadyAt,
  cancelledAt,
  cancellationReason,
  restaurantPhone,
  restaurantName,
  isPendingTimeout = false,
  elapsedMinutes = 0,
}: OrderTimelineProps) {
  const [now, setNow] = useState(Date.now());

  // 1-second live countdown timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const readyTimestamp = estimatedReadyAt ? new Date(estimatedReadyAt).getTime() : null;

  const acceptedTimestamp = acceptedAt ? new Date(acceptedAt).getTime() : null;

  const secondsRemaining =
    readyTimestamp !== null ? Math.max(0, Math.floor((readyTimestamp - now) / 1000)) : null;

  const isTimeCompleted = readyTimestamp !== null && secondsRemaining === 0;
  const isCancelled = status === "CANCELLED";

  // Calculate percentage progress of cooking time
  let progressPercent = 0;
  if (readyTimestamp && acceptedTimestamp && readyTimestamp > acceptedTimestamp) {
    const totalDuration = readyTimestamp - acceptedTimestamp;
    const elapsed = now - acceptedTimestamp;
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  } else if (isTimeCompleted) {
    progressPercent = 100;
  }

  // Pending -> preparation countdown -> order completed.
  const getStepIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case "PENDING":
        return 0;
      case "ACCEPTED":
        return 1;
      case "RECEIVED":
      case "PREPARING":
        return isTimeCompleted ? 3 : 2;
      case "READY":
      case "SERVED":
        return 3;
      case "COMPLETED":
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  const steps = [
    {
      id: "PENDING",
      label: "Pending",
      subtext: "Waiting for restaurant confirmation",
      icon: Clock,
    },
    {
      id: "ACCEPTED",
      label: "Accepted & Payment",
      subtext: status === "ACCEPTED" ? "Please complete payment to start preparation" : "Payment confirmed before cooking starts",
      icon: CreditCard,
    },
    {
      id: "PREPARING",
      label: "Preparing (Preparation Time)",
      subtext:
        (status === "PREPARING" || status === "RECEIVED") && !isTimeCompleted
          ? secondsRemaining !== null
            ? `Preparation in progress • ${Math.floor(secondsRemaining / 60)}m ${String(
                secondsRemaining % 60
              ).padStart(2, "0")}s remaining (${estimatedReadyMinutes || 15} mins allocated)`
            : estimatedReadyMinutes
            ? `Preparation time: ${estimatedReadyMinutes} mins`
            : "Kitchen is preparing your order"
          : isTimeCompleted
          ? `Allocated preparation time (${estimatedReadyMinutes || 15} mins) completed`
          : estimatedReadyMinutes
          ? `Allocated preparation time: ${estimatedReadyMinutes} mins`
          : "Kitchen preparing your meal",
      icon: ChefHat,
    },
    {
      id: "COMPLETED",
      label: "Order Completed",
      subtext:
        isTimeCompleted || status === "READY" || status === "SERVED" || status === "COMPLETED"
          ? "The preparation countdown has finished and your order is complete."
          : "Completes automatically when the countdown finishes",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Cancelled State Banner */}
      {isCancelled && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-xs">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold text-red-800">Order Cancelled</h4>
              <p className="text-xs text-red-700">
                {cancellationReason
                  ? `Reason: ${cancellationReason}`
                  : "Your order was cancelled by the restaurant."}
              </p>
              {cancelledAt && (
                <p className="text-[11px] text-red-500">
                  Cancelled at{" "}
                  {new Date(cancelledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {restaurantPhone && (
                <div className="pt-2">
                  <a href={`tel:${restaurantPhone}`}>
                    <Button size="sm" variant="destructive" className="gap-1.5 text-xs shadow-xs">
                      <PhoneCall className="h-3.5 w-3.5" />
                      Call Restaurant ({restaurantPhone})
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10-Minute Timeout Warning Banner */}
      {isPendingTimeout && !isCancelled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Pending Confirmation Delay
              </h4>
              <p className="text-xs text-amber-700">
                It has been over {elapsedMinutes} minutes since submission. The restaurant has not confirmed your ticket yet.
              </p>
              {restaurantPhone && (
                <div className="pt-1.5">
                  <a href={`tel:${restaurantPhone}`}>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs">
                      <PhoneCall className="h-3.5 w-3.5" />
                      Call Restaurant ({restaurantPhone})
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Cooking Status Banner */}
      {!isCancelled && (
        <>
          {status === "PENDING" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-xs animate-pulse shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Waiting for Restaurant Confirmation</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your order is pending. The restaurant will accept it shortly and assign a kitchen cooking time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(status === "PREPARING" || status === "RECEIVED") && (
            <div
              className={`rounded-2xl border p-4 shadow-xs transition-all ${
                isTimeCompleted
                  ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                  : "bg-blue-50/80 border-blue-200 text-blue-950"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-bold shadow-xs shrink-0 ${
                      isTimeCompleted ? "bg-emerald-600" : "bg-blue-600 animate-pulse"
                    }`}
                  >
                    {isTimeCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <ChefHat className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">
                      {isTimeCompleted
                        ? "Your Order is Ready!"
                        : "Preparing Your Order"}
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5">
                      {isTimeCompleted
                        ? "Preparation time has completed! Your order is hot, fresh, and ready."
                        : `Restaurant accepted your order. Kitchen allocated ${
                            estimatedReadyMinutes || 15
                          } minutes preparation time.`}
                    </p>
                  </div>
                </div>

                {!isTimeCompleted && secondsRemaining !== null && (
                  <div className="text-right shrink-0">
                    <div className="text-xl font-mono font-black text-blue-900 tracking-tight">
                      {Math.floor(secondsRemaining / 60)}:
                      {String(secondsRemaining % 60).padStart(2, "0")}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center justify-end gap-1">
                      <Timer className="h-2.5 w-2.5" /> Remaining
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {!isTimeCompleted && readyTimestamp && (
                <div className="mt-3.5 space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full bg-blue-600 transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-blue-700 px-0.5">
                    <span>Started {acceptedAt ? new Date(acceptedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}</span>
                    <span>Ready ~{new Date(readyTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {(status === "READY" || status === "SERVED") && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Your Order is Ready!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Preparation time has completed! Your order is hot, fresh, and ready.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "COMPLETED" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs"><CheckCircle2 className="h-5 w-5" /></div>
                <div><h4 className="text-sm font-bold text-emerald-950">Order Completed</h4><p className="mt-0.5 text-xs text-emerald-700">The preparation countdown has finished successfully.</p></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Normal Timeline Steps */}
      {!isCancelled && (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-7 pt-2">
          {steps.map((step, idx) => {
            const isCompleted = currentIndex > idx;
            const isCurrent = currentIndex === idx;
            const isSuccessfulCurrent = isCurrent && step.id === "COMPLETED";
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="relative group">
                {/* Node Icon */}
                <div
                  className={`absolute -left-[31px] sm:-left-[35px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted || isSuccessfulCurrent
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100"
                      : isCurrent
                      ? "border-slate-900 bg-white text-slate-900 ring-4 ring-blue-100 font-bold"
                      : "border-slate-300 bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted || isSuccessfulCurrent ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="pt-0.5">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-bold ${
                        isSuccessfulCurrent
                          ? "text-emerald-700 font-extrabold"
                          : isCurrent
                          ? "text-slate-900"
                          : isCompleted
                          ? "text-emerald-700"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && (
                      <Badge
                        className={`${
                          isSuccessfulCurrent
                            ? "bg-emerald-600 text-white"
                            : "bg-blue-600 text-white"
                        } text-[10px] px-2 py-0.5`}
                      >
                        {step.id === "COMPLETED" ? "Complete" : "Current Status"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{step.subtext}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
