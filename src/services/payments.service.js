import prisma from '../config/db.js';
import axios from 'axios';
import { ENV } from '../config/env.js';
import { createStockMovement } from './stock.service.js';

/**
 * Create payment transaction with Wompi
 * @param {Object} paymentData - Payment data
 * @param {number} paymentData.order_id - Order ID
 * @param {string} [paymentData.currency='COP'] - Currency
 * @param {string} [paymentData.guest_id] - Guest ID (optional)
 * @returns {Promise<Object>} Payment creation response
 */
export const createPayment = async (paymentData) => {
  const { order_id, currency = 'COP', guest_id } = paymentData;

  // Get order details
  const order = await prisma.order.findUnique({
    where: { order_id: parseInt(order_id, 10) },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Check if order already has a payment
  const existingPayment = await prisma.payment.findFirst({
    where: { order_id: parseInt(order_id, 10) },
  });

  if (existingPayment) {
    throw new Error('Order already has a payment');
  }

  // Use order total as amount
  const amount = order.total_amount;

  // For guest orders, validate guest_id matches
  if (!order.user_id && order.guest_id !== guest_id) {
    throw new Error('Invalid guest access to order');
  }

  // Get Wompi configuration from environment
  const wompiPublicKey = ENV.WOMPI_PUBLIC_KEY;
  const wompiPrivateKey = ENV.WOMPI_PRIVATE_KEY;

  // Create payment record with pending status
  const paymentRecordData = {
    order_id: parseInt(order_id, 10),
    amount: parseFloat(amount),
    currency,
    status: 'pending',
  };

  // Add guest_id for guest orders
  if (guest_id) {
    paymentRecordData.guest_id = guest_id;
  }

  const payment = await prisma.payment.create({
    data: paymentRecordData,
  });

  try {
    // Create checkout in Wompi
    const wompiResponse = await axios.post(
      'https://api.wompi.co/v1/checkouts',
      {
        amount_in_cents: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        reference: `order_${order_id}_${Date.now()}`,
        redirect_url: `${ENV.FRONTEND_URL}/payment/success`,
        payment_method: {
          type: 'CARD',
          installments: 1, // Can be made configurable
        },
      },
      {
        headers: {
          Authorization: `Bearer ${wompiPrivateKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Update payment with Wompi checkout ID
    const updatedPayment = await prisma.payment.update({
      where: { payment_id: payment.payment_id },
      data: {
        wompi_transaction_id: wompiResponse.data.data.id,
      },
    });

    return {
      payment_id: updatedPayment.payment_id,
      wompi_checkout_url: wompiResponse.data.data.url,
      status: updatedPayment.status,
    };
  } catch (error) {
    // Update payment status to error
    await prisma.payment.update({
      where: { payment_id: payment.payment_id },
      data: {
        status: 'error',
        method: 'wompi_error',
      },
    });

    throw new Error('Failed to create Wompi transaction');
  }
};

/**
 * Process webhook from Wompi
 * @param {Object} webhookData - Webhook payload
 * @returns {Promise<Object>} Webhook processing result
 */
export const processWebhook = async (webhookData) => {
  const { event, data } = webhookData;

  if (event !== 'transaction.updated') {
    return { message: 'Event not processed' };
  }

  const { transaction } = data;
  const { id: transactionId, status, reference } = transaction;

  // Find payment by transaction ID
  const payment = await prisma.payment.findFirst({
    where: { wompi_transaction_id: transactionId },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Map Wompi status to our status
  let newStatus;
  let orderStatusUpdate = null;

  switch (status) {
    case 'APPROVED':
      newStatus = 'approved';
      orderStatusUpdate = 'paid';
      break;
    case 'DECLINED':
      newStatus = 'declined';
      orderStatusUpdate = 'cancelled';
      break;
    case 'ERROR':
    case 'VOIDED':
      newStatus = 'error';
      orderStatusUpdate = 'cancelled';
      break;
    default:
      newStatus = 'pending';
  }

  // Update payment status
  await prisma.payment.update({
    where: { payment_id: payment.payment_id },
    data: {
      status: newStatus,
    },
  });

  // Update order status if payment was approved or failed
  if (orderStatusUpdate) {
    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { order_id: payment.order_id },
        data: {
          status: orderStatusUpdate,
        },
      });

      // Process stock deduction and movement for approved payments
      if (status === 'APPROVED') {
        // Get order items with product details
        const orderItems = await tx.orderItem.findMany({
          where: { order_id: payment.order_id },
          include: {
            product: {
              select: {
                product_id: true,
                stock_quantity: true,
              },
            },
          },
        });

        // Process each order item
        for (const item of orderItems) {
          const { product_id, quantity } = item;
          const { stock_quantity } = item.product;

          // Check if there's enough stock (should be reserved, but double-check)
          if (quantity > stock_quantity) {
            throw new Error(`Insufficient stock for product ${product_id}`);
          }

          // Decrement stock quantity
          await tx.product.update({
            where: { product_id },
            data: {
              stock_quantity: {
                decrement: quantity,
              },
            },
          });

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              product_id,
              type: 'exit',
              quantity,
              reason: `ORDER_PAID_${payment.order_id}`,
            },
          });
        }

        // Delete any active reservations for this order's cart (if exists)
        // Find the cart associated with the order (user or guest)
        let cart = null;
        if (payment.order.user_id) {
          cart = await tx.cart.findFirst({
            where: {
              user_id: payment.order.user_id,
              status: 'ordered', // Assuming cart is marked as ordered when order is created
            },
          });
        } else if (payment.order.guest_id) {
          cart = await tx.cart.findFirst({
            where: {
              guest_id: payment.order.guest_id,
              status: 'ordered',
            },
          });
        }

        if (cart) {
          await tx.stockReservation.deleteMany({
            where: { cart_id: cart.cart_id },
          });
        }
      } else if (
        status === 'DECLINED' ||
        status === 'ERROR' ||
        status === 'VOIDED'
      ) {
        // For failed payments, clean up reservations to free up stock
        // Find the cart associated with the order (user or guest)
        let cart = null;
        if (payment.order.user_id) {
          cart = await tx.cart.findFirst({
            where: {
              user_id: payment.order.user_id,
              status: 'ordered',
            },
          });
        } else if (payment.order.guest_id) {
          cart = await tx.cart.findFirst({
            where: {
              guest_id: payment.order.guest_id,
              status: 'ordered',
            },
          });
        }

        if (cart) {
          // Delete reservations (they don't count as movements, just free up the stock)
          await tx.stockReservation.deleteMany({
            where: { cart_id: cart.cart_id },
          });
        }
      }
    });
  }

  return { message: 'Webhook processed successfully' };
};

/**
 * Get payment status for order
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID (for authorization, optional)
 * @param {string} guestId - Guest ID (for authorization, optional)
 * @param {boolean} [isAdmin=false] - Whether user is admin
 * @returns {Promise<Object>} Payment object
 */
export const getPaymentByOrderId = async (
  orderId,
  userId,
  guestId,
  isAdmin = false
) => {
  const payment = await prisma.payment.findFirst({
    where: { order_id: parseInt(orderId, 10) },
    include: {
      order: {
        select: {
          user_id: true,
          guest_id: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Check authorization
  if (!isAdmin) {
    const isOwner = userId
      ? payment.order.user_id === userId
      : payment.order.guest_id === guestId;
    if (!isOwner) {
      throw new Error('Forbidden');
    }
  }

  return payment;
};
