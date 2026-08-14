import cron from 'node-cron';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import logger from './logger';

export const initCronJobs = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running order expiration cron job...');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const BATCH_SIZE = 50;
    let processed = 0;
    let hasMore = true;

    while (hasMore) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const expiredOrders = await Order.find({
            status: 'pending',
            createdAt: { $lt: twoHoursAgo }
          })
            .session(session)
            .limit(BATCH_SIZE)
            .sort({ createdAt: 1 });

          if (expiredOrders.length === 0) {
            hasMore = false;
            return;
          }

          for (const order of expiredOrders) {
            order.status = 'cancelled';
            order.tracking.push({
              status: 'cancelled',
              note: 'Order automatically cancelled due to non-payment within 2 hours.',
              date: new Date()
            });
            
            // Restore inventory
            for (const item of order.items) {
              await Product.findOneAndUpdate(
                { _id: item.product, 'variants.weight': item.variant },
                { 
                  $inc: { 'variants.$.stock': item.quantity, totalSold: -item.quantity } 
                },
                { session }
              );
            }

            await order.save({ session });
            processed++;
          }
          
          hasMore = expiredOrders.length === BATCH_SIZE;
        });
      } catch (error: any) {
        logger.error('Error in order expiration cron job:', { error: error.message || error });
        hasMore = false;
      } finally {
        await session.endSession();
      }
    }
    
    if (processed > 0) {
      logger.info(`Cron job completed: cancelled ${processed} expired orders.`);
    }
  });
};
