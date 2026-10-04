/**
 * VehicleSelector.tsx —— Tab 式车型切换
 */
import { Bike, Car, Truck } from "lucide-react";
import { VehicleType } from "../domain/vehicle.js";

interface Props {
  value: VehicleType;
  onChange: (v: VehicleType) => void;
}

const OPTIONS: { type: VehicleType; label: string; Icon: typeof Car }[] = [
  { type: VehicleType.MOTORCYCLE, label: "摩托", Icon: Bike },
  { type: VehicleType.SEDAN, label: "轿车", Icon: Car },
  { type: VehicleType.SUV_PICKUP, label: "皮卡", Icon: Truck },
];

export function VehicleSelector({ value, onChange }: Props) {
  return (
    <div className="glass flex gap-1 rounded-xl p-1">
      {OPTIONS.map(({ type, label, Icon }) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-gradient-to-b from-slate-600/40 to-slate-700/40 text-white shadow-inner ring-1 ring-[var(--color-edge)]"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
