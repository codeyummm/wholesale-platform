const axios = require('axios');
const { getValidShopifyToken } = require('../utils/shopifyAuth');
const Sale = require('../models/Sale');

const syncShopifyOrders = async () => {
  try {
    const { accessToken, storeDomain } = await getValidShopifyToken();

    // Fetch all orders (any status)
    const response = await axios.get(`https://${storeDomain}/admin/api/2024-01/orders.json?status=any`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      }
    });

    const orders = response.data.orders;
    let syncedCount = 0;

    for (const order of orders) {
      // Check if order already exists in our system
      const existingSale = await Sale.findOne({ externalOrderId: order.id.toString(), channel: 'shopify' });
      
      if (!existingSale) {
        // Map Shopify Order to UDEAL Sale
        const items = order.line_items.map(item => ({
          model: item.name,
          sku: item.sku,
          salePrice: parseFloat(item.price),
          externalLineItemId: item.id.toString()
        }));

        const User = require('../models/User');
        const defaultUser = await User.findOne();

        const newSale = new Sale({
          saleNumber: order.order_number.toString(),
          externalOrderId: order.id.toString(),
          customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Shopify Customer',
          items: items,
          subtotal: parseFloat(order.subtotal_price),
          tax: parseFloat(order.total_tax),
          discount: parseFloat(order.total_discounts),
          totalAmount: parseFloat(order.current_total_price),
          paymentMethod: 'shopify',
          paymentStatus: order.financial_status === 'paid' ? 'paid' : 'pending',
          status: 'pending',
          deliveryStatus: 'pending',
          salesChannel: 'shopify',
          createdBy: defaultUser ? defaultUser._id : null,
          platformDetails: {
            shopify: {
              orderId: order.id.toString()
            }
          }
        });

        await newSale.save();
        syncedCount++;
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('Error syncing Shopify orders:', error.response?.data || error.message);
    throw error;
  }
};

const fulfillShopifyOrder = async (orderId, trackingNumber, trackingCompany = 'USPS') => {
  try {
    const { accessToken, storeDomain } = await getValidShopifyToken();

    // Shopify requires fetching fulfillment orders first in newer API versions
    // But for simplicity in REST Admin API 2024-01, we can create a fulfillment
    // First get the fulfillment orders for this order
    const foResponse = await axios.get(`https://${storeDomain}/admin/api/2024-01/orders/${orderId}/fulfillment_orders.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const fulfillmentOrders = foResponse.data.fulfillment_orders;
    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
      throw new Error('No fulfillment orders found for this order.');
    }

    // We take the first open fulfillment order
    const fulfillmentOrderId = fulfillmentOrders.find(fo => fo.status === 'open')?.id;

    if (!fulfillmentOrderId) {
      throw new Error('Order is already fulfilled or cannot be fulfilled.');
    }

    const payload = {
      fulfillment: {
        message: "Your order has been shipped!",
        notify_customer: true,
        tracking_info: {
          number: trackingNumber,
          company: trackingCompany
        },
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id: fulfillmentOrderId
          }
        ]
      }
    };

    const response = await axios.post(`https://${storeDomain}/admin/api/2024-01/fulfillments.json`, payload, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    return response.data.fulfillment;
  } catch (error) {
    console.error('Error fulfilling Shopify order:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  syncShopifyOrders,
  fulfillShopifyOrder
};
