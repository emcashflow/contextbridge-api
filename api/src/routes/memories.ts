import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { memories } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const rememberSchema = z.object({
  content: z.string().min(1).max(10000),
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  ttl: z.number().optional(), // Time to live in seconds
});

const recallSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
});

// POST /remember - Store a memory
router.post('/remember', async (req: AuthRequest, res) => {
  try {
    const parsed = rememberSchema.parse(req.body);
    const userId = req.user!.id;

    let expiresAt: Date | undefined;
    if (parsed.ttl) {
      expiresAt = new Date(Date.now() + parsed.ttl * 1000);
    }

    const [memory] = await db.insert(memories).values({
      userId,
      sessionId: parsed.sessionId,
      agentId: parsed.agentId,
      content: parsed.content,
      metadata: parsed.metadata || {},
      expiresAt,
    }).returning();

    res.json({
      success: true,
      memory: {
        id: memory.id,
        content: memory.content,
        createdAt: memory.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Remember error:', error);
    res.status(500).json({ error: 'Failed to store memory' });
  }
});

// GET /recall - Retrieve memories
router.get('/recall', async (req: AuthRequest, res) => {
  try {
    const parsed = recallSchema.parse({
      sessionId: req.query.sessionId,
      agentId: req.query.agentId,
      query: req.query.query,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    });
    const userId = req.user!.id;

    let query = db.query.memories.findMany({
      where: and(
        eq(memories.userId, userId),
        parsed.sessionId ? eq(memories.sessionId, parsed.sessionId) : undefined,
        parsed.agentId ? eq(memories.agentId, parsed.agentId) : undefined,
        sql`${memories.expiresAt} IS NULL OR ${memories.expiresAt} > NOW()`
      ),
      orderBy: [desc(memories.createdAt)],
      limit: parsed.limit,
    });

    const results = await query;

    // Simple text search if query provided
    let filtered = results;
    if (parsed.query) {
      const searchTerm = parsed.query.toLowerCase();
      filtered = results.filter(m => 
        m.content.toLowerCase().includes(searchTerm) ||
        JSON.stringify(m.metadata).toLowerCase().includes(searchTerm)
      );
    }

    res.json({
      success: true,
      memories: filtered.map(m => ({
        id: m.id,
        content: m.content,
        sessionId: m.sessionId,
        agentId: m.agentId,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
      count: filtered.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Recall error:', error);
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

// DELETE /forget/:id - Delete a specific memory
router.delete('/forget/:id', async (req: AuthRequest, res) => {
  try {
    const memoryId = req.params.id;
    const userId = req.user!.id;

    const [deleted] = await db.delete(memories)
      .where(and(
        eq(memories.id, memoryId),
        eq(memories.userId, userId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({ success: true, message: 'Memory deleted' });
  } catch (error) {
    console.error('Forget error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// DELETE /forget-all - Delete all memories (with optional filters)
router.delete('/forget-all', async (req: AuthRequest, res) => {
  try {
    const { sessionId, agentId } = req.query;
    const userId = req.user!.id;

    let query = db.delete(memories).where(eq(memories.userId, userId));
    
    if (sessionId) {
      query = query.where(eq(memories.sessionId, sessionId as string));
    }
    if (agentId) {
      query = query.where(eq(memories.agentId, agentId as string));
    }

    const result = await query.returning();

    res.json({ 
      success: true, 
      message: `Deleted ${result.length} memories`,
      count: result.length,
    });
  } catch (error) {
    console.error('Forget all error:', error);
    res.status(500).json({ error: 'Failed to delete memories' });
  }
});

export default router;