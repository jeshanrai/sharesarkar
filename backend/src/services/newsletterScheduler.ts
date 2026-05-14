/**
 * Newsletter scheduler.
 *
 * Polls email_settings on startup and after every admin change, then
 * configures a single node-cron job that fires at the configured weekday/hour
 * in Asia/Kathmandu time. When admin toggles `weekly_digest_enabled` off,
 * the active task is destroyed; toggling on starts a fresh one.
 *
 * Restartable mid-process: `applyEmailSettings()` is idempotent — call it
 * after any settings mutation to reschedule.
 */

import cron, { type ScheduledTask } from "node-cron";
import { getEmailSettings, sendDigest } from "./newsletter.js";

let activeTask: ScheduledTask | null = null;
let currentSpec: string | null = null;

/** Build a 5-field cron expression for the configured weekday + hour. */
function buildCronExpression(dayOfWeek: number, hour: number): string {
  // minute hour dayOfMonth month dayOfWeek
  // We send at minute 0 of the configured hour, weekly.
  return `0 ${hour} * * ${dayOfWeek}`;
}

/**
 * Read current settings and (re)configure the scheduled task.
 * Call this at startup and after any UPDATE on email_settings.
 */
export async function applyEmailSettings(): Promise<void> {
  const settings = await getEmailSettings();

  // If disabled, kill any existing task and bail.
  if (!settings.weekly_digest_enabled) {
    if (activeTask) {
      activeTask.stop();
      activeTask = null;
      currentSpec = null;
      console.log("[newsletter] Weekly digest disabled — scheduler stopped.");
    }
    return;
  }

  const spec = buildCronExpression(
    settings.weekly_digest_day_of_week,
    settings.weekly_digest_hour
  );

  // No-op if nothing changed (avoids tearing down a healthy task on every UI save).
  if (activeTask && currentSpec === spec) return;

  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }

  if (!cron.validate(spec)) {
    console.error(`[newsletter] Invalid cron expression "${spec}" — scheduler not started.`);
    return;
  }

  activeTask = cron.schedule(
    spec,
    async () => {
      console.log("[newsletter] Cron fired — building weekly digest.");
      try {
        const result = await sendDigest();
        if (result.reason) {
          console.log(`[newsletter] Skipped: ${result.reason}`);
        } else {
          console.log(
            `[newsletter] Digest sent: ${result.sent}/${result.total} recipients, ${result.articles} articles.`
          );
        }
      } catch (err) {
        console.error("[newsletter] Send failed:", (err as Error).message);
      }
    },
    { timezone: "Asia/Kathmandu" }
  );

  currentSpec = spec;
  console.log(
    `[newsletter] Scheduler armed — cron "${spec}" Asia/Kathmandu (day ${settings.weekly_digest_day_of_week}, hour ${settings.weekly_digest_hour}).`
  );
}

/**
 * Returns a UI-friendly description of when the next send is expected.
 * "Monday 06:00 NPT" or "Disabled".
 */
export function describeSchedule(dayOfWeek: number, hour: number, enabled: boolean): string {
  if (!enabled) return "Disabled";
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hh = hour.toString().padStart(2, "0");
  return `${days[dayOfWeek]} ${hh}:00 NPT`;
}
