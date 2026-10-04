/**
 * VehicleSelector.tsx —— Tab 式车型切换（i18n 版）
 */
import { Bike, Car, Truck } from "lucide-react";
import { VehicleType } from "../domain/vehicle.js";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  value: VehicleType;
  onChange: (v: VehicleType) => void;
}

export function VehicleSelector({ value, onChange }: Props) {
  const { t } = useTranslation();

  const OPTIONS: { type: VehicleType; label: string; Icon: typeof Car }[] = [
    { type: VehicleType.MOTORCYCLE, label: t.vehicleMotorcycle, Icon: Bike },
    { type: VehicleType.SEDAN, label: t.vehicleSedan, Icon: Car },
    { type: VehicleType.SUV_PICKUP, label: t.vehiclePickup, Icon: Truck },
  ];

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
