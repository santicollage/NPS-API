import prisma from '../config/db.js';
import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { createStockMovement } from './stock.service.js';
import { sendOrderConfirmationEmails } from './email.service.js';

/**
 * Create payment transaction with PayU
 * This function does not require authentication and supports both authenticated users and guest users.
 * For guest orders (orders without user_id), the guest_id parameter is required and must match the order's guest_id.
 * @param {Object} paymentData - Payment data
 * @param {number} paymentData.order_id - Order ID to create payment for
 * @param {string} [paymentData.guest_id] - Guest ID (required for guest orders, must match order's guest_id)
 * @returns {Promise<Object>} Payment creation response with payment_id, payu_checkout_url, and status
 * @throws {Error} 'Order not found' - If the order does not exist
 * @throws {Error} 'Order already has a payment' - If the order already has an associated payment
 * @throws {Error} 'Invalid guest access to order' - If guest_id is provided but doesn't match the order's guest_id
 * @throws {Error} 'PayU configuration missing' - If PayU credentials are not configured
 * @throws {Error} 'Failed to create PayU transaction' - If PayU API call fails
 */
export const createPayment = async (paymentData) => {
  const { order_id, guest_id } = paymentData;
  const currency = 'COP'; // Fixed currency for Colombia

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

  // Get PayU configuration from environment
  const merchantId = ENV.PAYU_MERCHANT_ID;
  const accountId = ENV.PAYU_ACCOUNT_ID;
  const apiKey = ENV.PAYU_API_KEY;
  const apiLogin = ENV.PAYU_API_LOGIN;
  const payuApiUrl = ENV.PAYU_API_URL;

  if (!merchantId || !accountId || !apiKey || !apiLogin || !payuApiUrl) {
    throw new Error('PayU configuration missing');
  }

  // Generate unique reference code
  const referenceCode = `order_${order_id}_${Date.now()}`;

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
    // Calculate signature for PayU
    // Signature format: API_KEY~MERCHANT_ID~REFERENCE_CODE~AMOUNT~CURRENCY
    const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${parseFloat(amount)}~${currency}`;
    const signature = crypto
      .createHash('md5')
      .update(signatureString)
      .digest('hex');

    // Prepare PayU payment request
    // PayU Latam API structure
    const payuRequest = {
      language: 'es',
      command: 'SUBMIT_TRANSACTION',
      merchant: {
        apiKey: apiKey,
        apiLogin: apiLogin,
      },
      transaction: {
        order: {
          accountId: accountId,
          referenceCode: referenceCode,
          description: `Pago de orden #${order_id}`,
          language: 'es',
          signature: signature,
          notifyUrl: `${ENV.FRONTEND_URL}/api/payments/webhook`,
          additionalValues: {
            TX_VALUE: {
              value: parseFloat(amount),
              currency: currency,
            },
          },
          buyer: {
            merchantBuyerId:
              order.user_id?.toString() || order.guest_id || 'guest',
            fullName: order.customer_name || 'Cliente',
            emailAddress: order.customer_email || '',
            contactPhone: order.customer_phone || '',
            dniNumber: order.customer_document || '',
            shippingAddress: {
              street1: order.address_line || '',
              city: order.city || '',
              state: order.department || '',
              country: 'CO',
              postalCode: order.postal_code || '',
            },
          },
        },
        payer: {
          merchantPayerId:
            order.user_id?.toString() || order.guest_id || 'guest',
          fullName: order.customer_name || 'Cliente',
          emailAddress: order.customer_email || '',
          contactPhone: order.customer_phone || '',
          dniNumber: order.customer_document || '',
        },
        extraParameters: {
          INSTALLMENTS_NUMBER: 1,
        },
        type: 'AUTHORIZATION_AND_CAPTURE',
        paymentMethod: null, // Will be selected by user in PayU checkout
        paymentCountry: 'CO',
        deviceSessionId: `session_${Date.now()}`,
        ipAddress: '127.0.0.1',
        cookie: `cookie_${Date.now()}`,
        userAgent: 'Mozilla/5.0',
      },
      test: environment === 'sandbox',
    };

    // Create payment in PayU
    const payuResponse = await axios.post(payuApiUrl, payuRequest, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Check if PayU response is successful
    if (
      payuResponse.data &&
      payuResponse.data.code === 'SUCCESS' &&
      payuResponse.data.transactionResponse
    ) {
      const transactionResponse = payuResponse.data.transactionResponse;
      const transactionId = transactionResponse.transactionId;
      const orderId = transactionResponse.orderId;
      const state = transactionResponse.state;

      // Get payment URL from response (could be in extraParameters or paymentUrl)
      const paymentUrl =
        transactionResponse.extraParameters?.BANK_URL ||
        transactionResponse.extraParameters?.PAYMENT_URL ||
        transactionResponse.paymentUrl ||
        `${ENV.FRONTEND_URL}/payment/process`;

      // Update payment with PayU transaction ID
      const updatedPayment = await prisma.payment.update({
        where: { payment_id: payment.payment_id },
        data: {
          payu_transaction_id: transactionId?.toString(),
        },
      });

      return {
        payment_id: updatedPayment.payment_id,
        payu_checkout_url: paymentUrl,
        status: updatedPayment.status,
        reference_code: referenceCode,
        transaction_id: transactionId,
      };
    } else {
      const errorMessage =
        payuResponse.data?.error ||
        payuResponse.data?.message ||
        'Failed to create PayU transaction';
      throw new Error(errorMessage);
    }
  } catch (error) {
    // Update payment status to error
    await prisma.payment.update({
      where: { payment_id: payment.payment_id },
      data: {
        status: 'error',
        method: 'payu_error',
      },
    });

    throw new Error('Failed to create PayU transaction');
  }
};

