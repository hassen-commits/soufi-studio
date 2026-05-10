import cron, { type ScheduledTask } from "node-cron";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import { runWeeklyProduction } from "./weekly-production.js";
import { runDailyPublisher } from "./daily-publisher.js";

const tasks: ScheduledTask[] = [];

const SCHEDULES = {
  // Dimanche 22h Europe/Paris : produit l'épisode de la semaine
  weekly: "0 22 * * 0",
  // Lundi-Samedi 12h Europe/Paris : publie le prochain épisode prêt
  daily: "0 12 * * 1-6",
};

export function startCronJobs(): void {
  if (!env.CRON_ENABLED) {
    logger.info(
      "[cron] disabled (set CRON_ENABLED=true in .env pour activer la production auto)",
    );
    return;
  }

  tasks.push(
    cron.schedule(
      SCHEDULES.weekly,
      async () => {
        logger.info("[cron] weekly-production triggered");
        try {
          const r = await runWeeklyProduction();
          logger.info(r, "[cron] weekly-production done");
        } catch (e) {
          logger.error(e, "[cron] weekly-production crashed");
        }
      },
      { timezone: env.CRON_TIMEZONE, scheduled: true },
    ),
  );

  tasks.push(
    cron.schedule(
      SCHEDULES.daily,
      async () => {
        logger.info("[cron] daily-publisher triggered");
        try {
          const r = await runDailyPublisher();
          logger.info(r, "[cron] daily-publisher done");
        } catch (e) {
          logger.error(e, "[cron] daily-publisher crashed");
        }
      },
      { timezone: env.CRON_TIMEZONE, scheduled: true },
    ),
  );

  logger.info(
    { schedules: SCHEDULES, tz: env.CRON_TIMEZONE },
    `[cron] ${tasks.length} jobs registered`,
  );
}

export function stopCronJobs(): void {
  tasks.forEach((t) => t.stop());
  tasks.length = 0;
  logger.info("[cron] stopped");
}
