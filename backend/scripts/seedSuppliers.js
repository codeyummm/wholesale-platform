const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');
require('dotenv').config();

const sampleSuppliers = [
  {
    name: 'Tech Distributors Inc.',
    contact: {
      email: 'sales@techdist.com',
      phone: '555-0101',
      alternatePhone: '555-0102'
    },
    address: {
      street: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA'
    },
    rating: 5,
    notes: 'Primary supplier for Apple products',
    invoices: [
      {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: new Date('2024-01-15'),
        totalAmount: 25000,
        items: [
          { model: 'iPhone 15 Pro Max', brand: 'Apple', quantity: 10, unitPrice: 1100, imeis: ['359876543210001', '359876543210002', '359876543210003', '359876543210004', '359876543210005'] },
          { model: 'iPhone 15 Pro', brand: 'Apple', quantity: 15, unitPrice: 900, imeis: ['359876543210006', '359876543210007', '359876543210008'] }
        ],
        notes: 'Bulk order - 10% discount applied'
      },
      {
        invoiceNumber: 'INV-2024-002',
        invoiceDate: new Date('2024-01-20'),
        totalAmount: 18000,
        items: [
          { model: 'iPhone 14', brand: 'Apple', quantity: 20, unitPrice: 700, imeis: ['359876543210009', '359876543210010'] }
        ]
      }
    ]
  },
  {
    name: 'Mobile World Wholesale',
    contact: {
      email: 'orders@mobileworld.com',
      phone: '555-0201'
    },
    address: {
      street: '456 Mobile Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    rating: 4,
    notes: 'Good prices on Samsung devices',
    invoices: [
      {
        invoiceNumber: 'MW-2024-100',
        invoiceDate: new Date('2024-01-18'),
        totalAmount: 30000,
        items: [
          { model: 'Galaxy S24 Ultra', brand: 'Samsung', quantity: 12, unitPrice: 1000, imeis: ['357890123456001', '357890123456002', '357890123456003'] },
          { model: 'Galaxy S24', brand: 'Samsung', quantity: 18, unitPrice: 750, imeis: ['357890123456004', '357890123456005'] }
        ],
        notes: 'Premium shipment'
      }
    ]
  },
  {
    name: 'Global Phone Supply',
    contact: {
      email: 'info@globalphone.com',
      phone: '555-0301'
    },
    address: {
      street: '789 Supply Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA'
    },
    rating: 4,
    invoices: [
      {
        invoiceNumber: 'GPS-2024-50',
        invoiceDate: new Date('2024-01-22'),
        totalAmount: 15000,
        items: [
          { model: 'Pixel 8 Pro', brand: 'Google', quantity: 10, unitPrice: 800, imeis: ['358912345678001', '358912345678002'] },
          { model: 'Pixel 8', brand: 'Google', quantity: 15, unitPrice: 600, imeis: ['358912345678003'] }
        ]
      }
    ]
  }
];

const sampleInventory = [
  { model: 'iPhone 15 Pro Max', brand: 'Apple', quantity: 5, price: { cost: 1100, retail: 1399 }, devices: [
    { imei: '359876543210001', unlockStatus: 'unlocked', condition: 'new', grade: 'A+' },
    { imei: '359876543210002', unlockStatus: 'unlocked', condition: 'new', grade: 'A+' },
    { imei: '359876543210003', unlockStatus: 'unlocked', condition: 'new', grade: 'A+' }
  ]},
  { model: 'Galaxy S24 Ultra', brand: 'Samsung', quantity: 8, price: { cost: 1000, retail: 1299 }, devices: [
    { imei: '357890123456001', unlockStatus: 'unlocked', condition: 'new', grade: 'A+' },
    { imei: '357890123456002', unlockStatus: 'unlocked', condition: 'new', grade: 'A+' }
  ]},
  { model: 'Pixel 8 Pro', brand: 'Google', quantity: 6, price: { cost: 800, retail: 999 }, devices: [
    { imei: '358912345678001', unlockStatus: 'unlocked', condition: 'new', grade: 'A+' }
  ]}
];

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Clearing existing suppliers...');
    await Supplier.deleteMany({});
    
    console.log('Creating sample suppliers...');
    await Supplier.insertMany(sampleSuppliers);
    console.log('✅ Created 3 suppliers with invoices');

    console.log('Adding sample inventory...');
    for (const item of sampleInventory) {
      const existing = await Inventory.findOne({ model: item.model, brand: item.brand });
      if (!existing) {
        await Inventory.create(item);
      }
    }
    console.log('✅ Added sample inventory');

    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedData();
