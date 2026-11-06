/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.10: Interactive Gantt Timeline & Milestone Scheduler (Tool 4)
 * Sub-Module 2.11: Construction Phase & Cumulative Cashflow S-Curve Planner (Tool 10)
 *
 * Implements Critical Path Method (CPM) forward/backward pass logic,
 * monsoon/weather constraints, phase-wise construction capital outflow,
 * milestone customer inflows, cumulative S-Curve math, and peak funding exposure.
 */

// =========================================================================
// TOOL 4: INTERACTIVE GANTT TIMELINE & CRITICAL PATH METHOD (CPM)
// =========================================================================

export type TaskTrade =
  | "ENABLING"
  | "SUBSTRUCTURE"
  | "SUPERSTRUCTURE"
  | "FINISHING"
  | "MEP"
  | "HANDOVER";

export interface GanttTask {
  id: string;
  wbsCode: string;
  name: string;
  trade: TaskTrade;
  durationDays: number;
  predecessorIds: string[]; // Finish-to-Start dependencies
  isMilestone: boolean;
  monsoonSensitive: boolean; // Flag if task cannot progress during heavy monsoon (June-Aug)
  progressPercent: number; // 0 to 100
  // Computed CPM fields
  earlyStartDay: number;
  earlyFinishDay: number;
  lateStartDay: number;
  lateFinishDay: number;
  totalFloatDays: number;
  isCritical: boolean;
}

export const INITIAL_GANTT_TASKS: Omit<
  GanttTask,
  "earlyStartDay" | "earlyFinishDay" | "lateStartDay" | "lateFinishDay" | "totalFloatDays" | "isCritical"
