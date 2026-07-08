const axios = require('axios');
const { getValidShopifyToken } = require('../utils/shopifyAuth');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const User = require('../models/User');

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

    const defaultUser = await User.findOne();

    for (const order of orders) {
      // Check if order already exists in our system
      const existingSale = await Sale.findOne({ externalOrderId: order.id.toString(), salesChannel: 'shopify' });
      
      if (!existingSale) {
        
        // 1. Create or Find Customer
        let customerRecord = null;
        if (order.customer) {
          const email = order.customer.email || order.contact_email;
          const phone = order.customer.phone || order.phone;
          const firstName = order.customer.first_name || '';
          const lastName = order.customer.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'Shopify Customer';
          
          if (email || phone) {
            const orConditions = [];
            if (email) orConditions.push({ 'contact.email': email });
            if (phone) orConditions.push({ 'contact.phone': phone });
            
            customerRecord = await Customer.findOne({ $or: orConditions });
          }
          
          if (!customerRecord) {
            customerRecord = new Customer({
              name: fullName,
              type: 'retail',
              contact: {
                email: email || undefined,
                phone: phone || '0000000000'
              },
              createdBy: defaultUser ? defaultUser._id : null
            });
            await customerRecord.save();
          }
        }
        
        // 2. Map Items
        const items = order.line_items.map(item => ({
          model: item.name,
          sku: item.sku,
          salePrice: parseFloat(item.price) - parseFloat(item.total_discount || 0),
          externalLineItemId: item.id.toString()
        }));

        // 3. Status Mapping
        let status = 'pending';
        let deliveryStatus = 'pending';
        if (order.fulfillment_status === 'fulfilled') {
          status = 'shipped'; // or delivered
          deliveryStatus = 'shipped';
        } else if (order.fulfillment_status === 'partial') {
          deliveryStatus = 'processing';
        }
        
        if (order.financial_status === 'refunded') status = 'refunded';
        if (order.cancelled_at) status = 'cancelled';

        // 4. Tracking and Shipping Info
        let trackingNumber = '';
        let carrier = '';
        if (order.fulfillments && order.fulfillments.length > 0) {
          const fulfillment = order.fulfillments[0];
          trackingNumber = fulfillment.tracking_number || '';
          carrier = fulfillment.tracking_company || '';
          if (fulfillment.status === 'success') {
            status = 'delivered';
            deliveryStatus = 'delivered';
          }
        }

        // 5. Shipping Address
        let address = {};
        if (order.shipping_address) {
          address = {
            name: order.shipping_address.name,
            street: order.shipping_address.address1 + (order.shipping_address.address2 ? ` ${order.shipping_address.address2}` : ''),
            city: order.shipping_address.city,
            state: order.shipping_address.province_code || order.shipping_address.province,
            zipCode: order.shipping_address.zip,
            country: order.shipping_address.country_code || order.shipping_address.country,
            phone: order.shipping_address.phone
          };
        }

        const newSale = new Sale({
          saleNumber: order.order_number.toString(),
          externalOrderId: order.id.toString(),
          customer: customerRecord ? customerRecord._id : null,
          customerName: customerRecord ? customerRecord.name : 'Shopify Customer',
          items: items,
          subtotal: parseFloat(order.subtotal_price),
          tax: parseFloat(order.total_tax),
          discount: 0, // Discounts are applied directly to line items
          totalAmount: parseFloat(order.current_total_price),
          paymentMethod: 'shopify',
          paymentStatus: order.financial_status === 'paid' ? 'paid' : 'pending',
          status: status,
          deliveryStatus: deliveryStatus,
          salesChannel: 'shopify',
          createdAt: order.created_at, // IMPORTANT: Use Shopify's created date
          createdBy: defaultUser ? defaultUser._id : null,
          shipping: {
            trackingNumber,
            carrier,
            address
          },
          platformDetails: {
            shopify: {
              orderId: order.id.toString()
            }
          }
        });

        await newSale.save();
        syncedCount++;
      } else {
        // If order exists, we should update it if status changed
        let needsUpdate = false;
        
        let status = existingSale.status;
        let deliveryStatus = existingSale.deliveryStatus;
        if (order.fulfillment_status === 'fulfilled' && existingSale.status === 'pending') {
          status = 'shipped';
          deliveryStatus = 'shipped';
          needsUpdate = true;
        }
        
        let trackingNumber = existingSale.shipping?.trackingNumber || '';
        let carrier = existingSale.shipping?.carrier || '';
        if (order.fulfillments && order.fulfillments.length > 0) {
          const fulfillment = order.fulfillments[0];
          if (fulfillment.tracking_number && !trackingNumber) {
            trackingNumber = fulfillment.tracking_number;
            carrier = fulfillment.tracking_company;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          existingSale.status = status;
          existingSale.deliveryStatus = deliveryStatus;
          if (!existingSale.shipping) existingSale.shipping = {};
          existingSale.shipping.trackingNumber = trackingNumber;
          existingSale.shipping.carrier = carrier;
          await existingSale.save();
          syncedCount++;
        }
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

    const foResponse = await axios.get(`https://${storeDomain}/admin/api/2024-01/orders/${orderId}/fulfillment_orders.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });

    const fulfillmentOrders = foResponse.data.fulfillment_orders;
    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
      throw new Error('No fulfillment orders found for this order.');
    }

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
