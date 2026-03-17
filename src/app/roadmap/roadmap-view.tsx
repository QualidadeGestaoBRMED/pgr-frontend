"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  BriefcaseMedical,
  Check,
  ClipboardCheck,
  FileWarning,
  HeartPulse,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Siren,
  Stethoscope,
  Volume2,
  Waves,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { type RoadmapItem, type RoadmapStatus, roadmapItems } from "./data";

const BrainScene = dynamic(() => import("./brain-scene").then((mod) => mod.BrainScene), {
  ssr: false,
});

const gradientStyle = {
  backgroundImage:
    "linear-gradient(110deg, #193b4f 0%, #007891 45%, #7ebfcc 70%, #193b4f 100%)",
};

const statusMeta: Record<
  RoadmapStatus,
  {
    label: string;
    icon: typeof Check;
    orbClassName: string;
    toneClassName: string;
  }
> = {
  done: {
    label: "Concluído",
    icon: Check,
    orbClassName:
      "border-emerald-300/80 bg-emerald-400/12 text-emerald-600 shadow-[0_0_42px_rgba(16,185,129,0.2)]",
    toneClassName: "text-emerald-700",
  },
  "in-progress": {
    label: "Em andamento",
    icon: Activity,
    orbClassName:
      "border-cyan-300/80 bg-cyan-400/12 text-cyan-700 shadow-[0_0_52px_rgba(6,182,212,0.28)]",
    toneClassName: "text-cyan-700",
  },
  todo: {
    label: "Próximo passo",
    icon: Lock,
    orbClassName:
      "border-slate-300/80 bg-white/70 text-slate-500 shadow-[0_0_26px_rgba(15,23,42,0.08)]",
    toneClassName: "text-slate-500",
  },
};

const itemIcons: Record<string, typeof ShieldCheck> = {
  pgr: ShieldCheck,
  pcmso: Stethoscope,
  ltcat: ShieldAlert,
  aet: Waves,
  lip: FileWarning,
  ppp: ClipboardCheck,
  aso: HeartPulse,
  ppr: BriefcaseMedical,
  pca: Volume2,
  cat: Siren,
  os: ArrowRight,
  cipa: ShieldPlus,
  ppe: Activity,
};

type TimelinePoint = { x: number; y: number };
type IntelligenceNode = {
  id: string;
  label: string;
  lineX: number;
  lineY: number;
  pillX: number;
  pillY: number;
};
const INTELLIGENCE_CENTER = { x: 50, y: 54.8 };

function formatRoadmapDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })
    .format(date)
    .replace(".", "");
}

function buildIntelligenceNodes(items: RoadmapItem[]): IntelligenceNode[] {
  const layoutById: Record<string, Omit<IntelligenceNode, "id" | "label">> = {
    pgr: { lineX: 50, lineY: 16, pillX: 44, pillY: 0.5 },
    pcmso: { lineX: 65, lineY: 18, pillX: 60, pillY: 3.5 },
    ltcat: { lineX: 79, lineY: 31, pillX: 78, pillY: 20 },
    aet: { lineX: 87, lineY: 44, pillX: 88, pillY: 34 },
    lip: { lineX: 84, lineY: 58, pillX: 87, pillY: 52 },
    ppp: { lineX: 75, lineY: 72, pillX: 77, pillY: 70 },
    aso: { lineX: 63, lineY: 82, pillX: 63, pillY: 84 },
    ppr: { lineX: 50, lineY: 86, pillX: 44, pillY: 90 },
    pca: { lineX: 31, lineY: 81, pillX: 22.5, pillY: 84 },
    cat: { lineX: 23, lineY: 71, pillX: 9, pillY: 72.5 },
    os: { lineX: 14, lineY: 54, pillX: 0.5, pillY: 48.5 },
    cipa: { lineX: 16, lineY: 32, pillX: 3, pillY: 22.5 },
    ppe: { lineX: 35, lineY: 18, pillX: 28, pillY: 3.5 },
  };

  return items.map((item) => ({
    id: item.id,
    label: item.sigla,
    lineX: layoutById[item.id]?.lineX ?? INTELLIGENCE_CENTER.x,
    lineY: layoutById[item.id]?.lineY ?? INTELLIGENCE_CENTER.y,
    pillX: layoutById[item.id]?.pillX ?? INTELLIGENCE_CENTER.x,
    pillY: layoutById[item.id]?.pillY ?? INTELLIGENCE_CENTER.y,
  }));
}


