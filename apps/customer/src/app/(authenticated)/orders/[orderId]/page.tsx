'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUS_FLOW, ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    // Real-time subscription
    const unsub = orderService.subscribeToOrder(orderId, (o) => {
      setOrder(o);
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  const getStatusEmoji = (status: string) => {
    const map: Record<string, string> = {
      pending: '📋',
      manager: '👨‍💼',
      store: '🏪',
      packed: '📦',
      delivery: '🛵',
      completed: '✅',
      cancelled: '❌',
    };
    return map[status] || '📋';
  };

  if (loading) {
    return (
      <div className="px-4 py-5 animate-fadeIn">
        <div className="h-10 w-48 rounded animate-shimmer mb-6" />
        <div className="bg-card rounded-2xl border border-border p-4 mb-4">
          <div className="space-y-5">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full animate-shimmer shrink-0" />
                <div className="flex-1 pt-1">
                  <div className="h-3.5 w-32 rounded animate-shimmer mb-1.5" />
                  <div className="h-3 w-20 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fadeIn">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="font-bold text-lg mb-2">Order not found</h2>
        <button
          onClick={() => router.push('/orders')}
          className="text-primary font-semibold text-sm hover:underline"
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.status as typeof ORDER_STATUS_FLOW[number]);
  const statusConfig = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];

  return (
    <div className="animate-fadeIn pb-6">
      {/* Back Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/orders')}
          className="p-2 rounded-xl hover:bg-muted transition-colors press-effect"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-extrabold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Current Status Hero */}
      <div
        className="mx-4 rounded-2xl p-4 mb-5 flex items-center gap-3"
        style={{ background: isCancelled ? '#fee2e2' : isCompleted ? '#dcfce7' : '#eff6ff' }}
      >
        <span className="text-3xl">{getStatusEmoji(order.status)}</span>
        <div>
          <p className="font-bold" style={{ color: statusConfig?.color }}>
            {statusConfig?.label || order.status}
          </p>
          <p className="text-xs" style={{ color: statusConfig?.color, opacity: 0.75 }}>
            {isCompleted
              ? 'Your order has been delivered!'
              : isCancelled
              ? 'This order was cancelled'
              : 'We are working on your order'}
          </p>
        </div>
        {!isCompleted && !isCancelled && (
          <div className="ml-auto">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse-slow" />
          </div>
        )}
      </div>

      {/* Progress Timeline */}
      {!isCancelled && (
        <div className="mx-4 bg-card rounded-2xl border border-border p-4 mb-4">
          <h3 className="font-bold mb-4 text-sm">Order Progress</h3>
          <div className="space-y-0">
            {ORDER_STATUS_FLOW.map((status, index) => {
              const isStepCompleted = index <= currentStepIndex;
              const isCurrentStep = index === currentStepIndex;
              const stepConfig = ORDER_STATUSES[status];
              return (
                <div key={status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-500 ${
                        isCurrentStep ? 'ring-4 ring-primary/20 scale-110' : ''
                      }`}
                      style={
                        isStepCompleted
                          ? { background: stepConfig.color, color: 'white' }
                          : { background: '#f1f5f9', color: '#94a3b8' }
                      }
                    >
                      {isStepCompleted ? '✓' : index + 1}
                    </div>
                    {index < ORDER_STATUS_FLOW.length - 1 && (
                      <div
                        className="w-0.5 h-8 transition-all duration-500"
                        style={{ background: isStepCompleted ? stepConfig.color : '#e2e8f0' }}
                      />
                    )}
                  </div>
                  <div className="pb-5 pt-1">
                    <p className={`text-sm font-semibold ${isStepCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {getStatusEmoji(status)} {stepConfig.label}
                    </p>
                    {isCurrentStep && (
                      <p className="text-xs font-medium mt-0.5" style={{ color: stepConfig.color }}>
                        ← Current status
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="mx-4 bg-card rounded-2xl border border-border p-4 mb-4">
        <h3 className="font-bold mb-3 text-sm">Items Ordered</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground ml-1">× {item.quantity}</span>
              </div>
              <span className="font-semibold">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2.5 flex justify-between items-center">
            <span className="font-bold">Total</span>
            <span className="font-extrabold text-primary text-base">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      {order.deliveryAddress && (
        <div className="mx-4 bg-card rounded-2xl border border-border p-4 mb-4">
          <h3 className="font-bold mb-2 text-sm">Delivery Address</h3>
          <div className="flex gap-2">
            <span className="text-xl">📍</span>
            <p className="text-sm text-muted-foreground">
              {order.deliveryAddress.street}, {order.deliveryAddress.city}
              {order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ''}
              {order.deliveryAddress.pincode ? ` - ${order.deliveryAddress.pincode}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Special Instructions */}
      {order.specialInstructions && (
        <div className="mx-4 bg-card rounded-2xl border border-border p-4 mb-4">
          <h3 className="font-bold mb-2 text-sm">📋 Special Instructions</h3>
          <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
        </div>
      )}

      {/* Reorder button */}
      {isCompleted && (
        <div className="mx-4">
          <button
            onClick={() => router.push('/home')}
            className="w-full py-3.5 rounded-2xl text-white font-bold press-effect"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
          >
            🛒 Order Again
          </button>
        </div>
      )}
    </div>
  );
}
