import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

// Public: Get pricing plans
router.get('/pricing', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
          '100 memories',
          '7-day retention',
          '100 API calls/day',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 9,
        priceId: STRIPE_PRICE_ID,
        features: [
          '10,000 memories',
          '1-year retention',
          '1,000 API calls/day',
          'Email support',
        ],
      },
    ],
  });
});

// Protected: Create checkout session
router.post('/checkout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.body.success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: req.body.cancel_url,
      metadata: {
        userId: user.id,
      },
    });

    res.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Protected: Get subscription status
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      plan: user.plan,
      isActive: user.subscriptionStatus === 'active',
      status: user.subscriptionStatus,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

export default router;