function buildDesktopPath(items: RoadmapItem[]) {
  const topPadding = 112;
  const rowHeight = 232;
  const points: TimelinePoint[] = items.map((_, index) => ({
    x: index % 2 === 0 ? 33 : 67,
    y: topPadding + index * rowHeight,
  }));

  const totalHeight = topPadding * 2 + (items.length - 1) * rowHeight;
  const [firstPoint, ...rest] = points;

  let d = `M 50 42 C 50 86 ${firstPoint.x} 54 ${firstPoint.x} ${firstPoint.y}`;

  rest.forEach((point, index) => {
    const previous = points[index];
    const controlY = (previous.y + point.y) / 2;
    d += ` C ${previous.x} ${controlY} ${point.x} ${controlY} ${point.x} ${point.y}`;
  });

  return { d, totalHeight, points };
}

function buildMobilePath(items: RoadmapItem[]) {
  const topPadding = 86;
  const rowHeight = 198;
  const points: TimelinePoint[] = items.map((_, index) => ({
    x: 14,
    y: topPadding + index * rowHeight,
  }));
  const totalHeight = topPadding * 2 + (items.length - 1) * rowHeight;
  const d = `M 14 28 C 14 56 14 58 14 ${points[points.length - 1]?.y ?? topPadding}`;

  return { d, totalHeight, points };
}

function getProgressPercent(items: RoadmapItem[]) {
  return Math.round(
    (items.reduce((accumulator, item) => {
      if (item.status === "done") return accumulator + 1;
      if (item.status === "in-progress") return accumulator + 0.6;
      return accumulator;
    }, 0) /
      items.length) *
      100
  );
}

function getCurrentDoneItem(items: RoadmapItem[]) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.status === "done") {
      return items[index];
    }
  }

  return items[0];
}

