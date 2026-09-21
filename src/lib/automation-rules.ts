export const AUTOMATION_KEYS = ["payment_recovery", "low_stock", "fulfillment_delay", "abandoned_cart"] as const;
export type AutomationKey = typeof AUTOMATION_KEYS[number];
export type AutomationMode = "alert_only" | "assisted";

export interface AutomationRule {
  key: AutomationKey;
  name: string;
  description: string;
  enabled: boolean;
  mode: AutomationMode;
  threshold: number;
  thresholdLabel: string;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  { key: "payment_recovery", name: "Payment recovery", description: "Flag unpaid orders that remain pending beyond the configured window.", enabled: true, mode: "assisted", threshold: 30, thresholdLabel: "Minutes pending" },
  { key: "low_stock", name: "Low-stock watch", description: "Create replenishment work when stock reaches the configured unit level.", enabled: true, mode: "alert_only", threshold: 10, thresholdLabel: "Units remaining" },
  { key: "fulfillment_delay", name: "Fulfilment delay", description: "Escalate processing orders that have not moved within the service window.", enabled: true, mode: "alert_only", threshold: 48, thresholdLabel: "Hours processing" },
  { key: "abandoned_cart", name: "Abandoned checkout", description: "Surface consented carts for human-reviewed recovery after customer inactivity.", enabled: true, mode: "assisted", threshold: 60, thresholdLabel: "Minutes inactive" },
];

export function normalizeAutomationRule(input: Partial<AutomationRule>, fallback: AutomationRule): AutomationRule {
  return { ...fallback, enabled: input.enabled === true, mode: input.mode === "assisted" ? "assisted" : "alert_only", threshold: Math.max(1, Math.min(10080, Number(input.threshold) || fallback.threshold)) };
}