/**
 * Process webhook from PayU
 * @param {Object} webhookData - Webhook payload
 * @returns {Promise<Object>} Webhook processing result
 */
export const processWebhook = async (webhookData) => {
  // PayU webhook structure
  const { state_pol, transaction_id, reference_pol, reference_sale } =
    webhookData;

  if (!transaction_id && !reference_sale) {
    return { message: 'Event not processed' };
  }

  // Find payment by transaction ID or reference code
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { payu_transaction_id: transaction_id?.toString() },
        // Could also search by reference if stored
      ],
    },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Map PayU status to our status
  // PayU states: 4=APPROVED, 5=EXPIRED, 6=DECLINED, 7=PENDING, etc.
  let newStatus;
  let orderStatusUpdate = null;

  switch (state_pol) {
    case '4': // APPROVED
      newStatus = 'approved';
      orderStatusUpdate = 'paid';
      break;
    case '6': // DECLINED
    case '5': // EXPIRED
      newStatus = 'declined';
      orderStatusUpdate = 'cancelled';
      break;
    case '7': // PENDING
      newStatus = 'pending';
      break;
    default:
      newStatus = 'error';
      orderStatusUpdate = 'cancelled';
  }

  // Update payment status
  await prisma.payment.update({
    where: { payment_id: payment.payment_id },
    data: {
      status: newStatus,
    },
  });

  let emailData = null;

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
      if (state_pol === '4') {
        // Get order items with product details
        const orderItems = await tx.orderItem.findMany({
          where: { order_id: payment.order_id },
          include: {
            product: {
              select: {
                product_id: true,
                stock_quantity: true,
                name: true,
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

        // Prepare data for email (captured inside transaction to ensure we have the items)
        emailData = {
          order: payment.order,
          items: orderItems,
        };

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
      } else if (state_pol === '6' || state_pol === '5') {
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

  // Send emails if payment was approved and data is available
  if (emailData) {
    await sendOrderConfirmationEmails(emailData.order, emailData.items);
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
