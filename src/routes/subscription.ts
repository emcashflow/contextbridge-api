import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

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
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    if (!STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'Stripe price ID not configured' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId),
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
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId),
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

// Public: Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await db.update(users)
            .set({
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: 'active',
              subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
              plan: 'pro',
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
          
          console.log(`✅ Subscription activated for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        await db.update(users)
          .set({
            subscriptionStatus: 'past_due',
            updatedAt: new Date(),
          })
          .where(eq(users.stripeCustomerId, customerId));
        
        console.log(`❌ Payment failed for customer ${customerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await db.update(users)
          .set({
            subscriptionStatus: 'cancelled',
            plan: 'free',
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.stripeSubscriptionId, subscription.id));
        
        console.log(`🚫 Subscription cancelled: ${subscription.id}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
