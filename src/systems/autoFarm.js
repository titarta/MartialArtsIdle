/**
 * autoFarm.js — vestigial constants module.
 *
 * The pre-pivot file simulated auto-gathering and auto-mining against the
 * WORLDS data set. With the v1 Cookie-Clicker pivot the Worlds hub is gone,
 * useAutoFarm has been deleted, and the only thing the rest of the codebase
 * still pulls from this module is the shared offline-time cap (read by
 * useCultivation when calculating offline qi accrual).
 *
 * If gathering / mining return, restore the simulation surface from the
 * pre-pivot history (mergeGains / hasGains / simulateGathering /
 * simulateMining / etc.) — those functions all depended on src/data/worlds
 * and src/data/materials which were retired in the same pass.
 */

// Cap offline simulation to prevent startup lag and to avoid week-long
// away sessions trivialising progression.
export const MAX_OFFLINE_HOURS = 8;
