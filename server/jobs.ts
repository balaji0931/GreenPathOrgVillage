import Queue from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryDelayOnFailover: 100,
};

export const reportQueue = new Queue('report-generation', REDIS_URL, {
  redis: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    stalledInterval: 30000,
    maxStalledCount: 3,
  },
});

export const notificationQueue = new Queue('notifications', REDIS_URL, {
  redis: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
  },
});

export const cleanupQueue = new Queue('cleanup', REDIS_URL, {
  redis: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 1,
  },
});

// Phase 3: Stats update queue for daily monthly stats updates
export const statsQueue = new Queue('stats-update', REDIS_URL, {
  redis: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 2,
  },
});

export interface ReportJobData {
  type: 'daily' | 'weekly' | 'monthly';
  villageId?: string;
  startDate?: string;
  endDate?: string;
  requestedBy?: number;
}

export interface NotificationJobData {
  type: 'issue_update' | 'collection_reminder' | 'announcement';
  targetUserIds?: number[];
  villageId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface CleanupJobData {
  type: 'old_sessions' | 'expired_cache' | 'old_logs';
  olderThan?: number;
}

export function initializeJobProcessors(storage: any) {
  reportQueue.process('generate-report', async (job) => {
    const data = job.data as ReportJobData;
    console.log(`Processing report job: ${data.type} for village ${data.villageId || 'all'}`);
    
    try {
      if (data.villageId) {
        const reportData = await storage.getDailyReportData(data.villageId);
        console.log(`Report generated for village ${data.villageId}: ${reportData.totalHouseholds} households`);
        return { success: true, reportData };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Report generation failed:', error);
      throw error;
    }
  });

  // Phase 3: Daily job to update current month stats
  statsQueue.process('update-current-month-stats', async (job) => {
    console.log('🔄 Phase 3: Updating current month village stats...');
    
    try {
      const recordsUpdated = await storage.updateCurrentMonthStats();
      console.log(`✅ Phase 3: Updated ${recordsUpdated} current month stats records`);
      return { success: true, recordsUpdated };
    } catch (error) {
      console.error('Phase 3: Stats update failed:', error);
      throw error;
    }
  });

  cleanupQueue.process('cleanup-sessions', async (job) => {
    const data = job.data as CleanupJobData;
    console.log(`Running cleanup job: ${data.type}`);
    
    return { success: true, cleaned: 0 };
  });

  reportQueue.on('completed', (job, result) => {
    console.log(`Report job ${job.id} completed successfully`);
  });

  reportQueue.on('failed', (job, err) => {
    console.error(`Report job ${job?.id} failed:`, err.message);
  });

  cleanupQueue.on('completed', (job, result) => {
    console.log(`Cleanup job ${job.id} completed`);
  });

  statsQueue.on('completed', (job, result) => {
    console.log(`Stats update job ${job.id} completed: updated ${result?.recordsUpdated || 0} records`);
  });

  statsQueue.on('failed', (job, err) => {
    console.error(`Stats update job ${job?.id} failed:`, err.message);
  });

  console.log('🔧 Background job processors initialized');
}

export async function scheduleReportGeneration(data: ReportJobData, delay?: number) {
  const options = delay ? { delay } : {};
  return reportQueue.add('generate-report', data, options);
}

export async function scheduleNotification(data: NotificationJobData) {
  return notificationQueue.add('send-notification', data);
}

export async function scheduleCleanup(data: CleanupJobData, cronExpression?: string) {
  if (cronExpression) {
    return cleanupQueue.add('cleanup-sessions', data, {
      repeat: { cron: cronExpression }
    });
  }
  return cleanupQueue.add('cleanup-sessions', data);
}

// Phase 3: Schedule daily stats update at 12:05 AM (after potential date changes at midnight)
export async function scheduleCurrentMonthStatsUpdate() {
  return statsQueue.add('update-current-month-stats', {}, {
    repeat: {
      cron: '5 0 * * *', // Daily at 12:05 AM UTC
      tz: 'UTC'
    }
  });
}

export async function getQueueStats() {
  const [reportWaiting, reportActive, reportCompleted, reportFailed] = await Promise.all([
    reportQueue.getWaitingCount(),
    reportQueue.getActiveCount(),
    reportQueue.getCompletedCount(),
    reportQueue.getFailedCount(),
  ]);

  const [cleanupWaiting, cleanupActive] = await Promise.all([
    cleanupQueue.getWaitingCount(),
    cleanupQueue.getActiveCount(),
  ]);

  return {
    reports: {
      waiting: reportWaiting,
      active: reportActive,
      completed: reportCompleted,
      failed: reportFailed,
    },
    cleanup: {
      waiting: cleanupWaiting,
      active: cleanupActive,
    },
  };
}

export async function closeQueues() {
  await Promise.all([
    reportQueue.close(),
    notificationQueue.close(),
    cleanupQueue.close(),
    statsQueue.close(),
  ]);
  console.log('🔧 Background job queues closed');
}
