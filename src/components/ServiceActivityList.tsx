import React from "react";
import { BadgeCheck, Clock3, ShieldCheck } from "lucide-react";

type ActivityStatus = "success" | "done" | "pending";

type ActivityItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  status: ActivityStatus;
};

function icon(status: ActivityStatus) {
  if (status === "success") return <BadgeCheck className="h-4 w-4" />;
  if (status === "done") return <ShieldCheck className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

function badgeClass(status: ActivityStatus) {
  if (status === "success") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
  if (status === "done") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.1)]";
  return "bg-amber-500/10 text-amber-400 border-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.1)]";
}

export function ServiceActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#0F172A]/40 px-5 py-4 transition-all hover:bg-slate-800/40 hover:border-white/10"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-white">
                <div className="shrink-0 text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  {icon(item.status)}
                </div>
                <h4 className="text-[13px] font-black tracking-tight">{item.title}</h4>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 font-bold leading-relaxed opacity-70 group-hover:opacity-90 transition-opacity">
                {item.desc}
              </p>
            </div>

            <span
              className={[
                "shrink-0 rounded-full border px-3 py-1 text-[10px] font-black tracking-wider uppercase leading-none",
                badgeClass(item.status),
              ].join(" ")}
            >
              {item.time}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
