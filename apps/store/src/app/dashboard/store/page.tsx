'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { Order, Product } from '@smart-bazar/shared/types/firestore';
import { CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import Card from '@smart-bazar/shared/components/ui/Card';
import Button from '@smart-bazar/shared/components/ui/Button';
import Modal from '@smart-bazar/shared/components/ui/Modal';
import Input from '@smart-bazar/shared/components/ui/Input';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const storeNav = [
  { label: 'Dashboard', href: '/dashboard/store', icon: '🏪' },
];

export default function StoreDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics'>('orders');
  const [productModal, setProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '' });

  const storeCategory = userData?.assignedCategories?.[0] || '';
  const categoryInfo = CATEGORY_MAP[storeCategory];

  useEffect(() => {
    if (!userData) return;
    const unsubs = [
      orderService.subscribeToOrders((allOrders) => {
        setOrders(allOrders.filter((o) => o.assignedStoreId === userData.id));
      }),
    ];
    if (userData.id) {
      const u2 = productService.subscribeToProducts((allProducts) => {
        setProducts(allProducts.filter((p) => p.storeId === userData.id));
      });
      unsubs.push(u2);
    }
    return () => unsubs.forEach((u) => u());
  }, [userData]);

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'store').length,
    packedOrders: orders.filter((o) => o.status === 'packed').length,
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    revenue: orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0),
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'store');
      addToast('Order accepted', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const handlePackOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'packed');
      addToast('Order packed', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !storeCategory || !userData) {
      addToast('Fill all fields', 'error');
      return;
    }
    try {
      await productService.addProduct({
        name: newProduct.name,
        price: Number(newProduct.price),
        category: storeCategory,
        storeId: userData.id,
        description: newProduct.description,
        stock: 100,
        isAvailable: true,
        createdAt: new Date().toISOString(),
      });
      addToast('Product added', 'success');
      setProductModal(false);
      setNewProduct({ name: '', price: '', description: '' });
    } catch { addToast('Failed', 'error'); }
  };

  const tabs = [
    { key: 'orders', label: 'Orders', icon: '📦' },
    { key: 'products', label: 'My Products', icon: '🏷️' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
  ] as const;

  return (
    <DashboardLayout title="Store Dashboard" navItems={storeNav}>
      {categoryInfo && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/5 rounded-xl w-fit">
          <span className="text-lg">{categoryInfo.icon}</span>
          <span className="text-sm font-medium text-primary">Category: {categoryInfo.name}</span>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab.key ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="animate-fadeIn space-y-3">
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <Card><div className="text-center"><p className="text-2xl font-bold">{stats.pendingOrders}</p><p className="text-xs text-muted-foreground">Pending</p></div></Card>
            <Card><div className="text-center"><p className="text-2xl font-bold">{stats.packedOrders}</p><p className="text-xs text-muted-foreground">Packed</p></div></Card>
            <Card><div className="text-center"><p className="text-2xl font-bold text-success">{stats.completedOrders}</p><p className="text-xs text-muted-foreground">Completed</p></div></Card>
          </div>
          {orders.length === 0 ? (
            <EmptyState icon="📦" title="No orders" description="Orders assigned to your store will appear here" />
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
                    <p className="text-sm font-bold text-primary mt-1">₹{order.totalAmount}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex gap-2 mt-2">
                  {order.status === 'store' && (
                    <Button size="xs" onClick={() => handlePackOrder(order.id)}>Mark as Packed</Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Products */}
      {activeTab === 'products' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">My Products ({products.length})</h3>
            <Button size="sm" onClick={() => setProductModal(true)}>+ Add Product</Button>
          </div>
          {products.length === 0 ? (
            <EmptyState icon="🏷️" title="No products" action={{ label: 'Add Product', onClick: () => setProductModal(true) }} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <Card key={p.id}>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                      <p className="text-sm font-bold text-primary mt-1">₹{p.price}</p>
                    </div>
                    <Button size="xs" variant="danger" onClick={() => productService.deleteProduct(p.id)}>Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div className="animate-fadeIn">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card><div className="text-center py-2"><p className="text-3xl font-bold">{stats.totalOrders}</p><p className="text-sm text-muted-foreground">Total Orders</p></div></Card>
            <Card><div className="text-center py-2"><p className="text-3xl font-bold text-success">₹{stats.revenue.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Revenue</p></div></Card>
            <Card><div className="text-center py-2"><p className="text-3xl font-bold">{products.length}</p><p className="text-sm text-muted-foreground">Active Products</p></div></Card>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title="Add Product">
        <Input label="Product Name" value={newProduct.name} onChange={(v) => setNewProduct((p) => ({ ...p, name: v }))} required />
        <Input label="Price (₹)" type="number" value={newProduct.price} onChange={(v) => setNewProduct((p) => ({ ...p, price: v }))} required />
        <Input label="Description" value={newProduct.description} onChange={(v) => setNewProduct((p) => ({ ...p, description: v }))} />
        {categoryInfo && <p className="text-sm text-muted-foreground mb-3">Category: {categoryInfo.icon} {categoryInfo.name}</p>}
        <Button variant="primary" block onClick={handleAddProduct} className="mt-2">Add Product</Button>
      </Modal>
    </DashboardLayout>
  );
}