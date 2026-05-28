import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import memoryRoutes from './routes/memories';
import subscriptionRoutes from './routes/subscription';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stripe webhook needs raw body - must come before express.json()
app.post('/subscription/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-04-10',
  });
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

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
    const { db } = await import('./db');
    const { users } = await import('./db/schema');
    const { eq } = await import('drizzle-orm');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          await db.update(users)
            .set({
              stripeCustomerId: session.customer,
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
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
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
        const subscription = event.data.object;
        
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

app.use(express.json({ limit: '1mb' }));

// Public routes
app.use('/auth', authRoutes);
app.use('/subscription', subscriptionRoutes);

// Protected routes
app.use('/memories', authMiddleware, memoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 ContextBridge API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;