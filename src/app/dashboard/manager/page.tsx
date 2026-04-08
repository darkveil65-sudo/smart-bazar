'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import { orderService } from '@/lib/services/orderService';
import { productService } from '@/lib/services/productService';
import { applicationService } from '@/lib/services/applicationService';
import { userService } from '@/lib/services/userService';
import { Order, Product, Application, UserData } from '@/types/firestore';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants';
import { OrderStatusBadge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/contexts/ui/ToastContext';

const managerNav = [
  { label: 'Dashboard', href: '/dashboard/manager', icon: '📊' },
];

export default function ManagerDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stores, setStores] = useState<UserData[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<UserData[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'applications'>('orders');
  const [productModal, setProductModal] = useState(false);
  const [assignModal, setAssignModal] = useState<{ orderId: string; type: 'store' | 'delivery' } | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '', description: '' });

  const assignedCategories = userData?.assignedCategories || [];

  useEffect(() => {
    const unsubs = [
      orderService.subscribeToOrders(setOrders),
      productService.subscribeToProducts(setProducts),
      applicationService.subscribeToApplications(setApplications),
    ];
    userService.getUsersByRole('store').then(setStores);
    userService.getUsersByRole('delivery').then(setDeliveryBoys);
    return () => unsubs.forEach((u) => u());
  }, []);

  const myOrders = orders.filter((o) =>
    o.status === 'pending' || o.assignedManagerId === userData?.id
  );

  const myProducts = products.filter((p) =>
    assignedCategories.length === 0 || assignedCategories.includes(p.category)
  );

  const pendingApps = applications.filter((a) => a.status === 'pending');

  const handleAssignToSelf = async (orderId: string) => {
    if (!userData) return;
    try {
      await orderService.assignManager(orderId, userData.id);
      addToast('Order assigned to you', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const handleAssignStore = async (orderId: string, storeId: string) => {
    try {
      await orderService.assignStore(orderId, storeId);
      addToast('Assigned to store', 'success');
      setAssignModal(null);
    } catch { addToast('Failed', 'error'); }
  };

  const handleAssignDelivery = async (orderId: string, deliveryId: string) => {
    try {
      await orderService.assignDelivery(orderId, deliveryId);
      addToast('Assigned to delivery', 'success');
      setAssignModal(null);
    } catch { addToast('Failed', 'error'); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      addToast('Fill all required fields', 'error');
      return;
    }
    try {
      await productService.addProduct({
        name: newProduct.name,
        price: Number(newProduct.price),
        category: newProduct.category,
        storeId: userData?.id || '',
        description: newProduct.description,
        stock: 100,
        isAvailable: true,
        createdAt: new Date().toISOString(),
      });
      addToast('Product added', 'success');
      setProductModal(false);
      setNewProduct({ name: '', price: '', category: '', description: '' });
    } catch { addToast('Failed', 'error'); }
  };

  const handleApproveApp = async (app: Application) => {
    try {
      await applicationService.approveApplication(app.id);
      if (app.userId) {
        await userService.updateUser(app.userId, {
          role: app.type as UserData['role'],
          ...(app.storeCategory ? { assignedCategories: [app.storeCategory] } : {}),
        });
      }
      addToast('Approved', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const tabs = [
    { key: 'orders', label: 'Orders', icon: '📦' },
    { key: 'products', label: 'Products', icon: '🏷️' },
    { key: 'applications', label: 'Applications', icon: '📋' },
  ] as const;

  return (
    <DashboardLayout title="Manager Dashboard" navItems={managerNav}>
      {/* Categories info */}
      {assignedCategories.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground py-1">Your categories:</span>
          {assignedCategories.map((catId) => {
            const cat = CATEGORY_MAP[catId];
            return cat ? (
              <span key={catId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {cat.icon} {cat.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="animate-fadeIn space-y-3">
          {myOrders.length === 0 ? (
            <EmptyState icon="📦" title="No orders" description="Orders will appear here" />
          ) : (
            myOrders.map((order) => (
              <Card key={order.id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items • ₹{order.totalAmount}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex gap-2 mt-3">
                  {order.status === 'pending' && (
                    <Button size="xs" onClick={() => handleAssignToSelf(order.id)}>Accept Order</Button>
                  )}
                  {order.status === 'manager' && (
                    <Button size="xs" onClick={() => setAssignModal({ orderId: order.id, type: 'store' })}>Assign Store</Button>
                  )}
                  {order.status === 'packed' && (
                    <Button size="xs" variant="secondary" onClick={() => setAssignModal({ orderId: order.id, type: 'delivery' })}>Assign Delivery</Button>
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
            <h3 className="font-semibold">Products ({myProducts.length})</h3>
            <Button size="sm" onClick={() => setProductModal(true)}>+ Add Product</Button>
          </div>
          {myProducts.length === 0 ? (
            <EmptyState icon="🏷️" title="No products" action={{ label: 'Add Product', onClick: () => setProductModal(true) }} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myProducts.map((p) => (
                <Card key={p.id}>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORY_MAP[p.category]?.name || p.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">₹{p.price}</p>
                      <Button size="xs" variant="danger" className="mt-1" onClick={() => productService.deleteProduct(p.id)}>Delete</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications */}
      {activeTab === 'applications' && (
        <div className="animate-fadeIn space-y-3">
          {pendingApps.length === 0 ? (
            <EmptyState icon="📋" title="No pending applications" />
          ) : (
            pendingApps.map((app) => (
              <Card key={app.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium capitalize">{app.type} Application</p>
                    {app.businessName && <p className="text-xs text-muted-foreground">{app.businessName}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="xs" onClick={() => handleApproveApp(app)}>Approve</Button>
                    <Button size="xs" variant="danger" onClick={() => applicationService.rejectApplication(app.id)}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add product modal */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title="Add Product">
        <Input label="Product Name" value={newProduct.name} onChange={(v) => setNewProduct((p) => ({ ...p, name: v }))} required />
        <Input label="Price (₹)" type="number" value={newProduct.price} onChange={(v) => setNewProduct((p) => ({ ...p, price: v }))} required />
        <Select
          label="Category"
          value={newProduct.category}
          onChange={(v) => setNewProduct((p) => ({ ...p, category: v }))}
          options={(assignedCategories.length > 0 ? CATEGORIES.filter((c) => assignedCategories.includes(c.id)) : CATEGORIES).map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          required
        />
        <Input label="Description" value={newProduct.description} onChange={(v) => setNewProduct((p) => ({ ...p, description: v }))} />
        <Button variant="primary" block onClick={handleAddProduct} className="mt-4">Add Product</Button>
      </Modal>

      {/* Assign modal */}
      {assignModal && (
        <Modal isOpen={true} onClose={() => setAssignModal(null)} title={`Assign ${assignModal.type === 'store' ? 'Store' : 'Delivery Boy'}`}>
          <div className="space-y-2">
            {(assignModal.type === 'store' ? stores : deliveryBoys).map((u) => (
              <button
                key={u.id}
                onClick={() => assignModal.type === 'store' ? handleAssignStore(assignModal.orderId, u.id) : handleAssignDelivery(assignModal.orderId, u.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">{u.name[0]}</div>
                <div className="text-left">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </button>
            ))}
            {(assignModal.type === 'store' ? stores : deliveryBoys).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No {assignModal.type === 'store' ? 'stores' : 'delivery boys'} available</p>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}