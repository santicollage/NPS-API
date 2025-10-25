import prisma from '../config/db.js';
import axios from 'axios';
import { ENV } from '../config/env.js';

/**
 * Create payment transaction with Wompi
 * @param {Object} paymentData - Payment data
 * @param {number} paymentData.order_id - Order ID
 * @param {number} paymentData.amount - Amount in COP
 * @param {string} [paymentData.currency='COP'] - Currency
 * @returns {Promise<Object>} Payment creation response
 */
export const createPayment = async (paymentData) => {
  const { order_id, amount, currency = 'COP' } = paymentData;

  // Get order details
  const order = await prisma.order.findUnique({
    where: { order_id: parseInt(order_id, 10) },
    include: {
      user: {
        select: {
          user_id: true,
          name: true,
          email: true,
        },
      },
    },
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

  // Validate amount matches order total
  if (parseFloat(amount) !== parseFloat(order.total_amount)) {
    throw new Error('Payment amount does not match order total');
  }

  // Get Wompi configuration from environment
  const wompiPublicKey = ENV.WOMPI_PUBLIC_KEY;
  const wompiPrivateKey = ENV.WOMPI_PRIVATE_KEY;

  // Create payment record with pending status
  const payment = await prisma.payment.create({
    data: {
      order_id: parseInt(order_id, 10),
      amount: parseFloat(amount),
      currency,
      status: 'pending',
    },
  });

  try {
    // Create transaction in Wompi
    const wompiResponse = await axios.post(
      'https://api.wompi.co/v1/transactions',
      {
        amount_in_cents: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency,
        customer_email: order.user.email,
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

    // Update payment with Wompi transaction ID and checkout URL
    const updatedPayment = await prisma.payment.update({
      where: { payment_id: payment.payment_id },
      data: {
        wompi_transaction_id: wompiResponse.data.data.id,
      },
    });

    return {
      payment_id: updatedPayment.payment_id,
      wompi_checkout_url:
        wompiResponse.data.data.payment_method.extra.checkout_url,
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
      break;
    case 'ERROR':
    case 'VOIDED':
      newStatus = 'error';
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

  // Update order status if payment was approved
  if (orderStatusUpdate) {
    await prisma.order.update({
      where: { order_id: payment.order_id },
      data: {
        status: orderStatusUpdate,
      },
    });
  }

  return { message: 'Webhook processed successfully' };
};

/**
 * Get payment status for order
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID (for authorization)
 * @param {boolean} [isAdmin=false] - Whether user is admin
 * @returns {Promise<Object>} Payment object
 */
export const getPaymentByOrderId = async (orderId, userId, isAdmin = false) => {
  const payment = await prisma.payment.findFirst({
    where: { order_id: parseInt(orderId, 10) },
    include: {
      order: {
        select: {
          user_id: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Check authorization
  if (!isAdmin && payment.order.user_id !== userId) {
    throw new Error('Forbidden');
  }

  return payment;
};
