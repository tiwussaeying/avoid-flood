/**
 * CrowdReportModal.tsx —— 用户众包上报积水的移动端抽屉弹窗
 */
import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, Waves, X } from "lucide-react";
import { VehicleType, SAFE_WATER_DEPTH_CM } from "../domain/vehicle.js";

export interface CrowdReportPayload {
  waterDepthCm: number;
  /** 小轿车是否已无法通行（提交时用于抬升水深） */
  sedanBlocked: boolean;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CrowdReportPayload) => void;
  /** 当前定位/落点描述 */
  locationLabel?: string;
}

/** 快捷水深档位 */
const DEPTH_PRESETS: { label: string; th: string; cm: number }[] = [
  { label: "脚踝", th: "ข้อเท้า", cm: 10 },
  { label: "半轮", th: "ครึ่งล้อ", cm: 20 },
  { label: "过排气管", th: "ท่อไอเสีย", cm: 35 },
  { label: "完全淹没", th: "ท่วมมิด", cm: 50 },
];

/** 勾选“小轿车无法通行”时的最低水深（轿车阈值 20 + 一点余量） */
const SEDAN_BLOCKED_MIN_CM = 25;

/** 轿车安全阈值（与 domain/vehicle.ts 保持一致），用于实时提示 */
const SEDAN_SAFE_CM = SAFE_WATER_DEPTH_CM[VehicleType.SEDAN];

export function CrowdReportModal({
  open,
  onClose,
  onSubmit,
  locationLabel = "Siam Paragon 附近",
}: Props) {
  const [depth, setDepth] = useState<number>(20);
  const [sedanBlocked, setSedanBlocked] = useState(false);
  const [description, setDescription] = useState("");

  // 每次打开重置表单
  useEffect(() => {
    if (open) {
      setDepth(20);
      setSedanBlocked(false);
      setDescription("");
    }
  }, [open]);

  if (!open) return null;

  const effectiveDepth = sedanBlocked
    ? Math.max(depth, SEDAN_BLOCKED_MIN_CM)
    : depth;

  const sedanBlockedNow = effectiveDepth > SEDAN_SAFE_CM;

  const handleSubmit = () => {
    onSubmit({
      waterDepthCm: effectiveDepth,
      sedanBlocked,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 背景遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* 抽屉主体 */}
      <div className="glass relative z-10 w-full max-w-md animate-[slideUp_220ms_ease-out] rounded-t-3xl px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-cyan-400" />
            <h2 className="text-[15px] font-bold text-white">
              上报积水 · รายงานน้ำท่วม
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5" />
          当前位置：{locationLabel}
        </p>

        {/* 水深档位 */}
        <div className="mt-4">
          <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            积水深度
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DEPTH_PRESETS.map((p) => {
              const active = depth === p.cm;
              return (
                <button
                  key={p.cm}
                  type="button"
                  onClick={() => setDepth(p.cm)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 text-center transition-all ${
                    active
                      ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                      : "border-[var(--color-edge)] bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="text-[13px] font-bold leading-none">
                    {p.cm}
                    <span className="text-[10px] font-normal">cm</span>
                  </span>
                  <span className="text-[10px] leading-tight">{p.label}</span>
                  <span className="text-[9px] leading-tight text-slate-500">
                    {p.th}
                  </span>
                </button>
              );
            })}
          </div>
          <input
            type="range"
            min={5}
            max={80}
            step={1}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="mt-3 w-full accent-cyan-500"
          />
          <div className="text-right text-[11px] text-slate-400">
            当前：
            <span className="font-semibold text-cyan-300">
              {effectiveDepth} cm
            </span>
          </div>
        </div>

        {/* 车型建议 */}
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--color-edge)] bg-white/5 px-3 py-2.5">
          <input
            type="checkbox"
            checked={sedanBlocked}
            onChange={(e) => setSedanBlocked(e.target.checked)}
            className="h-4 w-4 accent-red-500"
          />
          <span className="text-[13px] text-slate-200">
            小轿车已无法通行 · รถเล็กผ่านไม่ได้
          </span>
        </label>

        {/* 描述 */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简短描述，如：Asok 巷内积水严重"
          maxLength={120}
          className="mt-3 w-full rounded-xl border border-[var(--color-edge)] bg-black/30 px-3.5 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
        />

        {/* 实时提示 */}
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11.5px] ${
            sedanBlockedNow
              ? "bg-red-500/10 text-red-300"
              : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {sedanBlockedNow ? "小轿车无法通过" : "小轿车可低速通行"}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3.5 text-[15px] font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-[0.99]"
        >
          提交上报 · ส่งรายงาน
        </button>
      </div>
    </div>
  );
}
