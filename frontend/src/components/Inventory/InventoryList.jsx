import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/inventory');
      setInventory(res.data.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div style={{padding: '2rem'}}>
      <h1 style={{fontSize: '2rem', fontWeight: 'bold'}}>Inventory</h1>
      {loading ? <p>Loading...</p> : (
        <div style={{background: 'white', padding: '1rem', marginTop: '1rem'}}>
          <p>Total items: {inventory.length}</p>
          {inventory.map(item => (
            <div key={item._id} style={{padding: '1rem', borderBottom: '1px solid #eee'}}>
              <strong>{item.model}</strong> - {item.brand} - ${item.price?.retail || 0}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
