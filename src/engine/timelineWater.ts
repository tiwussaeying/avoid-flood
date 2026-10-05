/**
 * timelineWater.ts —— 时间轴驱动的水位演变模型
 *
 * 时间轴的核心价值：让用户看到「水在涨还是在退」。
 * 这里定义水位随时间偏移（小时）的缩放函数，
 * 使过去 -> 现在 -> 未来的积水深度形成合理曲线。
 *
 * 物理直觉：
 *   - 暴雨峰值后 0~2h 排水见效，水位快速下降（指数衰减）
 *   - 暴雨前 0~2h 水位随降雨累积上升
 *   - 越远的未来不确定性越大，用更平缓的曲线
 */

/**
 * 计算 t 小时后的水位缩放系数。
 *
 * @param hoursFromNow 距当前的小时数，负=过去
 * @returns 缩放系数（>1 表示水位更高）
 */
export function waterScaleAt(hoursFromNow: number): number {
  // 分段线性 + 指数混合，保证在 t=0 处连续且导数连续。
  //
  // 物理意义：
  //   t<0（过去）　越往回雨越小，水位从 1.0 减到 0.28（此时雨刚下）
  //   t>0（未来）　前 0.8h 汇流滞后（水位略升后平），之后指数退水
  if (hoursFromNow <= 0) {
    const h = Math.min(6, -hoursFromNow);
    // 平滑下降：h=0 -> 1.0，h=6 -> 0.28
    return 1 - 0.72 * (h / 6);
  }

  const h = Math.min(6, hoursFromNow);

  // 汇流滞后：前 0.8h 水位维持在 1.0~近似 1.0（暂时不降）
  const lagHours = 0.8;
  if (h <= lagHours) {
    // 前期微升后回落到 1.0，保证连续
    const p = h / lagHours;
    return 1 + 0.06 * Math.sin(p * Math.PI);
  }

  // 之后指数退水：从 1.0 衰减到 h=6 时约 0.30
  const e = h - lagHours;
  const decay = Math.exp(-e / 2.4);
  return 0.30 + 0.70 * decay;
}

/**
 * 按时间轴偏移缩放积水深度。
 *
 * @param baseDepthCm 当前深度
 * @param hoursFromNow 时间偏移（小时）
 * @param isCrowd 众包数据（时效衰减更快）
 */
export function scaleDepth(
  baseDepthCm: number,
  hoursFromNow: number,
  isCrowd = false,
): number {
  const scale = waterScaleAt(hoursFromNow);
  // 众包数据不确定性更高，波动幅度放大
  const volatility = isCrowd ? 1.25 : 1.0;
  const adjusted = baseDepthCm * (1 + (scale - 1) * volatility);
  return Math.max(0, Math.round(adjusted * 10) / 10);
}

/**
 * 时间轴偏移下的「降雨强度」缩放（用于分钟级曲线整体缩放）。
 */
export function rainScaleAt(hoursFromNow: number): number {
  const s = waterScaleAt(hoursFromNow);
  return Math.max(0.05, Math.min(2.2, s));
}
