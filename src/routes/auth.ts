import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const parsed = signupSchema.parse(req.body);

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.email),
    });

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    
    // Generate API key
    const apiKey = `cb_${uuidv4().replace(/-/g, '')}`;

    const [user] = await db.insert(users).values({
      email: parsed.email,
      passwordHash,
      apiKey,
      plan: 'hobby',
    }).returning();

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      apiKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      apiKey: user.apiKey,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;