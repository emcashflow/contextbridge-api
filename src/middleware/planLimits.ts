import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, memories } from '../db/schema';
import { eq, sql, count, and, gt } from 'drizzle-orm';
import { AuthRequest } from './auth';

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxMemories: 100,
    dailyApiCalls: 100,
    retentionDays: 7,
  },
  pro: {
    maxMemories: 10000,
    dailyApiCalls: 1000,
    retentionDays: 365,
  },
};

// Get user's current plan
export async function getUserPlan(userId: string): Promise<'free' | 'pro'> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { subscriptionStatus: true, plan: true },
  });
  
  // Check both subscription status AND plan field
  return (user?.subscriptionStatus === 'active' || user?.plan === 'pro') ? 'pro' : 'free';
}

// Check if user has exceeded memory limit
export async function checkMemoryLimit(userId: string, plan: 'free' | 'pro'): Promise<boolean> {
  const limit = PLAN_LIMITS[plan].maxMemories;
  
  const result = await db
    .select({ count: count() })
    .from(memories)
    .where(eq(memories.userId, userId));
  
  const currentCount = result[0]?.count || 0;
  return currentCount >= limit;
}

// Middleware to enforce plan limits on memory creation
export async function enforceMemoryLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const plan = await getUserPlan(userId);
    const limit = PLAN_LIMITS[plan];
    
    // Check memory count
    const hasExceeded = await checkMemoryLimit(userId, plan);
    if (hasExceeded) {
      return res.status(429).json({
        error: 'Memory limit exceeded',
        message: `Your ${plan} plan allows ${limit.maxMemories} memories. Upgrade to Pro for more.`,
        plan,
        limit: limit.maxMemories,
        upgradeUrl: '/subscription/checkout',
      });
    }
    
    // Add plan info to request for later use
    req.plan = plan;
    req.planLimits = limit;
    
    next();
  } catch (error) {
    console.error('Memory limit check error:', error);
    res.status(500).json({ error: 'Failed to check plan limits' });
  }
}

// Middleware to enforce daily API call limits
export async function enforceApiLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const plan = await getUserPlan(userId);
    const limit = PLAN_LIMITS[plan];
    
    // Get today's API call count from user record
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { 
        dailyApiCalls: true, 
        lastApiCallReset: true,
      },
    });
    
    const now = new Date();
    const lastReset = user?.lastApiCallReset;
    
    // Check if we need to reset the counter (new day)
    let currentCalls = user?.dailyApiCalls || 0;
    if (!lastReset || !isSameDay(now, lastReset)) {
      // Reset counter
      await db.update(users)
        .set({ dailyApiCalls: 0, lastApiCallReset: sql`NOW()` })
        .where(eq(users.id, userId));
      currentCalls = 0;
    }
    
    // Check limit
    if (currentCalls >= limit.dailyApiCalls) {
      return res.status(429).json({
        error: 'Daily API limit exceeded',
        message: `Your ${plan} plan allows ${limit.dailyApiCalls} API calls per day. Resets at midnight UTC.`,
        plan,
        limit: limit.dailyApiCalls,
        used: currentCalls,
        upgradeUrl: '/subscription/checkout',
      });
    }
    
    // Increment counter
    await db.update(users)
      .set({ dailyApiCalls: sql`${users.dailyApiCalls} + 1` })
      .where(eq(users.id, userId));
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.dailyApiCalls);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.dailyApiCalls - currentCalls - 1));
    res.setHeader('X-Plan', plan);
    
    next();
  } catch (error) {
    console.error('API limit check error:', error);
    res.status(500).json({ error: 'Failed to check API limits' });
  }
}

// Middleware to apply retention policy (auto-expire old memories)
export async function applyRetentionPolicy(userId: string, plan: 'free' | 'pro') {
  const retentionDays = PLAN_LIMITS[plan].retentionDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // Delete memories older than retention period
  await db.delete(memories)
    .where(and(
      eq(memories.userId, userId),
      sql`${memories.createdAt} < ${cutoffDate}`
    ));
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

// Extend AuthRequest type to include plan info
declare global {
  namespace Express {
    interface Request {
      plan?: 'free' | 'pro';
      planLimits?: typeof PLAN_LIMITS.free;
    }
  }
}