>[] = [
  {
    id: "tsk-01",
    wbsCode: "1.0",
    name: "Statutory Sanction & NOC Clearances",
    trade: "ENABLING",
    durationDays: 30,
    predecessorIds: [],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 100,
  },
  {
    id: "tsk-02",
    wbsCode: "1.1",
    name: "Site Mobilization, Barricading & Power Setup",
    trade: "ENABLING",
    durationDays: 15,
    predecessorIds: ["tsk-01"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 100,
  },
  {
    id: "tsk-03",
    wbsCode: "1.2",
    name: "Milestone: Site Handover & Groundbreaking",
    trade: "ENABLING",
    durationDays: 0,
    predecessorIds: ["tsk-02"],
    isMilestone: true,
    monsoonSensitive: false,
    progressPercent: 100,
  },
  {
    id: "tsk-04",
    wbsCode: "2.1",
    name: "Bulk Excavation & Shoring Piles",
    trade: "SUBSTRUCTURE",
    durationDays: 45,
    predecessorIds: ["tsk-03"],
    isMilestone: false,
    monsoonSensitive: true,
    progressPercent: 65,
  },
  {
    id: "tsk-05",
    wbsCode: "2.2",
    name: "PCC Levelling Course & Footing Rebar",
    trade: "SUBSTRUCTURE",
    durationDays: 25,
    predecessorIds: ["tsk-04"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 20,
  },
  {
    id: "tsk-06",
    wbsCode: "2.3",
    name: "Raft Slab & Basement Retaining Walls (M30)",
    trade: "SUBSTRUCTURE",
    durationDays: 40,
    predecessorIds: ["tsk-05"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-07",
    wbsCode: "2.4",
    name: "Milestone: Substructure Plinth Level Reached",
    trade: "SUBSTRUCTURE",
    durationDays: 0,
    predecessorIds: ["tsk-06"],
    isMilestone: true,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-08",
    wbsCode: "3.1",
    name: "Ground to 5th Typical Slab (Mivan Formwork)",
    trade: "SUPERSTRUCTURE",
    durationDays: 45,
    predecessorIds: ["tsk-07"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-09",
    wbsCode: "3.2",
    name: "6th to 12th Typical Floor RCC Casting",
    trade: "SUPERSTRUCTURE",
    durationDays: 55,
    predecessorIds: ["tsk-08"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-10",
    wbsCode: "3.3",
    name: "Milestone: Structural Slab Topping Out",
    trade: "SUPERSTRUCTURE",
    durationDays: 0,
    predecessorIds: ["tsk-09"],
    isMilestone: true,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-11",
    wbsCode: "4.1",
    name: "AAC Block Masonry & Internal Plastering",
    trade: "FINISHING",
    durationDays: 50,
    predecessorIds: ["tsk-08"], // Can start after 5th floor slab
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-12",
    wbsCode: "5.1",
    name: "Electrical, Plumbing & Firefighting Rough-Ins",
    trade: "MEP",
    durationDays: 60,
    predecessorIds: ["tsk-08"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-13",
    wbsCode: "4.2",
    name: "Flooring, Glazing & External Painting",
    trade: "FINISHING",
    durationDays: 45,
    predecessorIds: ["tsk-10", "tsk-11", "tsk-12"],
    isMilestone: false,
    monsoonSensitive: true,
    progressPercent: 0,
  },
  {
    id: "tsk-14",
    wbsCode: "6.1",
    name: "Lift Testing, Substation Energization & OC",
    trade: "HANDOVER",
    durationDays: 30,
    predecessorIds: ["tsk-13"],
    isMilestone: false,
    monsoonSensitive: false,
    progressPercent: 0,
  },
  {
    id: "tsk-15",
    wbsCode: "6.2",
    name: "Milestone: Final Client Possession & Handover",
    trade: "HANDOVER",
    durationDays: 0,
    predecessorIds: ["tsk-14"],
    isMilestone: true,
    monsoonSensitive: false,
    progressPercent: 0,
  },
];

/**
 * Calculates Critical Path Method (CPM) Forward Pass, Backward Pass,
 * Total Float, and Critical Path Flagging
 */
export function calculateCPM(
  rawTasks: Omit<
    GanttTask,
    "earlyStartDay" | "earlyFinishDay" | "lateStartDay" | "lateFinishDay" | "totalFloatDays" | "isCritical"
  >[]
): GanttTask[] {
  const taskMap = new Map<string, GanttTask>();

  // Initialize
  rawTasks.forEach((t) => {
    taskMap.set(t.id, {
      ...t,
      earlyStartDay: 0,
      earlyFinishDay: 0,
      lateStartDay: 0,
      lateFinishDay: 0,
      totalFloatDays: 0,
      isCritical: false,
    });
  });

  // 1. Forward Pass (Calculate Early Start and Early Finish)
  const taskList = Array.from(taskMap.values());
  taskList.forEach((task) => {
    let maxPredecessorEF = 0;
    task.predecessorIds.forEach((predId) => {
      const pred = taskMap.get(predId);
      if (pred) {
        maxPredecessorEF = Math.max(maxPredecessorEF, pred.earlyFinishDay);
      }
    });

    task.earlyStartDay = maxPredecessorEF;
    task.earlyFinishDay = task.earlyStartDay + task.durationDays;
  });

  // Total project duration is max of Early Finish across all tasks
  const projectDurationDays = Math.max(...taskList.map((t) => t.earlyFinishDay));

  // 2. Backward Pass (Calculate Late Start and Late Finish)
  // Initialize all LF to project duration
  taskList.forEach((task) => {
    task.lateFinishDay = projectDurationDays;
  });

  // Reverse iterate
  for (let i = taskList.length - 1; i >= 0; i--) {
    const task = taskList[i];
    // Find all successors of this task
    const successors = taskList.filter((t) => t.predecessorIds.includes(task.id));
    if (successors.length > 0) {
      task.lateFinishDay = Math.min(...successors.map((s) => s.lateStartDay));
    }
    task.lateStartDay = task.lateFinishDay - task.durationDays;

    // 3. Float and Critical Path
    task.totalFloatDays = task.lateStartDay - task.earlyStartDay;
    task.isCritical = task.totalFloatDays <= 0;
  }

  return taskList;
}

// =========================================================================
// TOOL 10: CONSTRUCTION PHASE & CUMULATIVE CASHFLOW S-CURVE PLANNER
// =========================================================================

export interface MonthlyCashflowItem {
  monthIndex: number; // Month 1 to 24
  monthLabel: string;
  activePhase: string;
  plannedOutflowINR: number;
  cumulativeOutflowINR: number;
  plannedInflowINR: number; // Customer collections + Equity draws
  cumulativeInflowINR: number;
  netCashflowINR: number; // Inflow - Outflow
  cumulativeNetBalanceINR: number; // Bank balance / Working capital position
  isNegativeExposure: boolean;
}

export interface CashflowAnalysisSummary {
  totalOutflowINR: number;
  totalInflowINR: number;
  peakDeficitINR: number; // Highest negative cash requirement (Max debt line needed)
  peakDeficitMonth: number;
  finalSurplusINR: number;
  monthlySchedule: MonthlyCashflowItem[];
}

export const DEFAULT_MONTHLY_CASHFLOW_SCHEDULE: {
  month: number;
  label: string;
  phase: string;
  outflowCr: number;
  inflowCr: number;
}[] = [
  { month: 1, label: "M01 (Jan)", phase: "Mobilization & Permits", outflowCr: 0.65, inflowCr: 3.5 }, // Promoter equity injection
  { month: 2, label: "M02 (Feb)", phase: "Bulk Excavation & Shoring", outflowCr: 0.95, inflowCr: 0.0 },
  { month: 3, label: "M03 (Mar)", phase: "Basement Raft Concrete", outflowCr: 1.45, inflowCr: 1.8 }, // Booking stage 10%
  { month: 4, label: "M04 (Apr)", phase: "Retaining Walls & Plinth", outflowCr: 1.85, inflowCr: 0.0 },
  { month: 5, label: "M05 (May)", phase: "Plinth Complete & 1st Slab", outflowCr: 1.9, inflowCr: 2.2 }, // Plinth milestone 15%
  { month: 6, label: "M06 (Jun)", phase: "2nd & 3rd Slab (Monsoon Start)", outflowCr: 1.25, inflowCr: 0.0 },
  { month: 7, label: "M07 (Jul)", phase: "4th Slab (Heavy Monsoon)", outflowCr: 1.1, inflowCr: 0.0 },
  { month: 8, label: "M08 (Aug)", phase: "5th Slab & Podium Deck", outflowCr: 1.6, inflowCr: 2.8 }, // 5th Slab milestone 20%
  { month: 9, label: "M09 (Sep)", phase: "6th & 7th Typical Floor", outflowCr: 2.1, inflowCr: 0.0 },
  { month: 10, label: "M10 (Oct)", phase: "8th & 9th Typical Floor", outflowCr: 2.2, inflowCr: 0.0 },
  { month: 11, label: "M11 (Nov)", phase: "10th Slab & Brickwork", outflowCr: 2.4, inflowCr: 3.2 }, // 10th Slab milestone 20%
  { month: 12, label: "M12 (Dec)", phase: "11th & 12th Floor Casting", outflowCr: 2.25, inflowCr: 0.0 },
  { month: 13, label: "M13 (Jan)", phase: "Structural Topping Out", outflowCr: 1.85, inflowCr: 2.4 }, // Structural complete 15%
  { month: 14, label: "M14 (Feb)", phase: "Plastering & Internal MEP", outflowCr: 1.65, inflowCr: 0.0 },
  { month: 15, label: "M15 (Mar)", phase: "Waterproofing & Tiling", outflowCr: 1.45, inflowCr: 0.0 },
  { month: 16, label: "M16 (Apr)", phase: "Doors, Windows & Facade", outflowCr: 1.2, inflowCr: 2.0 }, // Finishing milestone 15%
  { month: 17, label: "M17 (May)", phase: "Lift Installation & Substation", outflowCr: 0.95, inflowCr: 0.0 },
  { month: 18, label: "M18 (Jun)", phase: "Statutory OC & Handover", outflowCr: 0.5, inflowCr: 3.8 }, // Final Possession 10%
];

/**
 * Computes Cumulative S-Curve Cashflow and Peak Capital Deficit
 */
export function calculateCashflowSCurve(
  schedule = DEFAULT_MONTHLY_CASHFLOW_SCHEDULE
): CashflowAnalysisSummary {
  let runningOutflow = 0;
  let runningInflow = 0;
  let runningNet = 0;
  let peakDeficit = 0;
  let peakDeficitMonth = 1;

  const monthlySchedule: MonthlyCashflowItem[] = schedule.map((item) => {
    const plannedOutflowINR = Math.round(item.outflowCr * 10000000);
    const plannedInflowINR = Math.round(item.inflowCr * 10000000);

    runningOutflow += plannedOutflowINR;
    runningInflow += plannedInflowINR;

    const netCashflowINR = plannedInflowINR - plannedOutflowINR;
    runningNet += netCashflowINR;

    if (runningNet < peakDeficit) {
      peakDeficit = runningNet;
      peakDeficitMonth = item.month;
    }

    return {
      monthIndex: item.month,
      monthLabel: item.label,
      activePhase: item.phase,
      plannedOutflowINR,
      cumulativeOutflowINR: runningOutflow,
      plannedInflowINR,
      cumulativeInflowINR: runningInflow,
      netCashflowINR,
      cumulativeNetBalanceINR: runningNet,
      isNegativeExposure: runningNet < 0,
    };
  });

  return {
    totalOutflowINR: runningOutflow,
    totalInflowINR: runningInflow,
    peakDeficitINR: Math.abs(peakDeficit),
    peakDeficitMonth,
    finalSurplusINR: runningNet,
    monthlySchedule,
  };
}
