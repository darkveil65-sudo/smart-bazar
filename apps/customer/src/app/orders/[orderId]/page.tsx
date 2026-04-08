'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUS_FLOW, ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import { FullPageSpinner } from '@smart-bazar/shared/components/ui/Spinner';

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const unsub = orderService.subscribeToOrder(orderId, (o) => {
      setOrder(o);
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  if (loading) return <FullPageSpinner />;
  if (!order) return (
    <div className="px-4 py-16 text-center">
      <p className="text-4xl mb-3">❌</p>
      <p className="font-medium">Order not found</p>
      <button onClick={() => router.push('/orders')} className="text-primary text-sm mt-2 hover:underline">Back to Orders</button>
    </div>
  );

  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.status as typeof ORDER_STATUS_FLOW[number]);

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/orders')} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Status */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Order Status</h3>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {ORDER_STATUS_FLOW.map((status, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const statusInfo = ORDER_STATUSES[status];
            return (
              <div key={status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all
                      ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                      ${isCompleted ? 'text-white' : 'bg-muted text-muted-foreground'}
                    `}
                    style={isCompleted ? { backgroundColor: statusInfo.color } : {}}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {index < ORDER_STATUS_FLOW.length - 1 && (
                    <div className={`w-0.5 h-8 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
                <div className="pb-6">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {statusInfo.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-primary mt-0.5 animate-pulse-slow">Current status</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order items */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <h3 className="font-semibold mb-3">Items</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
              <span className="font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold mb-2">Delivery Address</h3>
          <p className="text-sm text-muted-foreground">
            {order.deliveryAddress.street}, {order.deliveryAddress.city}
            {order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ''}
            {order.deliveryAddress.pincode ? ` - ${order.deliveryAddress.pincode}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
