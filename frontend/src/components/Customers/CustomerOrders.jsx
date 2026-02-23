import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, ShoppingCart, DollarSign, TrendingUp, Plus, Phone, Mail, MapPin } from 'lucide-react';

export default function CustomerOrders() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      const [customerRes, salesRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/sales?customerId=${customerId}`)
      ]);
      setCustomer(customerRes.data.data);
      setSales(salesRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ padding: '24px' }}>
        <button onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px' }}>
          <p style={{ color: '#64748b' }}>Customer not found</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>{customer.name}</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Customer Details & Order History</p>
          </div>
        </div>
        <button onClick={() => { navigate(`/sales?customerId=${customerId}&openModal=true`); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={20} /> Create Sale
        </button>
      </div>

      {/* Customer Info Card */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Contact Info */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              {customer.contact?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={16} color="#6366f1" />
                  <span style={{ color: '#0f172a' }}>{customer.contact.phone}</span>
                </div>
              )}
              {customer.contact?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={16} color="#6366f1" />
                  <span style={{ color: '#0f172a' }}>{customer.contact.email}</span>
                </div>
              )}
              {customer.address?.street && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <MapPin size={16} color="#6366f1" style={{ marginTop: '2px' }} />
                  <div style={{ color: '#0f172a' }}>
                    {customer.address.street}<br />
                    {customer.address.city}, {customer.address.state} {customer.address.zipCode}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Statistics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <ShoppingCart size={20} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d' }}>{customer.totalPurchases || 0}</div>
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>Total Orders</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <DollarSign size={20} color="#2563eb" />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d4ed8' }}>${(customer.totalSpent || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#2563eb' }}>Total Spent</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <TrendingUp size={20} color="#b45309" />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                    ${customer.totalPurchases > 0 ? ((customer.totalSpent || 0) / customer.totalPurchases).toFixed(0) : 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#b45309' }}>Avg Order</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Order History ({sales.length})</h3>
        
        {sales.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sales.map((sale) => (
              <div key={sale._id} style={{ padding: '20px', background: '#fafafa', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                {/* Sale Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{sale.saleNumber}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>${sale.totalAmount?.toFixed(2)}</div>
                    <div style={{ fontSize: '13px', color: '#059669' }}>Profit: +${sale.totalProfit?.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  {/* Items */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '10px' }}>ITEMS ({sale.items?.length || 0})</div>
                    {sale.items?.map((item, idx) => (
                      <div key={idx} style={{ padding: '10px', background: 'white', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{item.brand} {item.model}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          IMEI: {item.imei} • {item.storage} {item.color}
                        </div>
                        <div sle={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Sale Price:</span>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>${item.salePrice?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping & Details */}
                  <div>
                    {/* Financial Breakdown */}
                    <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>FINANCIAL BREAKDOWN</div>
                      
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                          <span style={{ color: '#64748b' }}>Cost:</span>
                          <span style={{ color: '#dc2626', fontWeight: '500' }}>${sale.items?.reduce((sum, i) => sum + (i.costPrice || 0), 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                          <span style={{ color: '#64748b' }}>Sale:</span>
                          <span style={{ fontWeight: '500' }}>${sale.items?.reduce((sum, i) => sum + (i.salePrice || 0), 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingTop: '3px', borderTop: '1px dashed #e2e8f0' }}>
                          <span style={{ color: '#059669', fontWeight: '500' }}>Gross:</span>
                          <span style={{ color: '#059669', fontWeight: '600' }}>
                            ${(sale.items?.reduce((sum, i) => sum + (i.salePrice || 0), 0) - sale.items?.reduce((sum, i) => sum + (i.costPrice || 0), 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {(sale.costs?.marketplaceFees > 0 || sale.shipping?.shippingCost > 0 || sale.costs?.handling > 0) && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                          {sale.costs?.marketplaceFees > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span>Platform:</span>
                              <span style={{ color: '#dc2626' }}>-${sale.costs.marketplaceFees.toFixed(2)}</span>
                            </div>
                          )}
                          {sale.shipping?.shippingCost > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span>Shipping:</span>
                              <span style={{ color: '#dc2626' }}>-${sale.shipping.shippingCost.toFixed(2)}</span>
                            </div>
                          )}
                          {sale.costs?.handling > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span>Handling:</span>
                              <span style={{ color: '#dc2626' }}>-${sale.costs.handling.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '2px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>Net Profit:</span>
                          <span style={{ fontWeight: '700', color: '#10b981' }}>${sale.totalProfit?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {sale.shipping?.trackingNumber && (
                      <div style={{ background: 'white', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>SHIPPING</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                          {sale.shipping.carrier} • {sale.shipping.trackingNumber}
                        </div>
                      {sale.shipping.address?.name && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                            {sale.shipping.address.name}<br />
                            {sale.shipping.address.street}<br />
                            {sale.shipping.address.city}, {sale.shipping.address.state} {sale.shipping.address.zipCode}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Channel:</span>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{sale.salesChannel?.replace('_', ' ')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Payment:</span>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{sale.paymentMethod}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Status:</span>
                          <span style={{ fontWeight: '600', color: '#10b981' }}>{sale.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', background: '#f8fafc', borderRadius: '10px' }}>
            <ShoppingCart size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>No orders yet</p>
            <button onClick={() => { navigate(`/sales?customerId=${customerId}&openModal=true`); }} style={{ background: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              <Plus size={16} style={{ display: 'inline', marginRight: '6px' }} /> Create First Sale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
