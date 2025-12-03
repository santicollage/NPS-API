import axios from 'axios';
import { ENV } from '../config/env.js';

/**
 * Send email using Brevo API
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.name - Recipient name
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.htmlContent - Email HTML content
 * @returns {Promise<Object>} Brevo API response
 */
export const sendEmail = async ({ to, name, subject, htmlContent }) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: ENV.EMAIL_SENDER_NAME,
          email: ENV.EMAIL_SENDER,
        },
        to: [
          {
            email: to,
            name: name,
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
      },
      {
        headers: {
          'api-key': ENV.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    // Don't throw error to prevent blocking the main flow, just log it
    return null;
  }
};

/**
 * Send order confirmation emails to customer and admin
 * @param {Object} order - Order object
 * @param {Array} orderItems - Array of order items with product details
 */
export const sendOrderConfirmationEmails = async (order, orderItems) => {
  const customerName = order.customer_name || 'Cliente';
  const customerEmail = order.customer_email;
  const orderId = order.order_id;
  const totalAmount = parseFloat(order.total_amount).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
  });

  // Generate items HTML list
  const itemsHtml = orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${parseFloat(item.price).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</td>
    </tr>
  `
    )
    .join('');

  const itemsTable = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Producto</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Cant.</th>
          <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
  `;

  // 1. Send email to Customer
  if (customerEmail) {
    const customerHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">¡Gracias por tu compra, ${customerName}!</h2>
        <p>Tu pedido <strong>#${orderId}</strong> ha sido confirmado exitosamente.</p>
        
        <h3>Detalles del Pedido:</h3>
        ${itemsTable}
        
        <p style="margin-top: 20px; font-size: 1.2em;"><strong>Total: ${totalAmount}</strong></p>
        
        <p>Dirección de envío: ${order.address_line}, ${order.city}, ${order.department}</p>
        
        <p>Gracias por confiar en NPS Diesel SAS.</p>
      </div>
    `;

    await sendEmail({
      to: customerEmail,
      name: customerName,
      subject: `Confirmación de Pedido #${orderId} - NPS Diesel SAS`,
      htmlContent: customerHtmlContent,
    });
  }

  // 2. Send email to Admin
  const adminHtmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Nuevo Pedido Confirmado</h2>
      <p>Se ha recibido un nuevo pedido <strong>#${orderId}</strong>.</p>
      
      <h3>Información del Cliente:</h3>
      <p>
        <strong>Nombre:</strong> ${customerName}<br>
        <strong>Email:</strong> ${customerEmail}<br>
        <strong>Teléfono:</strong> ${order.customer_phone}<br>
        <strong>Documento:</strong> ${order.customer_document}
      </p>
      
      <h3>Detalles del Pedido:</h3>
      ${itemsTable}
      
      <p style="margin-top: 20px; font-size: 1.2em;"><strong>Total: ${totalAmount}</strong></p>
      
      <p><strong>Dirección de envío:</strong> ${order.address_line}, ${order.city}, ${order.department}</p>
    </div>
  `;

  await sendEmail({
    to: ENV.ADMIN_EMAIL,
    name: 'Administrador NPS Diesel',
    subject: `Nuevo Pedido #${orderId} - ${customerName}`,
    htmlContent: adminHtmlContent,
  });
};
