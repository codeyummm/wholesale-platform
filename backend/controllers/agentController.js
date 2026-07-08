/**
 * Nova — Full Database Command Engine
 * Access: Sales, Inventory, Devices, Customers, Suppliers
 * 100% local. No AI APIs. No external servers.
 */

const Sale      = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Customer  = require('../models/Customer');
const Supplier  = require('../models/Supplier');
const { fetchLiveTracking } = require('./trackingController');

// ─────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────

const fmt = {
  money: (n) => `$${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
  num:   (n) => Number(n || 0).toLocaleString(),
  cap:   (s) => (s || '').charAt(0).toUpperCase() + (s || '').slice(1),
  date:  (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
};

// ── Date range parser ─────────────────────────────────────────────
function buildDateQuery(text) {
  const lc = text.toLowerCase();
  const days = (() => { const m = text.match(/(\d+)\s*days?/i); return m ? parseInt(m[1]) : null; })();
  if (days) { const d = new Date(); d.setDate(d.getDate() - days); return { $gte: d }; }
  const map = {
    'today':      () => { const s = new Date(); s.setHours(0,0,0,0); return { $gte: s }; },
    'yesterday':  () => { const s = new Date(); s.setDate(s.getDate()-1); s.setHours(0,0,0,0); const e = new Date(s); e.setHours(23,59,59,999); return { $gte: s, $lte: e }; },
    'this week':  () => { const s = new Date(); s.setDate(s.getDate()-7); return { $gte: s }; },
    'week':       () => { const s = new Date(); s.setDate(s.getDate()-7); return { $gte: s }; },
    'this month': () => { const s = new Date(); s.setDate(1); s.setHours(0,0,0,0); return { $gte: s }; },
    'month':      () => { const s = new Date(); s.setDate(1); s.setHours(0,0,0,0); return { $gte: s }; },
    'this year':  () => { const s = new Date(); s.setMonth(0,1); s.setHours(0,0,0,0); return { $gte: s }; },
    'year':       () => { const s = new Date(); s.setMonth(0,1); s.setHours(0,0,0,0); return { $gte: s }; },
  };
  for (const [kw, fn] of Object.entries(map)) { if (lc.includes(kw)) return fn(); }
  return null;
}

function extractChannel(text) {
  const channels = ['ebay','amazon','walmart','facebook','mercari','offerup','wholesale','in_store','in store','online','whatnot','poshmark','etsy','phone'];
  const lc = text.toLowerCase();
  return channels.find(c => lc.includes(c)) || null;
}

function extractStatus(text) {
  const lc = text.toLowerCase();
  
  // Delivery statuses (check these first so "out for delivery" doesn't hit "delivery/delivered")
  if (/\b(in transit|transit|in_transit)\b/.test(lc)) return 'in_transit';
  if (/\b(out for delivery|out_for_delivery)\b/.test(lc)) return 'out_for_delivery';
  if (/\b(process|processing)\b/.test(lc)) return 'processing';
  if (/\b(hold|on hold)\b/.test(lc)) return 'hold';
  if (/\b(exception|error)\b/.test(lc)) return 'exception';

  // Order statuses (catch misspellings)
  if (/\b(pending|pend)\b/.test(lc)) return 'pending';
  if (/\b(deliver|delivered|deliverd|delivery)\b/.test(lc)) return 'delivered';
  if (/\b(ship|shipped|shiped)\b/.test(lc)) return 'shipped';
  if (/\b(cancel|cancelled|canceled|canceld)\b/.test(lc)) return 'cancelled';
  if (/\b(complete|completed)\b/.test(lc)) return 'completed';
  if (/\b(refund|refunded)\b/.test(lc)) return 'refunded';
  
  return null;
}

// Strip filler words, return clean search term
function stripFiller(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Strip punctuation like ?? that breaks RegExp
    .replace(/\b(find|show|get|list|give|tell|what|which|are|me|all|the|a|an|any|for|of|in|on|to|is|do|we|have|you|can|i|please|nova|our|my|their|its|imeilab|lab|report|results?|how many|how much|check|look up|search|fetch|pull|display|imeis?)\b/gi, ' ')
    .replace(/\b(devices?|items?|products?|units?|stock|inventory|available|unavailable|sold|unsold|phones?|models?|brands?|orders?|sales?|customers?|suppliers?|invoices?|records?|color|colors|size|sizes|capacity|storage|memory|condition|network|carrier|status|track|tracking)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
// ── INVENTORY HANDLERS ────────────────────────
// ─────────────────────────────────────────────

async function handleInventoryAll(text) {
  const lc = text.toLowerCase();

  // All available devices
  const isAvailable = /\b(available|unsold|in stock|not sold|remaining)\b/.test(lc);
  const isSold      = /\b(sold|gone|cleared)\b/.test(lc);
  const isLow       = /\b(low|running out|running low|nearly out|almost out)\b/.test(lc);
  const isOut       = /\b(out of stock|zero stock|no stock|empty)\b/.test(lc);

  const all = await Inventory.find({}).select('model brand quantity devices specifications price').limit(200);

  if (isOut) {
    const out = all.filter(i => (i.devices?.filter(d => !d.isSold).length ?? i.quantity) === 0);
    if (!out.length) return '✅ No items are completely out of stock.';
    const list = out.map(i => `  • ${i.brand} ${i.model} — 0 units`).join('\n');
    return `🔴 **${out.length} out-of-stock items:**\n\n${list}`;
  }

  if (isLow) {
    const low = all.filter(i => { const a = i.devices?.filter(d=>!d.isSold).length ?? i.quantity; return a > 0 && a < 10; });
    if (!low.length) return '✅ No low stock items. All inventory levels are healthy.';
    const list = low.map(i => { const a = i.devices?.filter(d=>!d.isSold).length ?? i.quantity; return `  • ${i.brand} ${i.model} — ${a} left`; }).join('\n');
    return `⚠️ **${low.length} low-stock items** (less than 10 units):\n\n${list}`;
  }

  if (isAvailable) {
    const avail = all.filter(i => (i.devices?.filter(d=>!d.isSold).length ?? i.quantity) > 0);
    const totalDevices = avail.reduce((s, i) => s + (i.devices?.filter(d=>!d.isSold).length ?? i.quantity), 0);
    const list = avail.slice(0, 15).map(i => {
      const qty = i.devices?.filter(d=>!d.isSold).length ?? i.quantity;
      const specs = [i.specifications?.storage, i.specifications?.color].filter(Boolean).join(', ');
      return `  • **${i.brand} ${i.model}**${specs ? ` (${specs})` : ''} — ${qty} available`;
    }).join('\n');
    return `📦 **${avail.length} item types** with **${fmt.num(totalDevices)} available units**:\n\n${list}${avail.length > 15 ? `\n  ...and ${avail.length - 15} more. Search for a specific model to narrow down.` : ''}`;
  }

  if (isSold) {
    const soldItems = all.filter(i => i.devices?.some(d => d.isSold));
    const totalSold = soldItems.reduce((s, i) => s + (i.devices?.filter(d=>d.isSold).length || 0), 0);
    const list = soldItems.slice(0, 10).map(i => {
      const soldCount = i.devices?.filter(d=>d.isSold).length || 0;
      return `  • ${i.brand} ${i.model} — ${soldCount} sold`;
    }).join('\n');
    return `📤 **${soldItems.length} item types** with **${fmt.num(totalSold)} sold units**:\n\n${list}`;
  }

  // General inventory summary
  const total = all.length;
  const totalUnits = all.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalAvail = all.reduce((s, i) => s + (i.devices?.filter(d=>!d.isSold).length ?? i.quantity), 0);
  const lowCount   = all.filter(i => (i.devices?.filter(d=>!d.isSold).length ?? i.quantity) < 10).length;

  const list = all.slice(0, 10).map(i => {
    const avail = i.devices?.filter(d=>!d.isSold).length ?? i.quantity;
    return `  • ${i.brand} ${i.model} — ${avail} available / ${i.quantity} total`;
  }).join('\n');

  return `📦 **Inventory Overview**\n\n  • **${total} SKUs** | **${fmt.num(totalUnits)} total units** | **${fmt.num(totalAvail)} available** | **${lowCount} low stock**\n\n**Top items:**\n${list}${total > 10 ? `\n  ...and ${total - 10} more.` : ''}`;
}

async function handleItemSearch(text) {
  const lc = text.toLowerCase();

  // IMEI lookup
  const imeiMatch = text.match(/\b(\d{14,16})\b/);
  if (imeiMatch) {
    const imei = imeiMatch[1];
    const item = await Inventory.findOne({ $or: [{ 'devices.imei': imei }, { 'devices.imei2': imei }] });
    if (!item) return `❌ No device found with IMEI **${imei}**.`;
    const device = item.devices?.find(d => d.imei === imei || d.imei2 === imei);
    
    let resMsg = `📱 **IMEI ${imei} found:**\n\n  • Model: **${item.brand} ${item.model}**\n  • Status: **${device?.isSold ? 'Sold' : 'Available'}**\n  • Condition: **${fmt.cap(device?.condition)}**\n  • Unlock: **${fmt.cap(device?.unlockStatus?.replace('_',' '))}**\n  • Grade: **${device?.grade}**`;
    
    if (device?.batteryHealth) resMsg += `\n  • Battery: **${device.batteryHealth}**`;
    
    if (/\b(lab|phonecheck|test|results?|report)\b/i.test(text)) {
      resMsg += `\n\n🔬 **Lab Results (Phonecheck):**\n  • Cosmetics: **${device?.cosmeticsGrade || 'N/A'}**\n  • Functionality: **${device?.functionalityStatus || 'N/A'}**\n  • FMI: **${device?.fmiStatus || 'N/A'}**\n  • MDM: **${device?.mdmStatus || 'N/A'}**\n  • Clear Data: **${device?.dataCleared || 'N/A'}**`;
      if (device?.labelNotes) resMsg += `\n  • Notes: **${device.labelNotes}**`;
    }
    
    return resMsg;
  }

  // Strip filler to extract real product name
  const stripped = stripFiller(text);

  if (!stripped || stripped.length < 2) {
    // Generic: show all available
    return handleInventoryAll(text);
  }

  // Build dynamic $and query for multi-word match
  const words = stripped.split(/\s+/).filter(w => w.length > 1);
  const andClauses = words.map(w => ({
    $or: [
      { brand: { $regex: new RegExp(w, 'i') } },
      { model: { $regex: new RegExp(w, 'i') } },
      { 'specifications.color': { $regex: new RegExp(w, 'i') } },
      { 'specifications.storage': { $regex: new RegExp(w, 'i') } },
    ]
  }));

  let items = [];
  if (andClauses.length > 0) {
    items = await Inventory.find({ $and: andClauses }).select('model brand quantity devices specifications price').limit(30);
  } else {
    items = await Inventory.find({
      $or: [
        { brand: { $regex: new RegExp(stripped, 'i') } },
        { model: { $regex: new RegExp(stripped, 'i') } },
      ]
    }).select('model brand quantity devices specifications price').limit(30);
  }

  if (!items.length) return `❌ No inventory found matching **"${stripped}"**.\n\nTry: "Show all iPhones", "Do we have Samsung S24?", or "What's in stock?"`;

  const totalQty = items.reduce((s, i) => s + (i.devices?.filter(d=>!d.isSold).length ?? i.quantity), 0);

  if (totalQty === 0) {
    const list = items.map(i => `  • ${i.brand} ${i.model} — **0 available** (${i.quantity} total)`).join('\n');
    return `📭 Found **${items.length} match(es)** for "${stripped}" but all are currently **out of stock**:\n\n${list}`;
  }

  const wantsImei = /\b(imeis?|lab|phonecheck|report|test results?)\b/i.test(text);

  const list = items.map(i => {
    const availDevices = i.devices?.filter(d=>!d.isSold) || [];
    const avail  = availDevices.length ?? i.quantity;
    const specs  = [i.specifications?.storage, i.specifications?.color].filter(Boolean).join(', ');
    const retail = i.price?.retail ? ` — ${fmt.money(i.price.retail)}` : '';
    
    let line = `  • **${i.brand} ${i.model}**${specs ? ` (${specs})` : ''} — **${avail} available**${retail}`;
    if (wantsImei && availDevices.length > 0) {
      const imeiList = availDevices.map(d => d.imei).filter(Boolean);
      if (imeiList.length > 0) {
        line += `\n      ↳ IMEIs: ${imeiList.join(', ')}`;
      }
      
      if (/\b(lab|phonecheck|report|test results?)\b/i.test(text) && availDevices[0]) {
        const device = availDevices[0];
        
        line += `\n\n`;
        
        // Output full detailed Lab Data (GSX / Sickw report) if it exists
        if (device.labData && device.labData.CODE) {
          let codeText = device.labData.CODE.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
          line += `${codeText}\n`;
        } else {
          line += `Model: ${i.brand} ${i.model} ${i.specifications?.color || ''} ${i.specifications?.storage || ''}\n`;
          line += `IMEI: ${device.imei || 'N/A'}\n`;
          if (device.imei2) line += `IMEI2: ${device.imei2}\n`;
          if (device.serialNumber) line += `Serial Number: ${device.serialNumber}\n`;
        }
        
        // Output Phonecheck fields
        line += `Cosmetics: ${device?.cosmeticsGrade || device?.grade || 'N/A'}\n`;
        line += `Functionality: ${device?.functionalityStatus || 'N/A'}\n`;
        line += `FMI: ${device?.fmiStatus || 'N/A'}\n`;
        line += `MDM: ${device?.mdmStatus || 'N/A'}\n`;
        line += `Clear Data: ${device?.dataCleared || 'N/A'}`;
        if (device?.labelNotes) line += `\nNotes: ${device.labelNotes}`;
      }
    }
    return line;
  }).join('\n');

  return `✅ Found **${items.length} match(es)** for "${stripped}" — **${fmt.num(totalQty)} units available**:\n\n${list}`;
}

// ─────────────────────────────────────────────
// ── SALES / ORDER HANDLERS ────────────────────
// ─────────────────────────────────────────────

async function handleOrders(text) {
  const query   = { status: { $ne: 'cancelled' } };
  const channel = extractChannel(text);
  const status  = extractStatus(text);
  const dateQ   = buildDateQuery(text);
  const lc      = text.toLowerCase();

  if (channel) query.salesChannel = channel;
  if (status) {
    if (['in_transit', 'out_for_delivery', 'processing', 'hold', 'exception'].includes(status)) {
      query.deliveryStatus = status;
    } else {
      query.status = status;
    }
  }
  if (dateQ)   query.createdAt = dateQ;

  const sales = await Sale.find(query).select('saleNumber customerName totalAmount salesChannel status deliveryStatus createdAt').sort({ createdAt: -1 }).limit(100);
  const total = sales.reduce((s, o) => s + (o.totalAmount || 0), 0);

  let label = 'orders';
  if (status)  label = `${status.replace('_', ' ')} orders`;
  if (channel) label += ` from ${fmt.cap(channel)}`;
  const days = (() => { const m = text.match(/(\d+)\s*days?/i); return m ? parseInt(m[1]) : null; })();
  if (days)                         label += ` in the past ${days} days`;
  else if (lc.includes('today'))    label += ' today';
  else if (lc.includes('yesterday'))label += ' yesterday';
  else if (lc.includes('week'))     label += ' this week';
  else if (lc.includes('month'))    label += ' this month';

  if (!sales.length) return `📭 No ${label} found.`;

  const top5 = sales.slice(0, 5).map(s =>
    `  • [${s.saleNumber}](/sales/${s._id}) — ${s.customerName} — ${fmt.money(s.totalAmount)} — ${s.deliveryStatus ? fmt.cap(s.deliveryStatus.replace('_', ' ')) : fmt.cap(s.status)}`
  ).join('\n');

  return `📦 Found **${fmt.num(sales.length)} ${label}**, totalling **${fmt.money(total)}**:\n\n${top5}${sales.length > 5 ? `\n  ...and ${sales.length - 5} more.` : ''}`;
}

async function handleRevenue(text) {
  const query = { status: { $ne: 'cancelled' } };
  const dateQ = buildDateQuery(text);
  const lc    = text.toLowerCase();
  if (dateQ) query.createdAt = dateQ;

  const sales   = await Sale.find(query).select('totalAmount totalProfit salesChannel');
  const revenue = sales.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const profit  = sales.reduce((s, o) => s + (o.totalProfit || 0), 0);
  const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

  let label = 'all time';
  const days = (() => { const m = text.match(/(\d+)\s*days?/i); return m ? parseInt(m[1]) : null; })();
  if (days)                         label = `past ${days} days`;
  else if (lc.includes('today'))    label = 'today';
  else if (lc.includes('yesterday'))label = 'yesterday';
  else if (lc.includes('week'))     label = 'this week';
  else if (lc.includes('month'))    label = 'this month';
  else if (lc.includes('year'))     label = 'this year';

  return `💰 **Revenue — ${label}:**\n\n  • Total Revenue: **${fmt.money(revenue)}**\n  • Total Profit: **${fmt.money(profit)}**\n  • Profit Margin: **${margin}%**\n  • Orders: **${fmt.num(sales.length)}**`;
}

async function handleOrderLookup(text) {
  const lc = text.toLowerCase();

  const orderNumMatch = text.match(/\b(SL[\w\d-]+|\d{4,10})\b/i);
  const trackingMatch = text.match(/\b(1Z[A-Z0-9]{16}|TBA\d{10,20})\b/i);

  let query = null;
  let notFoundMsg = '';
  let matchVal = '';

  if (orderNumMatch) {
    matchVal = orderNumMatch[1].toUpperCase();
    query = { saleNumber: { $regex: new RegExp(matchVal, 'i') } };
    notFoundMsg = `❌ Order **${matchVal}** not found.`;
  } else if (trackingMatch) {
    matchVal = trackingMatch[1].toUpperCase();
    query = { 'shipping.trackingNumber': { $regex: new RegExp(matchVal, 'i') } };
    notFoundMsg = `❌ Order with tracking **${matchVal}** not found.`;
  }

  if (query) {
    const sale = await Sale.findOne(query)
      .select('saleNumber customerName totalAmount salesChannel status deliveryStatus paymentStatus shipping items createdAt');

    if (!sale) return notFoundMsg;

    const isDate = /\b(when|date|time|shipped|delivered|created)\b/.test(lc);
    const isStatus = /\b(status|state|where is)\b/.test(lc);
    const isTracking = /\b(tracking|track)\b/.test(lc);
    const isCustomer = /\b(who|customer|buyer|name)\b/.test(lc);
    const isAmount = /\b(how much|cost|price|total|amount)\b/.test(lc);

    if (isDate && !isStatus) {
      if (sale.shipping?.trackingNumber && sale.shipping?.carrier) {
        try {
          const liveData = await fetchLiveTracking(sale.shipping.carrier, sale.shipping.trackingNumber);
          const wantsDelivered = /\\b(delivered)\\b/.test(lc);
          let trackingDate = null;
          let verb = 'shipped';
          
          if (liveData.scanEvents && liveData.scanEvents.length > 0) {
            const deliveredScan = liveData.scanEvents.find(e => e.eventDescription.toLowerCase().includes('delivered'));
            
            if (wantsDelivered && deliveredScan) {
              trackingDate = deliveredScan.date;
              verb = 'delivered';
            } else if (wantsDelivered && !deliveredScan) {
              return `Order [${sale.saleNumber}](/sales/${sale._id}) has not been delivered yet.`;
            } else {
              // They asked when it was shipped (or just date), find the earliest scan date
              let earliestDate = liveData.scanEvents[0].date;
              for (const scan of liveData.scanEvents) {
                if (new Date(scan.date) < new Date(earliestDate)) {
                  earliestDate = scan.date;
                }
              }
              trackingDate = earliestDate;
              verb = 'shipped';
            }
          }
          
          if (trackingDate) {
            return `Order [${sale.saleNumber}](/sales/${sale._id}) was ${verb} on **${fmt.date(trackingDate)}** (via ${sale.shipping.carrier}).`;
          }
        } catch (e) {
          // Live fetch failed, fallback
        }
      }

      const d = sale.shipping?.shippedDate || sale.shipping?.deliveredDate || sale.createdAt;
      let verb = 'created';
      if (sale.deliveryStatus === 'shipped') verb = 'shipped';
      if (sale.deliveryStatus === 'delivered') verb = 'delivered';
      return `Order [${sale.saleNumber}](/sales/${sale._id}) was ${verb} on **${fmt.date(d)}**.`;
    }

    if (isStatus && !isTracking) {
      let liveStatusStr = '';
      if (sale.shipping?.trackingNumber && sale.shipping?.carrier) {
         try {
           const liveData = await fetchLiveTracking(sale.shipping.carrier, sale.shipping.trackingNumber);
           if (liveData.latestStatusDetail?.statusByLocale) {
             liveStatusStr = ` Live carrier status: **${liveData.latestStatusDetail.statusByLocale}**.`;
           }
         } catch(e) {}
      }

      let msg = `Order [${sale.saleNumber}](/sales/${sale._id}) is currently **${fmt.cap(sale.deliveryStatus || sale.status)}**.${liveStatusStr}`;
      if (sale.shipping?.trackingNumber) {
        msg += `\n📦 Tracking: **${sale.shipping.trackingNumber}** (${sale.shipping.carrier || ''})`;
      }
      return msg;
    }

    if (isTracking && !isStatus) {
      if (sale.shipping?.trackingNumber) {
        let response = `Tracking for order [${sale.saleNumber}](/sales/${sale._id}) is **${sale.shipping.trackingNumber}** (${sale.shipping.carrier || 'N/A'}).\n`;
        const wantsDetailed = /\b(detail|detailed|scans|history|full)\b/.test(lc);
        if (wantsDetailed && sale.shipping?.carrier) {
          try {
            const liveData = await fetchLiveTracking(sale.shipping.carrier, sale.shipping.trackingNumber);
            if (liveData && liveData.scanEvents && liveData.scanEvents.length > 0) {
              response += `\n**Detailed Tracking Scans:**\n`;
              liveData.scanEvents.forEach((scan, index) => {
                 let location = [];
                 if(scan.scanLocation?.city) location.push(scan.scanLocation.city);
                 if(scan.scanLocation?.stateOrProvinceCode) location.push(scan.scanLocation.stateOrProvinceCode);
                 let locStr = location.length > 0 ? ` (${location.join(', ')})` : '';
                 response += `* ${scan.date} ${scan.time} - **${scan.eventDescription}**${locStr}\n`;
              });
            } else {
               response += `\n(No detailed scans available yet)`;
            }
          } catch(e) {
             response += `\n(Error fetching live scans: ${e.message})`;
          }
        }
        return response;
      } else {
        return `Order [${sale.saleNumber}](/sales/${sale._id}) does not have a tracking number yet.`;
      }
    }

    if (isCustomer) {
      return `Order [${sale.saleNumber}](/sales/${sale._id}) belongs to **[${sale.customerName}](/customers/${sale.customer?._id || ''}/orders)**.`;
    }

    if (isAmount) {
      return `The total amount for order [${sale.saleNumber}](/sales/${sale._id}) is **${fmt.money(sale.totalAmount)}**.`;
    }

    const itemList = (sale.items || []).slice(0, 3).map(i =>
      `  • ${i.model}${i.storage ? ` ${i.storage}` : ''}${i.color ? ` ${i.color}` : ''} — ${fmt.money(i.salePrice)}`
    ).join('\n');

    const tracking = sale.shipping?.trackingNumber
      ? `  📦 Tracking: **${sale.shipping.trackingNumber}** (${sale.shipping.carrier || 'N/A'})`
      : `  📦 Tracking: Not assigned`;

    let shippingAddressStr = '';
    if (sale.shipping && sale.shipping.address) {
       const addr = sale.shipping.address;
       const addrParts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
       if (addrParts.length > 0) {
           shippingAddressStr = `  📍 Address:    **${addrParts.join(', ')}**\n`;
       }
    }

    return `🧾 **Order [${sale.saleNumber}](/sales/${sale._id})**\n\n` +
      `  Customer:     **[${sale.customerName}](/customers/${sale.customer?._id || ''}/orders)**\n` +
      `  Amount:       **${fmt.money(sale.totalAmount)}**\n` +
      `  Channel:      **${fmt.cap(sale.salesChannel || 'N/A')}**\n` +
      `  Order Status: **${fmt.cap(sale.status)}**\n` +
      `  Delivery:     **${fmt.cap(sale.deliveryStatus || 'pending')}**\n` +
      `  Payment:      **${fmt.cap(sale.paymentStatus || 'N/A')}**\n` +
      `${shippingAddressStr}` +
      `${tracking}\n` +
      `  Created:      **${fmt.date(sale.createdAt)}**\n\n` +
      (itemList ? `**Items:**\n${itemList}` : '');
  }

  const deliveryStatusMatch = text.match(/\b(in transit|shipped|delivered|out for delivery|failed attempt|returned)\b/i);
  if (deliveryStatusMatch) {
    let status = deliveryStatusMatch[1].toLowerCase();
    if (status === 'in transit') status = 'in_transit';
    if (status === 'out for delivery') status = 'out_for_delivery';
    if (status === 'failed attempt') status = 'exception';

    const sales = await Sale.find({ deliveryStatus: status })
      .select('saleNumber customerName totalAmount status deliveryStatus salesChannel createdAt').limit(25);

    if (!sales.length) return `❌ No orders found currently **${status.replace('_', ' ')}**.`;

    const list = sales.map(s =>
      `  • [${s.saleNumber}](/sales/${s._id}) — ${fmt.money(s.totalAmount)} — **${fmt.cap(s.status)}** (${fmt.cap(s.deliveryStatus || 'pending')}) — ${fmt.date(s.createdAt)}`
    ).join('\n');

    return `📦 Found **${sales.length}** recent order(s) currently **${status.replace('_', ' ')}**:\n\n${list}`;
  }

  const cleaned = lc
    .replace(/\b(status|order|find|look up|lookup|show|what is|of|for|the|track|where|is|my|orders?)\b/g, '')
    .trim();

  if (cleaned.length > 2) {
    const sales = await Sale.find({ customerName: { $regex: new RegExp(cleaned, 'i') } })
      .select('saleNumber customerName totalAmount status deliveryStatus salesChannel createdAt').limit(10);

    if (!sales.length) return `❌ No orders found for customer matching "${cleaned}".`;

    const list = sales.map(s =>
      `  • [${s.saleNumber}](/sales/${s._id}) — ${fmt.money(s.totalAmount)} — **${fmt.cap(s.status)}** (${fmt.cap(s.deliveryStatus || 'pending')}) — ${fmt.date(s.createdAt)}`
    ).join('\n');

    return `📦 Found **${sales.length}** recent order(s) for **${cleaned}**:\n\n${list}`;
  }

  return `🤔 Please include the order number (e.g. SL202606-0037) or customer name.`;
}

async function handleTopSelling(text) {
  const dateQ = buildDateQuery(text);
  const match = { status: { $ne: 'cancelled' } };
  if (dateQ) match.createdAt = dateQ;

  const top = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $group: { _id: '$items.model', count: { $sum: 1 }, revenue: { $sum: '$items.salePrice' } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  if (!top.length) return '📭 No sales data found.';
  const list = top.map((t, i) => `  ${i + 1}. **${t._id}** — Sold ${t.count}x — ${fmt.money(t.revenue)}`).join('\n');
  return `🏆 **Top 10 Selling Items:**\n\n${list}`;
}

async function handleChannelBreakdown(text) {
  const dateQ = buildDateQuery(text);
  const match = { status: { $ne: 'cancelled' } };
  if (dateQ) match.createdAt = dateQ;

  const breakdown = await Sale.aggregate([
    { $match: match },
    { $group: { _id: '$salesChannel', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' }, profit: { $sum: '$totalProfit' } } },
    { $sort: { revenue: -1 } }
  ]);

  if (!breakdown.length) return '📭 No sales data found.';
  const list = breakdown.map(c => `  • **${fmt.cap(c._id || 'unknown')}** — ${c.count} orders — ${fmt.money(c.revenue)} revenue — ${fmt.money(c.profit)} profit`).join('\n');
  return `📊 **Sales by Channel:**\n\n${list}`;
}

async function handlePending() {
  const pending = await Sale.find({ status: 'pending' })
    .select('saleNumber customerName totalAmount salesChannel createdAt')
    .sort({ createdAt: -1 }).limit(25);

  if (!pending.length) return '✅ No pending orders. Everything is up to date.';

  const list = pending.map(s =>
    `  • ${s.saleNumber} — ${s.customerName} — ${fmt.money(s.totalAmount)} (${fmt.cap(s.salesChannel)}) — ${fmt.date(s.createdAt)}`
  ).join('\n');

  return `🔔 **${pending.length} pending orders** need attention:\n\n${list}`;
}

async function handleDashboard() {
  const today   = new Date(); today.setHours(0,0,0,0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);

  const [allSales, todaySales, weekSales, pendingCount, invCount, lowStockCount, custCount] = await Promise.all([
    Sale.find({ status: { $ne: 'cancelled' } }).select('totalAmount totalProfit'),
    Sale.find({ createdAt: { $gte: today }, status: { $ne: 'cancelled' } }).select('totalAmount'),
    Sale.find({ createdAt: { $gte: weekAgo }, status: { $ne: 'cancelled' } }).select('totalAmount'),
    Sale.countDocuments({ status: 'pending' }),
    Inventory.countDocuments(),
    Inventory.countDocuments({ $expr: { $lt: ['$quantity', { $ifNull: ['$minStockLevel', 10] }] } }),
    Customer.countDocuments({ isActive: true }),
  ]);

  const totalRevenue = allSales.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProfit  = allSales.reduce((s, o) => s + (o.totalProfit || 0), 0);
  const todayRevenue = todaySales.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const weekRevenue  = weekSales.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return `📊 **Platform Overview**\n\n` +
    `  Total Revenue (all time): **${fmt.money(totalRevenue)}**\n` +
    `  Total Profit (all time):  **${fmt.money(totalProfit)}**\n` +
    `  Revenue Today:            **${fmt.money(todayRevenue)}** (${todaySales.length} orders)\n` +
    `  Revenue This Week:        **${fmt.money(weekRevenue)}** (${weekSales.length} orders)\n` +
    `  Pending Orders:           **${pendingCount}**\n` +
    `  Inventory SKUs:           **${invCount}**\n` +
    `  Low Stock Items:          **${lowStockCount}**\n` +
    `  Active Customers:         **${custCount}**\n\n` +
    `Ask me anything: "Orders past 7 days", "Why are sales dropping?", "Do we have iPhone 15 Pro?", "Show customers"`;
}

async function handleTrendAnalysis(text) {
  const now = new Date();
  const d7  = new Date(now); d7.setDate(d7.getDate()-7);
  const d14 = new Date(now); d14.setDate(d14.getDate()-14);
  const d30 = new Date(now); d30.setDate(d30.getDate()-30);
  const d60 = new Date(now); d60.setDate(d60.getDate()-60);

  const [r7, p7, r30, p30, byChannel, topItems, pendingCount] = await Promise.all([
    Sale.find({ createdAt:{$gte:d7},  status:{$ne:'cancelled'} }).select('totalAmount'),
    Sale.find({ createdAt:{$gte:d14,$lt:d7}, status:{$ne:'cancelled'} }).select('totalAmount'),
    Sale.find({ createdAt:{$gte:d30}, status:{$ne:'cancelled'} }).select('totalAmount'),
    Sale.find({ createdAt:{$gte:d60,$lt:d30}, status:{$ne:'cancelled'} }).select('totalAmount'),
    Sale.aggregate([
      { $match:{createdAt:{$gte:d30},status:{$ne:'cancelled'}} },
      { $group:{_id:'$salesChannel',count:{$sum:1},revenue:{$sum:'$totalAmount'}} },
      { $sort:{revenue:-1} }
    ]),
    Sale.aggregate([
      { $match:{createdAt:{$gte:d30},status:{$ne:'cancelled'}} },
      { $unwind:'$items' },
      { $group:{_id:'$items.model',count:{$sum:1}} },
      { $sort:{count:-1} }, { $limit:3 }
    ]),
    Sale.countDocuments({ status:'pending' })
  ]);

  const rev7=r7.reduce((s,o)=>s+(o.totalAmount||0),0);
  const rev7p=p7.reduce((s,o)=>s+(o.totalAmount||0),0);
  const rev30=r30.reduce((s,o)=>s+(o.totalAmount||0),0);
  const rev30p=p30.reduce((s,o)=>s+(o.totalAmount||0),0);

  const pct7  = rev7p  > 0 ? (((rev7  - rev7p)  / rev7p)  * 100).toFixed(1) : null;
  const pct30 = rev30p > 0 ? (((rev30 - rev30p) / rev30p) * 100).toFixed(1) : null;

  const findings = [];
  if (pct7  !== null) findings.push(`Revenue is **${parseFloat(pct7)>=0?'up':'down'} ${Math.abs(pct7)}%** this week vs last (${fmt.money(rev7)} vs ${fmt.money(rev7p)})`);
  if (pct30 !== null) findings.push(`Month-over-month revenue **${parseFloat(pct30)>=0?'up':'down'} ${Math.abs(pct30)}%** (${fmt.money(rev30)} vs ${fmt.money(rev30p)})`);

  const ordDiff = r7.length - p7.length;
  if (ordDiff < 0) findings.push(`Order count dropped by **${Math.abs(ordDiff)}** this week (${r7.length} vs ${p7.length} last week)`);
  else if (ordDiff > 0) findings.push(`Order count up **${ordDiff}** this week (${r7.length} vs ${p7.length} last week)`);

  if (pendingCount > 5) findings.push(`**${pendingCount} pending orders** unprocessed — may affect revenue`);
  if (byChannel.length > 0) findings.push(`Top channel: **${fmt.cap(byChannel[0]._id)}** — ${fmt.money(byChannel[0].revenue)} (${byChannel[0].count} orders this month)`);
  if (topItems.length > 0) findings.push(`Best sellers: **${topItems.map(t=>t._id).join(', ')}**`);

  if (!findings.length) return `📊 Not enough data yet to compute trends. Check back after more orders.`;

  const lc = text.toLowerCase();
  const isNegative = /drop|slow|down|declin|low|bad|worse|problem|issue/.test(lc);
  let intro = `📊 **Sales Trend Analysis:**\n\n`;
  if (isNegative && pct7 !== null && parseFloat(pct7) >= 0)
    intro = `📊 **Sales Trend Analysis**\n\nActually, sales are **not dropping** — here is the data:\n\n`;
  else if (isNegative)
    intro = `📊 **Sales Trend Analysis**\n\nHere is what the data shows:\n\n`;

  return intro + findings.map(f => `  • ${f}`).join('\n');
}

// ─────────────────────────────────────────────
// ── CUSTOMER HANDLERS ─────────────────────────
// ─────────────────────────────────────────────

async function handleCustomers(text) {
  const lc = text.toLowerCase();

  // Search for specific customer
  const stripped = stripFiller(text);
  if (stripped && stripped.length > 2 && !lc.includes('all') && !lc.includes('list') && !lc.includes('how many')) {
    const customers = await Customer.find({
      $or: [
        { name: { $regex: new RegExp(stripped, 'i') } },
        { company: { $regex: new RegExp(stripped, 'i') } },
        { 'contact.email': { $regex: new RegExp(stripped, 'i') } },
        { ebayUsername: { $regex: new RegExp(stripped, 'i') } },
      ]
    }).select('name company contact totalPurchases totalSpent type createdAt').limit(10);

    if (!customers.length) return `❌ No customer found matching "${stripped}".`;

    const list = customers.map(c => {
      const contact = [c.contact?.email, c.contact?.phone].filter(Boolean).join(' | ');
      return `  • **${c.name}**${c.company ? ` (${c.company})` : ''} — ${c.totalPurchases} orders — ${fmt.money(c.totalSpent)}${contact ? `\n    Contact: ${contact}` : ''}`;
    }).join('\n');

    return `👤 **${customers.length} customer(s) found:**\n\n${list}`;
  }

  // Top customers by spend
  if (lc.includes('top') || lc.includes('best') || lc.includes('biggest')) {
    const top = await Customer.find({ isActive: true }).sort({ totalSpent: -1 }).limit(10)
      .select('name company totalPurchases totalSpent type');
    const list = top.map((c, i) => `  ${i+1}. **${c.name}**${c.company?` (${c.company})`:''} — ${c.totalPurchases} orders — ${fmt.money(c.totalSpent)}`).join('\n');
    return `🏆 **Top 10 Customers by Spend:**\n\n${list}`;
  }

  // Count / summary
  const total  = await Customer.countDocuments();
  const active = await Customer.countDocuments({ isActive: true });
  const recent = await Customer.find({ isActive: true }).sort({ createdAt: -1 }).limit(5)
    .select('name totalPurchases totalSpent');
  const list = recent.map(c => `  • **${c.name}** — ${c.totalPurchases} orders — ${fmt.money(c.totalSpent)}`).join('\n');

  return `👤 **Customer Summary:**\n\n  • Total: **${total}** | Active: **${active}**\n\n**Recent customers:**\n${list}`;
}

// ─────────────────────────────────────────────
// ── SUPPLIER HANDLERS ─────────────────────────
// ─────────────────────────────────────────────

async function handleSuppliers(text) {
  const lc = text.toLowerCase();
  const stripped = stripFiller(text);

  // Search specific supplier
  if (stripped && stripped.length > 2 && !lc.includes('all') && !lc.includes('list') && !lc.includes('how many')) {
    const suppliers = await Supplier.find({
      name: { $regex: new RegExp(stripped, 'i') }
    }).select('name contact totalInvoices totalSpent rating isActive').limit(5);

    if (!suppliers.length) return `❌ No supplier found matching "${stripped}".`;

    const list = suppliers.map(s => {
      const contact = [s.contact?.email, s.contact?.phone].filter(Boolean).join(' | ');
      return `  • **${s.name}** — ${s.totalInvoices} invoices — ${fmt.money(s.totalSpent)} spent — Rating: ${s.rating}/5${contact ? `\n    Contact: ${contact}` : ''}`;
    }).join('\n');

    return `🏭 **${suppliers.length} supplier(s) found:**\n\n${list}`;
  }

  const total = await Supplier.countDocuments();
  const top   = await Supplier.find({ isActive: true }).sort({ totalSpent: -1 }).limit(8)
    .select('name totalInvoices totalSpent rating');

  const list = top.map((s, i) =>
    `  ${i+1}. **${s.name}** — ${s.totalInvoices} invoices — ${fmt.money(s.totalSpent)}`
  ).join('\n');

  return `🏭 **${total} suppliers** | Top by spend:\n\n${list}`;
}

// ─────────────────────────────────────────────
// ── DEVICE / IMEI SPECIFIC ────────────────────
// ─────────────────────────────────────────────

async function handleDeviceSearch(text) {
  const lc = text.toLowerCase();
  const imeiMatch = text.match(/\b(\d{14,16})\b/);

  // IMEI lookup
  if (imeiMatch) return handleItemSearch(text);

  // Condition-based device search
  const condition = /\bnew\b/.test(lc) ? 'new' : /\brefurb/.test(lc) ? 'refurbished' : /\bused\b/.test(lc) ? 'used' : null;
  const unlocked  = /\bunlocked\b/.test(lc) ? 'unlocked' : /\blocked\b/.test(lc) ? 'locked' : null;
  const soldFilter = /\bunsold\b|available/.test(lc) ? false : /\bsold\b/.test(lc) ? true : null;

  const allInv = await Inventory.find({}).select('brand model devices specifications').limit(200);
  let matched = [];

  allInv.forEach(item => {
    (item.devices || []).forEach(d => {
      if (condition && d.condition !== condition) return;
      if (unlocked && d.unlockStatus !== unlocked) return;
      if (soldFilter !== null && d.isSold !== soldFilter) return;
      matched.push({ model: `${item.brand} ${item.model}`, imei: d.imei, condition: d.condition, unlock: d.unlockStatus, grade: d.grade, isSold: d.isSold });
    });
  });

  if (!matched.length) {
    const filterDesc = [condition, unlocked, soldFilter === false ? 'available' : soldFilter === true ? 'sold' : null].filter(Boolean).join(', ');
    return `📭 No devices found${filterDesc ? ` matching: ${filterDesc}` : ''}.`;
  }

  const shown = matched.slice(0, 15);
  const list  = shown.map(d => `  • **${d.model}** — IMEI: ${d.imei} — ${d.condition} — ${d.unlock?.replace('_',' ')} — **${d.isSold?'Sold':'Available'}**`).join('\n');
  return `📱 **${matched.length} devices found:**\n\n${list}${matched.length > 15 ? `\n  ...and ${matched.length - 15} more.` : ''}`;
}

// ─────────────────────────────────────────────
// ── UNIVERSAL SEARCH ──────────────────────────
// ─────────────────────────────────────────────

async function handleUniversalSearch(text) {
  const stripped = stripFiller(text);
  if (!stripped || stripped.length < 2) return helpMessage();

  const regex = new RegExp(stripped, 'i');

  const words = stripped.split(/\s+/).filter(w => w.length > 1);
  const andClauses = words.map(w => ({
    $or: [
      { brand: { $regex: new RegExp(w, 'i') } },
      { model: { $regex: new RegExp(w, 'i') } },
      { 'specifications.color': { $regex: new RegExp(w, 'i') } },
      { 'specifications.storage': { $regex: new RegExp(w, 'i') } },
      { 'devices.imei': { $regex: new RegExp(w, 'i') } },
    ]
  }));

  const invPromise = andClauses.length > 0 
    ? Inventory.find({ $and: andClauses }).select('model brand quantity devices specifications').limit(5)
    : Inventory.find({ $or:[{model:{$regex:regex}},{brand:{$regex:regex}}] }).select('model brand quantity devices specifications').limit(5);

  const [invItems, sales, customers, suppliers] = await Promise.all([
    invPromise,
    Sale.find({ $or:[{saleNumber:{$regex:regex}},{customerName:{$regex:regex}}] }).select('_id saleNumber customerName totalAmount status createdAt').limit(5),
    Customer.find({ $or:[{name:{$regex:regex}},{company:{$regex:regex}},{'contact.email':{$regex:regex}}] }).select('_id name company totalPurchases totalSpent').limit(3),
    Supplier.find({ name:{$regex:regex} }).select('_id name totalInvoices totalSpent').limit(3),
  ]);

  if (!invItems.length && !sales.length && !customers.length && !suppliers.length)
    return `❌ Nothing found for **"${stripped}"** across all records.\n\nTry being more specific, or type **"help"** for commands.`;

  let response = `🔍 **Search results for "${stripped}":**\n`;

  if (invItems.length) {
    response += `\n**Inventory (${invItems.length}):**\n` + invItems.map(i => {
      const avail = i.devices?.filter(d=>!d.isSold).length ?? i.quantity;
      return `  • ${i.brand} ${i.model} — ${avail} available`;
    }).join('\n');
  }

  if (sales.length) {
    response += `\n\n**Orders (${sales.length}):**\n` + sales.map(s =>
      `  • [${s.saleNumber}](/sales/${s._id}) — ${s.customerName} — ${fmt.money(s.totalAmount)} — ${fmt.cap(s.status)}`
    ).join('\n');
  }

  if (customers.length) {
    response += `\n\n**Customers (${customers.length}):**\n` + customers.map(c =>
      `  • [${c.name}](/customers/${c._id}/orders)${c.company?` (${c.company})`:''} — ${c.totalPurchases} orders — ${fmt.money(c.totalSpent)}`
    ).join('\n');
  }

  if (suppliers.length) {
    response += `\n\n**Suppliers (${suppliers.length}):**\n` + suppliers.map(s =>
      `  • ${s.name} — ${s.totalInvoices} invoices — ${fmt.money(s.totalSpent)}`
    ).join('\n');
  }

  return response;
}

// ─────────────────────────────────────────────
// INTENT ROUTER
// ─────────────────────────────────────────────

function detectIntent(text) {
  const lc = text.toLowerCase().trim();

  // 1. Trend / analytical — FIRST (catches "why", "dropping", "trend")
  if (/\b(why|how come|reason|explain|trend|growing|dropping|declining|slowing|increasing|getting better|getting worse|compare|week.?over.?week|month.?over.?month)\b/.test(lc))
    return 'trend_analysis';

  // 2. Specific order number or tracking number
  if (/\b(SL[\w\d-]+|\d{4,10})\b/i.test(text)) return 'order_lookup';
  if (/\b(1Z[A-Z0-9]{16}|TBA\d{10,20})\b/i.test(text)) return 'order_lookup';
  if (/\b(\d{12}|\d{18}|\d{20}|\d{22})\b/.test(text)) return 'order_lookup'; // USPS, FedEx, etc.
  if (/\b(status|track|tracking)\b/i.test(text) && /\b\d{10,22}\b/.test(text)) return 'order_lookup';
  if (/\b(orders?|sales?|purchases?|transactions?)\b/.test(lc)) return 'orders';

  if (/\b(status of order|order status|find order|look up order|track order|where is order|show order)\b/.test(lc)) return 'order_lookup';

  // 7. Revenue / profit
  if (/\b(revenue|profit|earnings|income|money|sales total|how much|made)\b/.test(lc)) return 'revenue';

  // 8. Top selling
  if (/\b(top|best.?sell|popular|most sold|highest sell)\b/.test(lc)) return 'top_selling';

  // 9. Channel breakdown
  if (/\b(channel|breakdown|by channel|platform|distribution)\b/.test(lc)) return 'channel_breakdown';

  // 10. Pending
  if (/\b(pending|awaiting|not fulfilled|unfulfilled)\b/.test(lc)) return 'pending';

  // 11. IMEI lookup
  if (/\b\d{14,16}\b/.test(text)) return 'item_search';

  // 11.5 Specific model/item search — MUST have a product-like keyword
  if (/\b(do we have|is there|do you have|check if|find me|search for|look for|locate|i need|what is the imei|what is imei|imeis? for|imeis? of|show me|show|bring up)\b/.test(lc)) return 'item_search';

  // Check if there is a specific keyword first before matching generic 'all stock' intents
  const stripped = stripFiller(text);
  const hasSpecificKeyword = stripped && stripped.length > 1;

  // 12. All available / all stock queries  
  if (/\b(all available|all devices?|all items?|all products?|everything|full list|entire|complete list)\b/.test(lc)) {
    return hasSpecificKeyword ? 'item_search' : 'inventory_all';
  }
  if (/\b(low stock|out of stock|running out|running low)\b/.test(lc)) {
    return hasSpecificKeyword ? 'item_search' : 'inventory_all';
  }

  // 13. General inventory
  if (/\b(inventory|stock|items?|products?|units?|phones?|devices?)\b/.test(lc)) {
    if (hasSpecificKeyword) {
      return 'item_search'; // Contains a specific word like 'pixel'
    }
    return 'inventory_all';
  }

  // 14. Orders — broad
  if (/\b(in transit|out for delivery|processing|hold|exception|pending|delivered|shipped|cancelled|completed|refunded)\b/.test(lc) && /\b(order|orders|sale|sales)\b/.test(lc)) return 'orders';
  if (/\b(orders?|sales?|purchases?|transactions?)\b/.test(lc)) return 'orders';

  // 15. Help
  if (/\b(help|what can you do|commands|capabilities)\b/.test(lc)) return 'help';

  // 16. Fallback: universal search
  return 'universal_search';
}

function helpMessage() {
  return `I am Nova, your local database command engine. Here is what I can search:\n\n` +
    `**Inventory**\n  • "Find me all available devices"\n  • "Do we have iPhone 15 Pro 256GB?"\n  • "Show low stock items"\n  • "Search IMEI 352999112345678"\n\n` +
    `**Orders**\n  • "How many orders in the past 7 days?"\n  • "Show eBay orders this week"\n  • "Status of order SL202606-0037"\n\n` +
    `**Revenue & Trends**\n  • "Revenue today" / "Profit this month"\n  • "Why are sales dropping?"\n\n` +
    `**Customers**\n  • "Show top customers"\n  • "Find customer John Smith"\n\n` +
    `**Suppliers**\n  • "List all suppliers"\n  • "Find supplier ABC Corp"\n\n` +
    `**Universal Search**\n  • Just type any name, model, order number, or IMEI`;
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

const { DynamicTool } = require("@langchain/core/tools");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { HumanMessage, AIMessage, SystemMessage } = require("@langchain/core/messages");
const { z } = require("zod");

exports.chatWithNova = async (req, res) => {
  try {
    const { message, context, history } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Please send a message.' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'Gemini API key is missing' });
    }

    console.log(`[NOVA] Received message for LangGraph: "${message}"`);

    // Define Tools
    const tools = [
      new DynamicTool({
        name: "search_inventory",
        description: "Search the inventory database. Use this for ANY queries about stock, devices, models (like iPhone, Samsung), IMEI checks, lab results, or availability. Input should be the search term or query string.",
        func: async (input) => {
          if (/\\b(all|list)\\b/i.test(input)) return await handleInventoryAll(input);
          return await handleItemSearch(input);
        }
      }),
      new DynamicTool({
        name: "lookup_orders",
        description: "Search or lookup orders, sales, tracking numbers, or check order status. Use this if the user asks about an order. Input should be the order number, tracking number, or search term.",
        func: async (input) => {
          if (/(today|yesterday|week|month|days?)/i.test(input) || /(orders|sales)/i.test(input)) {
             if (/(pending)/i.test(input)) return await handlePending();
             return await handleOrders(input);
          }
          return await handleOrderLookup(input);
        }
      }),
      new DynamicTool({
        name: "get_live_tracking",
        description: "Fetch live detailed tracking scans, delivery history, and transit information for an order. Use this when the user asks for 'detailed tracking'. Input should be the order number or tracking number.",
        func: async (input) => {
          return await handleOrderLookup("detailed tracking " + input);
        }
      }),
      new DynamicTool({
        name: "get_financials",
        description: "Get financial metrics like revenue, profit, top selling items, channel breakdown, or sales trends. Input should be the specific metric requested (e.g. 'revenue this week', 'top selling', 'trends').",
        func: async (input) => {
          const lc = input.toLowerCase();
          if (lc.includes('top')) return await handleTopSelling(input);
          if (lc.includes('channel')) return await handleChannelBreakdown(input);
          if (lc.includes('trend')) return await handleTrendAnalysis(input);
          if (lc.includes('dashboard')) return await handleDashboard();
          return await handleRevenue(input);
        }
      }),
      new DynamicTool({
        name: "search_customers",
        description: "Look up customer information, find top customers, or list active customers. Input should be the search term.",
        func: async (input) => await handleCustomers(input)
      }),
      new DynamicTool({
        name: "search_suppliers",
        description: "Look up supplier information or list top suppliers. Input should be the search term.",
        func: async (input) => await handleSuppliers(input)
      }),
      new DynamicTool({
        name: "universal_search",
        description: "Fallback tool: Use this if the query is vague and you need to search across inventory, orders, and customers simultaneously.",
        func: async (input) => await handleUniversalSearch(input)
      }),
      new DynamicTool({
        name: "query_database",
        description: `Directly execute read-only queries against the MongoDB database. Use this for complex searches, like finding orders by item model, specific conditions, or multi-field criteria.
Input must be a valid JSON string containing 'collection' (Sale, Inventory, Customer, or Supplier) and 'query' (a MongoDB query object). Optionally include 'limit' and 'sort'.
Example: {"collection": "Sale", "query": {"items.model": {"$regex": "pixel 10", "$options": "i"}}}`,
        func: async (input) => {
          try {
             const parsed = JSON.parse(input);
             const { collection, query, limit = 10, sort = { createdAt: -1 } } = parsed;
             let Model;
             if (collection === 'Sale') Model = Sale;
             else if (collection === 'Inventory') Model = Inventory;
             else if (collection === 'Customer') Model = Customer;
             else if (collection === 'Supplier') Model = Supplier;
             else return "Invalid collection.";
             
             const results = await Model.find(query).sort(sort).limit(limit).lean();
             if (!results || results.length === 0) return "No results found for query.";
             return JSON.stringify(results);
          } catch(e) {
             return "Query failed: " + e.message;
          }
        }
      })
    ];

    // Initialize the model
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY
    });

    // Create the ReAct agent
    const agent = createReactAgent({
      llm,
      tools
    });

    // Prepare message history
    const messages = [];
    
    // System Prompt
    messages.push(new SystemMessage(`You are Nova, the AI assistant for an electronics wholesale business. 
You have access to the company's live database via tools. 
When asked a question, USE YOUR TOOLS to fetch real data before answering. 
Do not guess data. If a tool returns no data, tell the user politely.
CRITICAL: For complex searches (like finding sales by specific device models, or advanced filters), use the 'query_database' tool to write a direct MongoDB query instead of the basic lookup tools.
Format your responses nicely using markdown. Use bullet points and bold text for emphasis.
If the user's request is a greeting or general chatter, respond politely.
If the user asks about an order or IMEI and it's not in their message, look at the chat history to see if they mentioned it recently.`));

    // Map history to LangChain messages
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
        if (msg.role === 'nova' || msg.role === 'assistant') messages.push(new AIMessage(msg.content));
      });
    }

    // Append the latest user message
    let finalQuery = message;
    
    // Context injection (from UI context)
    if (context) {
      if (context.imeis && context.imeis.length > 0) {
        finalQuery += ` (Context IMEIs: ${context.imeis.join(', ')})`;
      }
      if (context.orderNumber) {
        finalQuery += ` (Context Order: ${context.orderNumber})`;
      }
    }
    
    messages.push(new HumanMessage(finalQuery));

    // Invoke the agent
    const agentResult = await agent.invoke({ messages });

    // Extract the final AI message content
    const responseText = agentResult.messages[agentResult.messages.length - 1].content;

    res.json({ success: true, text: responseText });

  } catch (error) {
    console.error('[NOVA] Error with LangGraph agent:', error);
    res.status(500).json({ success: false, message: 'Internal error: ' + error.message });
  }
};

const NovaMemory = require('../models/NovaMemory');

exports.getNovaMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const memory = await NovaMemory.findOne({ ebayMessageId: id });
    res.json(memory ? memory.messages : []);
  } catch (error) {
    console.error('Error fetching Nova memory:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.saveNovaMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      await NovaMemory.findOneAndDelete({ ebayMessageId: id });
      return res.json({ success: true, cleared: true });
    }

    await NovaMemory.findOneAndUpdate(
      { ebayMessageId: id },
      { messages },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving Nova memory:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.rewriteMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a professional customer service assistant for an electronics wholesale business. 
Rewrite the following draft message to be highly professional, polite, and clear for a customer. 
Do not add any greetings like "Dear Customer" or sign-offs like "Sincerely, Support Team", just rewrite the core message.
Keep it concise.
Draft: "${message}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ success: true, text: responseText.trim() });
  } catch (error) {
    console.error('Error rewriting message with Gemini:', error);
    res.status(500).json({ success: false, message: 'Failed to rewrite message' });
  }
};