function TimelineDesktop({ items }: { items: RoadmapItem[] }) {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.92", "end 0.16"],
  });

  const { d, totalHeight } = useMemo(() => buildDesktopPath(items), [items]);
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 46,
    damping: 24,
    mass: 1.25,
  });
  const riverFill = useTransform(smoothProgress, [0, 0.1, 0.55, 1], [0, 0.02, 0.5, 1]);
  const haloY = useTransform(smoothProgress, [0, 1], [0, -96]);

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <svg
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="roadmap-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#193b4f" />
            <stop offset="45%" stopColor="#007891" />
            <stop offset="70%" stopColor="#7ebfcc" />
            <stop offset="100%" stopColor="#193b4f" />
          </linearGradient>
          <filter id="roadmap-line-glow">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="roadmap-line-shimmer">
            <feGaussianBlur stdDeviation="1.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={d} stroke="rgba(25,59,79,0.1)" strokeWidth="1.6" fill="none" />
        <path d={d} stroke="rgba(255,255,255,0.3)" strokeWidth="5.2" strokeLinecap="round" fill="none" />
        <motion.path
          d={d}
          stroke="rgba(0,120,145,0.22)"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
          filter="url(#roadmap-line-glow)"
          style={{ pathLength: riverFill }}
          animate={prefersReducedMotion ? undefined : { opacity: [0.4, 0.78, 0.4] }}
          transition={prefersReducedMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d={d}
          stroke="url(#roadmap-line-gradient)"
          strokeWidth="4.4"
          strokeLinecap="round"
          fill="none"
          filter="url(#roadmap-line-glow)"
          style={{ pathLength: riverFill }}
        />
        <motion.path
          d={d}
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="9.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#roadmap-line-shimmer)"
          strokeDasharray="0.045 0.18"
          style={{ pathLength: riverFill }}
          animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -0.6], opacity: [0.4, 0.95, 0.4] }}
          transition={prefersReducedMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      <motion.div
        className="pointer-events-none absolute left-1/2 top-0 h-full w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,120,145,0.18)_0%,rgba(0,120,145,0)_70%)] blur-3xl"
        style={{ y: haloY }}
        aria-hidden
      />

      <div className="relative z-10">
        {items.map((item, index) => (
          <RoadmapRow
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            progress={smoothProgress}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineMobile({ items }: { items: RoadmapItem[] }) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.94", "end 0.16"],
  });

  const { d, totalHeight } = useMemo(() => buildMobilePath(items), [items]);
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 44,
    damping: 24,
    mass: 1.2,
  });
  const riverFill = useTransform(smoothProgress, [0, 0.1, 0.55, 1], [0, 0.02, 0.5, 1]);

  return (
    <div ref={containerRef} className="relative md:hidden">
      <svg
        viewBox={`0 0 28 ${totalHeight}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-5 top-8 h-[calc(100%-4rem)] w-7 overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="roadmap-line-gradient-mobile" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#193b4f" />
            <stop offset="45%" stopColor="#007891" />
            <stop offset="70%" stopColor="#7ebfcc" />
            <stop offset="100%" stopColor="#193b4f" />
          </linearGradient>
        </defs>

        <path d={d} stroke="rgba(25,59,79,0.1)" strokeWidth="1.8" fill="none" />
        <path d={d} stroke="rgba(255,255,255,0.34)" strokeWidth="5.6" strokeLinecap="round" fill="none" />
        <motion.path
          d={d}
          stroke="rgba(0,120,145,0.22)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          style={{ pathLength: riverFill }}
          animate={prefersReducedMotion ? undefined : { opacity: [0.4, 0.78, 0.4] }}
          transition={prefersReducedMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d={d}
          stroke="url(#roadmap-line-gradient-mobile)"
          strokeWidth="4.2"
          strokeLinecap="round"
          fill="none"
          style={{ pathLength: riverFill }}
        />
        <motion.path
          d={d}
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="8.6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="0.05 0.18"
          style={{ pathLength: riverFill }}
          animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -0.56], opacity: [0.4, 0.95, 0.4] }}
          transition={prefersReducedMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      <div className="relative z-10 space-y-8">
        {items.map((item, index) => (
          <RoadmapRowMobile
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            progress={smoothProgress}
          />
        ))}
      </div>
    </div>
  );
}

function RoadmapRow({
  item,
  index,
  total,
  progress,
}: {
  item: RoadmapItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const isLeft = index % 2 === 0;
  const activationStart = total <= 1 ? 0 : Math.max(0, index / total - 0.03);
  const activationEnd = total <= 1 ? 1 : Math.min(1, index / total + 0.1);
  const highlightProgress = useTransform(progress, [activationStart, activationEnd], [0, 1]);

  return (
    <div className="grid min-h-[232px] grid-cols-[1fr_112px_1fr] items-center">
      <div className={cn("flex", isLeft ? "justify-end pr-10" : "opacity-0")}>
        {isLeft ? <ProductCard item={item} align="right" highlightProgress={highlightProgress} /> : null}
      </div>
      <div />
      <div className={cn("flex", !isLeft ? "justify-start pl-10" : "opacity-0")}>
        {!isLeft ? <ProductCard item={item} align="left" highlightProgress={highlightProgress} /> : null}
      </div>
    </div>
  );
}

function RoadmapRowMobile({
  item,
  index,
  total,
  progress,
}: {
  item: RoadmapItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const activationStart = total <= 1 ? 0 : Math.max(0, index / total - 0.035);
  const activationEnd = total <= 1 ? 1 : Math.min(1, index / total + 0.12);
  const highlightProgress = useTransform(progress, [activationStart, activationEnd], [0, 1]);

  return (
    <div className="relative pl-16">
      <ProductCard item={item} align="left" compact highlightProgress={highlightProgress} />
    </div>
  );
}

function ProductCard({
  item,
  align,
  compact = false,
  highlightProgress,
}: {
  item: RoadmapItem;
  align: "left" | "right";
  compact?: boolean;
  highlightProgress: MotionValue<number>;
}) {
  const Icon = itemIcons[item.id] ?? ShieldCheck;
  const meta = statusMeta[item.status];
  const smoothedHighlight = useSpring(highlightProgress, {
    stiffness: 88,
    damping: 24,
    mass: 1.05,
  });
  const rawDoneFillProgress = useTransform(smoothedHighlight, (value) => {
    if (item.status !== "done") return 0;
    if (value <= 0.32) return 0;
    if (value >= 0.94) return 1;
    const normalized = (value - 0.32) / 0.62;
    return Math.pow(Math.max(0, Math.min(1, normalized)), 1.45);
  });
  const doneFillProgress = useSpring(rawDoneFillProgress, {
    stiffness: 70,
    damping: 20,
    mass: 1.15,
  });
  const liftY = useTransform(smoothedHighlight, [0, 1], [0, -12]);
  const scale = useTransform(smoothedHighlight, [0, 1], [1, 1.018]);
  const glowAlpha = useTransform(smoothedHighlight, [0, 1], [0.015, 0.08]);
  const borderAlpha = useTransform(smoothedHighlight, [0, 1], [0.16, 0.44]);
  const topGlowOpacity = useTransform(smoothedHighlight, [0, 1], [0.08, 0.32]);
  const cardShadow = useMotionTemplate`inset 0 1px 0 rgba(255,255,255,0.82), 0 14px 34px rgba(15,23,42,0.055), 0 10px 22px rgba(0,120,145,${glowAlpha})`;
  const cardBorder = useMotionTemplate`rgba(126,191,204,${borderAlpha})`;
  const overlayScale = useTransform(doneFillProgress, [0, 1], [0, 1]);
  const overlayOpacity = useTransform(doneFillProgress, [0, 0.06, 1], [0, 0.94, 1]);
  const glossOpacity = useTransform(doneFillProgress, [0, 0.55, 1], [1, 0.22, 0]);
  const overlaySweepX = useTransform(doneFillProgress, [0, 1], ["-24%", "118%"]);
  const overlaySweepY = useTransform(doneFillProgress, [0, 1], ["-16%", "116%"]);
  const textShiftProgress = useTransform(doneFillProgress, (value) => {
    if (value <= 0.36) return 0;
    if (value >= 0.9) return 1;
    return (value - 0.36) / 0.54;
  });
  const fillEdgeX = useTransform(doneFillProgress, [0, 1], ["-16%", "116%"]);
  const fillEdgeOpacity = useTransform(doneFillProgress, [0, 0.1, 0.9, 1], [0, 0.58, 0.52, 0]);
  const fillBloomOpacity = useTransform(doneFillProgress, [0, 0.18, 0.55, 1], [0, 0.12, 0.08, 0]);
  const fillBloomScale = useTransform(doneFillProgress, [0, 1], [0.92, 1.08]);
  const iconWrapBg = useTransform(textShiftProgress, [0, 1], ["rgba(255,255,255,0.82)", "rgba(255,255,255,0.1)"]);
  const iconWrapBorder = useTransform(textShiftProgress, [0, 1], ["rgba(255,255,255,0.7)", "rgba(255,255,255,0.16)"]);
  const iconColor = useTransform(textShiftProgress, [0, 1], ["#007891", "#f8fafc"]);
  const metaColor = useTransform(textShiftProgress, [0, 1], ["#94a3b8", "rgba(255,255,255,0.62)"]);
  const headingColor = useTransform(textShiftProgress, [0, 1], ["#0f172a", "#f8fafc"]);
  const bodyColor = useTransform(textShiftProgress, [0, 1], ["#475569", "rgba(241,245,249,0.86)"]);
  const chipColor = useTransform(textShiftProgress, [0, 1], ["#475569", "rgba(241,245,249,0.92)"]);
  const pillBg = useTransform(textShiftProgress, [0, 1], ["rgba(255,255,255,0.55)", "rgba(8,23,33,0.18)"]);
  const pillBorder = useTransform(textShiftProgress, [0, 1], ["rgba(255,255,255,0.7)", "rgba(255,255,255,0.18)"]);
  const pillInset = useMotionTemplate`inset 0 1px 0 rgba(255,255,255,${useTransform(textShiftProgress, [0, 1], [0.82, 0.12])})`;
  const pillBodyColor = useTransform(textShiftProgress, [0, 1], ["#64748b", "rgba(255,255,255,0.94)"]);

  return (
    <motion.article
      initial={{ y: 40, opacity: 0, x: align === "left" ? 18 : -18 }}
      whileInView={{ y: 0, opacity: 1, x: 0 }}
      viewport={{ once: true, amount: compact ? 0.15 : 0.35 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      style={{ y: liftY, scale, boxShadow: cardShadow, borderColor: cardBorder }}
      className={cn(
        "roadmap-glass group relative w-full max-w-[28rem] overflow-hidden rounded-[34px] border border-white/60 backdrop-blur-2xl",
        compact ? "px-5 py-5" : "px-7 py-7"
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 origin-left bg-[linear-gradient(145deg,#102b3b_0%,#007891_42%,#45a9c1_72%,#193b4f_100%)]"
        style={{ opacity: overlayOpacity, scaleX: overlayScale }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute left-0 top-0 h-[38%] w-[42%] bg-[linear-gradient(135deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.34)_45%,rgba(255,255,255,0)_76%)] blur-lg"
        style={{ x: overlaySweepX, y: overlaySweepY, opacity: fillEdgeOpacity, rotate: "-10deg" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-y-4 left-0 w-[14%] rounded-full bg-[linear-gradient(90deg,rgba(126,191,204,0),rgba(255,255,255,0.74)_45%,rgba(126,191,204,0.5)_72%,rgba(126,191,204,0))] blur-md"
        style={{ x: fillEdgeX, opacity: fillEdgeOpacity }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-y-10 left-0 w-[18%] rounded-full bg-[radial-gradient(circle,rgba(126,191,204,0.22)_0%,rgba(126,191,204,0.1)_42%,rgba(126,191,204,0)_78%)] blur-2xl"
        style={{ x: fillEdgeX, opacity: fillBloomOpacity, scale: fillBloomScale }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />
      <motion.div
        className="pointer-events-none absolute -right-16 top-6 h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl"
        whileHover={{ scale: 1.25, opacity: 1 }}
        style={{ opacity: topGlowOpacity }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.7),rgba(255,255,255,0.34)_42%,rgba(255,255,255,0.14)_100%)]"
        style={{ opacity: glossOpacity }}
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <motion.div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-[0_6px_16px_rgba(25,59,79,0.05)]"
          style={{ backgroundColor: iconWrapBg, borderColor: iconWrapBorder, color: iconColor }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <motion.div
            className="text-[11px] font-semibold uppercase tracking-[0.26em]"
            style={{ color: metaColor }}
          >
            {item.nr_relacionada}
          </motion.div>
          <div className="mt-3 flex items-baseline gap-3">
            <motion.div
              className="text-3xl font-semibold tracking-[-0.06em]"
              style={{ color: headingColor }}
            >
              {item.sigla}
            </motion.div>
            <motion.div
              className={cn("text-[11px] font-semibold uppercase tracking-[0.22em]", item.status === "done" ? "" : meta.toneClassName)}
              style={item.status === "done" ? { color: chipColor } : undefined}
            >
              {meta.label}
            </motion.div>
          </div>
          <motion.h3
            className="mt-3 max-w-[22rem] text-[clamp(1.2rem,1.6vw,1.55rem)] font-semibold leading-[1.08] tracking-[-0.04em]"
            style={{ color: headingColor }}
          >
            {item.titulo}
          </motion.h3>
          <motion.p
            className="mt-4 max-w-[24rem] text-sm leading-7"
            style={{ color: bodyColor }}
          >
            {item.descricao_curta}
          </motion.p>
        </div>
      </div>

      <motion.div
        className="relative mt-6 overflow-hidden rounded-[28px] border px-5 py-4"
        style={{ backgroundColor: pillBg, borderColor: pillBorder, boxShadow: pillInset }}
      >
        <motion.div
          className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: chipColor }}
        >
          <div className={cn("h-2.5 w-2.5 rounded-full border bg-white", meta.orbClassName)} />
          <span>{meta.label}</span>
        </motion.div>
        {item.destaque ? (
          <motion.p
            initial={{ opacity: 0.82 }}
            whileHover={{ opacity: 1 }}
            className="mt-3 max-w-[19rem] text-[15px] leading-7"
            style={{ color: pillBodyColor }}
          >
            {item.destaque}
          </motion.p>
        ) : null}
      </motion.div>
    </motion.article>
  );
}

export function RoadmapView() {
  const items = roadmapItems;
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const [brainReady, setBrainReady] = useState(false);
  const [brainQuality, setBrainQuality] = useState(0.7);
  const brainDesktopRef = useRef<HTMLDivElement | null>(null);
  const brainMobileRef = useRef<HTMLDivElement | null>(null);
  const futureSectionRef = useRef<HTMLElement | null>(null);
  const isDesktopBrainVisible = useInView(brainDesktopRef, {
    amount: 0.2,
    margin: "220px 0px",
  });
  const isMobileBrainVisible = useInView(brainMobileRef, {
    amount: 0.2,
    margin: "220px 0px",
  });
  const isBrainVisible = isDesktopBrainVisible || isMobileBrainVisible;
  const isFutureVisible = useInView(futureSectionRef, {
    amount: 0.18,
    margin: "240px 0px",
  });
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progressPercent = getProgressPercent(items);
  const doneCount = items.filter((item) => item.status === "done").length;
  const currentItem = getCurrentDoneItem(items);
  const currentIndex = items.findIndex((item) => item.id === currentItem?.id);
  const nextItem =
    items.find((item, index) => index > currentIndex && item.status !== "done") ?? null;
  const currentDateLabel = useMemo(() => formatRoadmapDate(new Date()), []);
  const intelligenceNodes = useMemo(() => buildIntelligenceNodes(items), [items]);
  const conceptY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -18]), {
    stiffness: 54,
    damping: 28,
    mass: 1.1,
  });
  const executionY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -8]), {
    stiffness: 54,
    damping: 28,
    mass: 1.1,
  });
  const haloOneY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -28]), {
    stiffness: 60,
    damping: 30,
    mass: 1.2,
  });
  const haloTwoY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 14]), {
    stiffness: 60,
    damping: 30,
    mass: 1.2,
  });
  const beamActive = isFutureVisible && !reducedMotion;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const cores = navigator.hardwareConcurrency ?? 4;
    const isMobile = window.innerWidth < 768;
    const lowEnd = memory <= 4 || cores <= 4;
    const nextQuality = prefersReducedMotion ? 0.35 : lowEnd ? 0.52 : 0.78;
    setBrainQuality(isMobile ? nextQuality * 0.8 : nextQuality);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("requestIdleCallback" in window)) {
      setBrainReady(true);
      return;
    }
    const id = window.requestIdleCallback(
      () => setBrainReady(true),
      { timeout: 1200 }
    );
    return () => window.cancelIdleCallback(id);
  }, []);
  return (
    <main className="roadmap-shell min-h-screen overflow-x-clip text-slate-900">
      <section
        ref={sectionRef}
        className="roadmap-grid relative isolate overflow-hidden px-6 pb-24 pt-10 sm:px-8 lg:px-12"
      >
        <motion.div
          className="pointer-events-none absolute left-[-5rem] top-[-6rem] h-[16rem] w-[16rem] rounded-full bg-[radial-gradient(circle,rgba(126,191,204,0.14)_0%,rgba(126,191,204,0)_72%)] blur-3xl"
          style={{ y: haloOneY }}
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute right-[-6rem] top-[14rem] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(0,120,145,0.08)_0%,rgba(0,120,145,0)_74%)] blur-3xl"
          style={{ y: haloTwoY }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(255,255,255,0))]" />

        <div className="relative mx-auto max-w-7xl">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-12 flex items-center justify-between gap-6"
          >
            <div className="inline-flex items-center">
              <Image
                src="/logo.png"
                alt="BR MED"
                width={212}
                height={56}
                className="h-auto w-44 sm:w-52"
                priority
              />
            </div>

            <div className="text-right text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <div>Atualizado em: {currentDateLabel}</div>
              <div className="mt-1 text-slate-300">
                Status: <span className="font-bold text-slate-500">{nextItem?.sigla ?? "--"}</span> em desenvolvimento
              </div>
            </div>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
            style={{ y: conceptY }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mx-auto flex max-w-5xl flex-col items-center space-y-7 text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-500" />
                Visão estratégica
              </div>

              <div className="space-y-5">
                <h1 className="mx-auto max-w-4xl text-[clamp(3.2rem,7vw,6.2rem)] font-semibold leading-[0.9] tracking-[-0.07em] text-slate-950">
                  Roadmap XPTO: A engenharia por trás da conformidade autônoma.
                </h1>
                <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-600 sm:text-[1.15rem]">
                  Não entregamos documentos isolados, entregamos fluxo. O XPTO é a espinha dorsal tecnológica que conecta cada etapa de SST, garantindo que o dado percorra a empresa sem interrupções, do diagnóstico à execução.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mx-auto max-w-5xl rounded-[32px] border border-white/70 bg-white/66 px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-8 sm:py-8"
            >
              <div className="max-w-3xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  Este é o XPTO
                </div>
                <p className="mt-4 text-[15px] leading-7 text-slate-600">
                  Abaixo você verá como a jornada se comporta quando cada etapa deixa de ser um arquivo isolado e passa a operar como parte de um fluxo contínuo, legível e acionável.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/70 bg-white/58 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-primary shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      O que isso substitui
                    </div>
                  </div>
                  <p className="mt-4 text-[15px] leading-7 text-slate-600">
                    SST deixa de ser uma lista de entregas desconectadas e passa a operar como sistema. Cada etapa gera contexto, destrava a próxima e reduz o atrito operacional.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/58 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-primary shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      O que você verá abaixo
                    </div>
                  </div>
                  <p className="mt-4 text-[15px] leading-7 text-slate-600">
                    Primeiro o estado atual do fluxo, depois a trilha viva mostrando como cada etapa alimenta a seguinte até formar a base para uma gestão preditiva.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mx-auto flex w-full max-w-5xl flex-col items-center"
            >
              <div className="h-12 w-px border-l border-dashed border-slate-300/80" />
              <div className="mt-2 h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_20px_rgba(0,120,145,0.35)]" />
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: 0.58, delay: 0.08 }}
            style={{ y: executionY }}
            className="mt-20 space-y-8"
          >
            <div className="mx-auto max-w-5xl space-y-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                02. A execução
              </div>
              <h2 className="mx-auto max-w-4xl text-[clamp(2.4rem,4.4vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">
                Gestão em tempo real. Sem pontos cegos.
              </h2>
              <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-600">
                Esqueça os painéis estáticos. Nossa interface de Leitura de Fluxo materializa a interdependência real das normas. Quando uma etapa como o PGR é concluída, ela não apenas gera um arquivo; ela alimenta e desbloqueia o próximo salto.
              </p>
              <p className="mx-auto max-w-3xl text-[15px] leading-7 text-slate-600">
                O erro humano por esquecimento é eliminado pelo design do fluxo, não pela vigilância de pessoas.
              </p>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="roadmap-glass relative mx-auto max-w-5xl overflow-hidden rounded-[34px] border border-slate-200/80 px-7 py-7 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:px-8 sm:py-8"
            >
              <div className="relative flex items-start justify-between gap-4 border-b border-slate-200/70 pb-5">
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                    Leitura atual do fluxo
                  </div>
                  <h3 className="text-[clamp(1.4rem,2vw,1.9rem)] font-semibold tracking-[-0.05em] text-slate-950">
                    Gestão viva da jornada
                  </h3>
                  <p className="max-w-2xl text-[15px] leading-7 text-slate-600">
                    O fluxo já consolidou o PGR e agora empurra o PCMSO como próxima frente ativa. O sistema mostra dependência, sequência e desbloqueio.
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-[#2f6076] bg-[linear-gradient(135deg,#193b4f_0%,#0f3345_100%)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                  Em desenvolvimento
                </div>
              </div>

              <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-[28px] border border-slate-200/80 bg-white/72 px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Progresso consolidado
                      </div>
                      <div className="mt-3 text-6xl font-semibold tracking-[-0.07em] text-slate-950">
                        {progressPercent}%
                      </div>
                    </div>
                    <div className="max-w-[14rem] text-right text-sm leading-6 text-slate-500">
                      {doneCount} de {items.length} etapas já têm continuidade modelada.
                    </div>
                  </div>

                  <p className="mt-5 max-w-[34rem] text-[15px] leading-7 text-slate-600">
                    {currentItem?.sigla} está concluído. {nextItem?.sigla ?? "A etapa seguinte"} já aparece como próximo salto operacional, sem depender de controle manual.
                  </p>

                  <div className="mt-6">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>Marco {String(currentIndex + 1).padStart(2, "0")}</span>
                      <span>{items.length} etapas conectadas</span>
                    </div>

                    <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-100 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]">
                      <motion.div
                        className="pointer-events-none absolute inset-y-0 left-0 w-16 rounded-full bg-[radial-gradient(circle,rgba(126,191,204,0.48)_0%,rgba(126,191,204,0)_72%)] blur-xl"
                        animate={{ x: ["-18%", "112%"] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
                        aria-hidden
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        className="roadmap-gradient-flow roadmap-shimmer-mask h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[26px] border border-slate-200/80 bg-white/72 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Agora
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Concluído
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#193B4F]">
                      {currentItem?.sigla}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#193B4F]/72">
                      Entrega consolidada e já servindo de base para o próximo ciclo.
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-[#2f6076] bg-[linear-gradient(135deg,#193b4f_0%,#0f3345_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                        Em desenvolvimento
                      </div>
                      <div className="rounded-full border border-[#4d879d] bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        Próximo salto
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-[-0.05em]" style={{ color: "#F8FAFC" }}>
                      {nextItem?.sigla ?? "--"}
                    </div>
                    <p className="mt-2 text-sm leading-6" style={{ color: "rgba(248,250,252,0.92)" }}>
                      Próxima camada a ser destravada pelo fluxo para dar continuidade à jornada.
                    </p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="mx-auto mt-12 flex w-full max-w-5xl flex-col items-center"
          >
            <div className="h-12 w-px border-l border-dashed border-slate-300/80" />
            <div className="mt-2 h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_20px_rgba(0,120,145,0.35)]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.04 }}
            transition={{ duration: 0.65, delay: 0.15 }}
            className="mt-16"
          >
            <div className="mb-10 mx-auto max-w-5xl space-y-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                03. O futuro
              </div>
              <h2 className="mx-auto max-w-4xl text-[clamp(2.4rem,4.4vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">
                Onde o dado se transforma em direção.
              </h2>
              <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-600">
                O XPTO é o alicerce para a nossa IA Preditiva. Ao consolidar 100% da jornada em uma estrutura de dados normalizada, criamos o cérebro que antecipará riscos e sugerirá ações preventivas antes mesmo que um incidente ocorra.
              </p>
            </div>

            <TimelineDesktop items={items} />
            <TimelineMobile items={items} />

            <motion.section
              ref={futureSectionRef}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-16 max-w-5xl rounded-[36px] border border-white/70 bg-white/62 px-6 py-10 text-center shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-8 lg:px-12"
            >
              <div className="mx-auto max-w-3xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Segurança preditiva com IA
                </div>
                <h3 className="mt-4 text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-slate-950">
                  O XPTO é o alicerce da nossa Segurança Preditiva.
                </h3>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Não estamos apenas digitalizando processos isolados; estamos centralizando 100% da jornada em um Modelo de Dados Normalizado. Esta estrutura é o treinamento do cérebro que, em breve, antecipará riscos e sugerirá ações preventivas antes que um incidente ocorra.
                </p>
              </div>

              <div className="relative mx-auto mt-12 hidden h-[32rem] max-w-5xl lg:block">
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <filter id="beam-glow">
                      <feGaussianBlur stdDeviation="2.8" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {intelligenceNodes.map((item, index) => (
                    <g key={item.id}>
                      <line
                        x1={item.lineX}
                        y1={item.lineY}
                        x2={INTELLIGENCE_CENTER.x}
                        y2={INTELLIGENCE_CENTER.y}
                        stroke="rgba(148,163,184,0.42)"
                        strokeWidth="0.18"
                      />
                      <motion.line
                        x1={item.lineX}
                        y1={item.lineY}
                        x2={INTELLIGENCE_CENTER.x}
                        y2={INTELLIGENCE_CENTER.y}
                        pathLength={1}
                        stroke="rgba(255,255,255,0.92)"
                        strokeWidth="0.72"
                        strokeLinecap="round"
                        strokeDasharray="0.06 0.94"
                        animate={
                          beamActive
                            ? { strokeDashoffset: [1, 0], opacity: [0.03, 0.34, 0.03] }
                            : { opacity: 0.12 }
                        }
                        transition={{
                          duration: beamActive ? 2.5 : 0,
                          repeat: beamActive ? Infinity : 0,
                          ease: "linear",
                          delay: beamActive ? index * 0.26 : 0,
                        }}
                        filter="url(#beam-glow)"
                      />
                      <motion.line
                        x1={item.lineX}
                        y1={item.lineY}
                        x2={INTELLIGENCE_CENTER.x}
                        y2={INTELLIGENCE_CENTER.y}
                        pathLength={1}
                        stroke="#7EBFCC"
                        strokeWidth="0.38"
                        strokeLinecap="round"
                        strokeDasharray="0.06 0.94"
                        animate={
                          beamActive
                            ? { strokeDashoffset: [1, 0], opacity: [0.08, 0.96, 0.08] }
                            : { opacity: 0.1 }
                        }
                        transition={{
                          duration: beamActive ? 2.5 : 0,
                          repeat: beamActive ? Infinity : 0,
                          ease: "linear",
                          delay: beamActive ? index * 0.26 : 0,
                        }}
                        filter="url(#beam-glow)"
                      />
                      <circle cx={item.lineX} cy={item.lineY} r="0.9" fill="rgba(126,191,204,0.24)" filter="url(#beam-glow)" />
                      <circle cx={item.lineX} cy={item.lineY} r="0.38" fill="rgba(223,248,255,0.96)" />
                      <circle cx={INTELLIGENCE_CENTER.x} cy={INTELLIGENCE_CENTER.y} r="0.78" fill="rgba(126,191,204,0.16)" filter="url(#beam-glow)" />
                      <circle cx={INTELLIGENCE_CENTER.x} cy={INTELLIGENCE_CENTER.y} r="0.34" fill="rgba(223,248,255,0.92)" />
                      <motion.circle
                        r="1.02"
                        fill="rgba(255,255,255,0.96)"
                        filter="url(#beam-glow)"
                        animate={
                          beamActive
                            ? {
                                cx: [`${item.lineX}`, `${INTELLIGENCE_CENTER.x}`],
                                cy: [`${item.lineY}`, `${INTELLIGENCE_CENTER.y}`],
                                opacity: [0, 0.84, 0],
                                scale: [0.9, 1.08, 0.9],
                              }
                            : { opacity: 0 }
                        }
                        transition={{
                          duration: beamActive ? 2.6 : 0,
                          repeat: beamActive ? Infinity : 0,
                          ease: "easeInOut",
                          delay: beamActive ? index * 0.26 : 0,
                        }}
                      />
                      <motion.circle
                        r="0.58"
                        fill="#7EBFCC"
                        filter="url(#beam-glow)"
                        animate={
                          beamActive
                            ? {
                                cx: [`${item.lineX}`, `${INTELLIGENCE_CENTER.x}`],
                                cy: [`${item.lineY}`, `${INTELLIGENCE_CENTER.y}`],
                                opacity: [0, 1, 0],
                                scale: [0.92, 1.02, 0.92],
                              }
                            : { opacity: 0 }
                        }
                        transition={{
                          duration: beamActive ? 2.6 : 0,
                          repeat: beamActive ? Infinity : 0,
                          ease: "easeInOut",
                          delay: beamActive ? index * 0.26 : 0,
                        }}
                      />
                    </g>
                  ))}
                </svg>

                {intelligenceNodes.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.45, delay: 0.06 + index * 0.03 }}
                    className="absolute flex h-11 w-[6.8rem] items-center justify-center rounded-full border border-slate-200/80 bg-white/78 px-3 py-2 text-center text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#193B4F] shadow-[0_14px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                    style={{ left: `${item.pillX}%`, top: `${item.pillY}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {item.label}
                  </motion.div>
                ))}

                <div
                  ref={brainDesktopRef}
                  className="absolute h-[12.5rem] w-[12.5rem] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${INTELLIGENCE_CENTER.x}%`, top: `${INTELLIGENCE_CENTER.y}%` }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    {brainReady && isBrainVisible ? (
                      <BrainScene quality={brainQuality} reducedMotion={reducedMotion} />
                    ) : (
                      <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(126,191,204,0.24),rgba(255,255,255,0)_62%)]" />
                    )}
                  </div>
                  
                </div>
              </div>

              <div className="mt-10 grid gap-3 lg:hidden">
                <div
                  ref={brainMobileRef}
                  className="mx-auto h-40 w-40 overflow-hidden rounded-full border border-cyan-200 shadow-[0_18px_44px_rgba(0,120,145,0.18)]"
                >
                  {brainReady && isBrainVisible ? (
                    <BrainScene quality={brainQuality * 0.75} reducedMotion={reducedMotion} />
                  ) : (
                    <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(126,191,204,0.24),rgba(255,255,255,0)_62%)]" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {intelligenceNodes.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: 0.08 + index * 0.06 }}
                    className="rounded-[20px] border border-slate-200/80 bg-white/72 px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#193B4F] shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
                  >
                    {item.label}
                  </motion.div>
                ))}
                </div>
              </div>
            </motion.section>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
