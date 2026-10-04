/**
 * 车型涉水耐受模型 (Vehicle wading-tolerance domain model)
 *
 * 纯领域逻辑：给定「车型」与「水深(cm)」，判定能否通过。
 * 无任何第三方依赖，便于单元测试与在其他层复用。
 *
 * 模型说明（分段阈值）：
 *   设某车型的「绝对安全阈值」为 T（cm）：
 *     - waterDepth <= T/2            -> PASSABLE （可正常通行）
 *     - T/2 < waterDepth <= T        -> CAUTION  （需谨慎低速通行）
 *     - waterDepth > T               -> BLOCKED  （严重阻断，不可涉水）
 *   即「超过阈值一半」就该提高警惕，「超过阈值」即不可通行。
 */

/** 车型枚举 */
export enum VehicleType {
  /** 摩托车 —— 绝对安全阈值 10cm */
  MOTORCYCLE = "MOTORCYCLE",
  /** 小型轿车 —— 绝对安全阈值 20cm */
  SEDAN = "SEDAN",
  /** SUV / 高底盘皮卡 —— 绝对安全阈值 40cm */
  SUV_PICKUP = "SUV_PICKUP",
  /** 大型货车 / 卡车 —— 绝对安全阈值 60cm */
  TRUCK = "TRUCK",
}

/** 涉水评估状态 */
export enum PassabilityStatus {
  /** 安全通过 */
  PASSABLE = "PASSABLE",
  /** 需谨慎低速通行 */
  CAUTION = "CAUTION",
  /** 严重阻断，不可涉水 */
  BLOCKED = "BLOCKED",
}

/**
 * 各车型的涉水「绝对安全阈值」(cm)。
 * waterDepth <= 该值即判定为 PASTABLE 的上界的一半见 CAUTION_RATIO。
 */
export const SAFE_WATER_DEPTH_CM: Readonly<Record<VehicleType, number>> = Object.freeze({
  [VehicleType.MOTORCYCLE]: 10,
  [VehicleType.SEDAN]: 20,
  [VehicleType.SUV_PICKUP]: 40,
  [VehicleType.TRUCK]: 60,
});

/**
 * CAUTION 触发比例：水深超过 阈值 * CAUTION_RATIO 即进入 CAUTION，
 * 水深超过 阈值 则 BLOCKED。
 */
export const CAUTION_RATIO = 0.5;

/**
 * 评估某车型能否通过给定水深的路段。
 *
 * @param vehicle      车型
 * @param waterDepthCm 积水深度（厘米），应为非负数
 * @returns PassabilityStatus
 */
export function evaluatePassability(
  vehicle: VehicleType,
  waterDepthCm: number,
): PassabilityStatus {
  if (!Number.isFinite(waterDepthCm) || waterDepthCm < 0) {
    throw new RangeError(`waterDepthCm 必须是非负有限数，收到: ${waterDepthCm}`);
  }

  const safeDepth = SAFE_WATER_DEPTH_CM[vehicle];
  if (safeDepth === undefined) {
    throw new RangeError(`未知车型: ${vehicle}`);
  }

  if (waterDepthCm > safeDepth) {
    return PassabilityStatus.BLOCKED;
  }
  if (waterDepthCm > safeDepth * CAUTION_RATIO) {
    return PassabilityStatus.CAUTION;
  }
  return PassabilityStatus.PASSABLE;
}
