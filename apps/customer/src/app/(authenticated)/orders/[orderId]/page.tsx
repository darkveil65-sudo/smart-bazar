'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order, Review } from '@smart-bazar/shared/types/firestore';
import { reviewService } from '@smart-bazar/shared/lib/services/reviewService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { ORDER_STATUS_FLOW, ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';

const VENDOR_TAGS = [
  'Premium Woods',
  'Sturdy Build',
  'Flawless Finish',
  'Great Comfort',
  'Elegant Design',
  'Super Value'
];

const DELIVERY_TAGS = [
  'On Time',
  'Polite Behavior',
  'Careful Handling',
  'Good Communication',
  'Fast Delivery',
  'Followed Instructions'
];

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dual feedback states
  const [vendorName, setVendorName] = useState<string>('Store Vendor');
  const [deliveryName, setDeliveryName] = useState<string>('Delivery Agent');
  const [loadingNames, setLoadingNames] = useState<boolean>(false);

  const [vendorRating, setVendorRating] = useState<number>(0);
  const [vendorComment, setVendorComment] = useState<string>('');
  const [deliveryRating, setDeliveryRating] = useState<number>(0);
  const [deliveryComment, setDeliveryComment] = useState<string>('');

  const [vendorTags, setVendorTags] = useState<string[]>([]);
  const [deliveryTags, setDeliveryTags] = useState<string[]>([]);

  useEffect(() => {
    if (!orderId) return;
    // Real-time subscription
    const unsub = orderService.subscribeToOrder(orderId, (o) => {
      setOrder(o);
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !order || order.status !== 'completed') return;
    reviewService.getReviewByOrder(orderId).then((r) => {
      if (r) {
        setReview(r);
      }
    });
  }, [orderId, order]);

  // Fetch names for review
  useEffect(() => {
    if (!order) {
      setVendorName('Store Vendor');
      setDeliveryName('Delivery Agent');
      return;
    }

    const fetchNames = async () => {
      setLoadingNames(true);
      try {
        const promises: Promise<any>[] = [];
        
        if (order.assignedVendorId) {
          promises.push(
            userService.getUser(order.assignedVendorId).then(u => {
              if (u?.name) setVendorName(u.name);
            })
          );
        }
        
        if (order.assignedDeliveryBoyId) {
          promises.push(
            userService.getUser(order.assignedDeliveryBoyId).then(u => {
              if (u?.name) setDeliveryName(u.name);
            })
          );
        }

        await Promise.all(promises);
      } catch (error) {
        console.error('Error fetching review entities:', error);
      } finally {
        setLoadingNames(false);
      }
    };

    fetchNames();
  }, [order]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vendorRating === 0 || deliveryRating === 0) {
      alert('Please select star ratings for both.');
      return;
    }
    if (!order) return;

    setSubmittingReview(true);
    try {
      const finalVendorComment = vendorTags.length > 0 
        ? `[Tags: ${vendorTags.join(', ')}] ${vendorComment}` 
        : vendorComment;
      const finalDeliveryComment = deliveryTags.length > 0 
        ? `[Tags: ${deliveryTags.join(', ')}] ${deliveryComment}` 
        : deliveryComment;

      await reviewService.submitReview({
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName || 'Anonymous',
        vendorId: order.assignedVendorId || 'unknown',
        // backward compatibility fields
        rating: vendorRating,
        comment: finalVendorComment || '',
        
        // new fields
        vendorRating,
        vendorComment: finalVendorComment,
        deliveryBoyId: order.assignedDeliveryBoyId || 'unknown',
        deliveryRating,
        deliveryComment: finalDeliveryComment,
        vendorTags,
        deliveryTags,
      } as any);

      const savedReview = await reviewService.getReviewByOrder(order.id);
      setReview(savedReview);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (count: number, onClick?: (r: number) => void) => {
    return (
      <div className="flex gap-2 justify-center my-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onClick && onClick(star)}
            className={`text-2xl transition-all duration-150 ${onClick ? 'cursor-pointer hover:scale-110 press-effect' : 'cursor-default'}`}
          >
            <span style={{ color: star <= count ? '#f59e0b' : '#d1d5db' }}>★</span>
          </button>
        ))}
      </div>
    );
  };

  const renderStarsInput = (count: number, onClick: (r: number) => void) => {
    return (
      <div className="flex gap-2 justify-center my-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= count;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onClick(star)}
              className="group p-1 transition-all duration-150 cursor-pointer hover:scale-125 press-effect focus:outline-none"
            >
              <svg
                className={`w-8 h-8 transition-colors duration-150 ${
                  isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700 fill-none'
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          );
        })}
      </div>
    );
  };

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
      <div className="px-4 py-5 animate-fadeIn space-y-5">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl animate-shimmer shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-5 w-40 rounded animate-shimmer" />
            <div className="h-3.5 w-28 rounded animate-shimmer" />
          </div>
        </div>

        {/* Current Status Hero Skeleton */}
        <div className="h-20 rounded-2xl animate-shimmer w-full" />

        {/* Progress Timeline Skeleton */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="h-4 w-32 rounded animate-shimmer mb-5" />
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full animate-shimmer shrink-0" />
                <div className="flex-1 pt-1 space-y-1.5">
                  <div className="h-4 w-40 rounded animate-shimmer" />
                  <div className="h-3 w-24 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items Skeleton */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="h-4 w-28 rounded animate-shimmer mb-2" />
          <div className="flex justify-between items-center">
            <div className="h-4 w-36 rounded animate-shimmer" />
            <div className="h-4 w-12 rounded animate-shimmer" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-44 rounded animate-shimmer" />
            <div className="h-4 w-12 rounded animate-shimmer" />
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <div className="h-4 w-16 rounded animate-shimmer" />
            <div className="h-5 w-20 rounded animate-shimmer" />
          </div>
        </div>

        {/* Delivery Address Skeleton */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
          <div className="h-4 w-36 rounded animate-shimmer mb-1" />
          <div className="h-4 w-40 rounded animate-shimmer" />
          <div className="h-3 w-28 rounded animate-shimmer" />
          <div className="h-3.5 w-full rounded animate-shimmer" />
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

  const formatStepTime = (status: string) => {
    if (status === 'pending' && order.createdAt) {
      return new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (status === 'packed' && order.packedAt) {
      return new Date(order.packedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (status === 'completed' && order.deliveredAt) {
      return new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  };

  const stepDescriptions: Record<string, string> = {
    pending: 'Your order has been received and is awaiting confirmation.',
    manager: 'A manager is reviewing your order and assigning it to stores.',
    store: 'The store partners are preparing and gathering your items.',
    packed: 'Your items have been carefully packed and are ready for pickup.',
    delivery: 'A delivery partner has picked up your order and is on the way.',
    completed: 'Your order has been successfully delivered to your doorstep.',
  };

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
          {order.deliverySlot && (
            <p className="text-xs font-semibold text-primary mt-1">
              Expected Delivery: {order.deliverySlot}
            </p>
          )}
          {order.isPreorder && (
            <p className="text-xs font-semibold text-orange-600 mt-1">
              Pre-order Delivery: {order.preorderDeliveryTime || 'Pending manager confirmation'}
            </p>
          )}
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
                      {index < currentStepIndex ? '✓' : index === currentStepIndex ? getStatusEmoji(status) : index + 1}
                    </div>
                    {index < ORDER_STATUS_FLOW.length - 1 && (
                      <div
                        className="w-0.5 h-8 transition-all duration-500"
                        style={{ background: index < currentStepIndex ? stepConfig.color : '#e2e8f0' }}
                      />
                    )}
                  </div>
                  <div className="pb-5 pt-1 flex-1">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <p className={`text-sm font-semibold ${isStepCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {stepConfig.label}
                        </p>
                        {isCurrentStep && (
                          <p className="text-[10px] font-bold mt-0.5" style={{ color: stepConfig.color }}>
                            Active Now
                          </p>
                        )}
                        {isStepCompleted && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {stepDescriptions[status]}
                          </p>
                        )}
                      </div>
                      {formatStepTime(status) && (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          {formatStepTime(status)}
                        </span>
                      )}
                    </div>
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
          <h3 className="font-bold mb-2 text-sm">📍 Delivery Address</h3>
          <div className="space-y-0.5">
            {(order.deliveryAddress as any).customerName && (
              <p className="text-sm font-semibold">{(order.deliveryAddress as any).customerName}</p>
            )}
            {(order.deliveryAddress as any).mobile && (
              <p className="text-xs text-muted-foreground">📞 {(order.deliveryAddress as any).mobile}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {[(order.deliveryAddress as any).para, (order.deliveryAddress as any).area, order.deliveryAddress.city]
                .filter(Boolean)
                .join(', ')}
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

      {/* Customer Rating Card */}
      {isCompleted && (
        <div className="mx-4 bg-card rounded-2xl border border-border p-5 mb-4 animate-fadeIn">
          <h3 className="font-extrabold text-sm text-center text-slate-800 dark:text-white">
            {review ? 'Your Feedback' : 'Rate Your Order'}
          </h3>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {review
              ? 'Thank you for sharing your experience!'
              : 'Rate the Store Vendor and the Delivery Partner below'}
          </p>

          {review ? (
            <div className="mt-3 space-y-4">
              {review.vendorRating !== undefined || review.deliveryRating !== undefined ? (
                <div className="space-y-3">
                  {review.vendorRating !== undefined && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">🏪 Store Vendor Service</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < (review.vendorRating ?? 0) ? '#f59e0b' : '#d1d5db' }} className="text-sm">★</span>
                          ))}
                        </div>
                      </div>
                      {review.vendorComment && (
                        <p className="text-xs text-slate-600 italic mt-1.5">&quot;{review.vendorComment}&quot;</p>
                      )}
                    </div>
                  )}
                  {review.deliveryRating !== undefined && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">🛵 Delivery Partner Service</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < (review.deliveryRating ?? 0) ? '#f59e0b' : '#d1d5db' }} className="text-sm">★</span>
                          ))}
                        </div>
                      </div>
                      {review.deliveryComment && (
                        <p className="text-xs text-slate-600 italic mt-1.5">&quot;{review.deliveryComment}&quot;</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  {renderStars(review.rating)}
                  {review.comment && (
                    <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 italic">
                      &quot;{review.comment}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-6">
              {loadingNames ? (
                <div className="space-y-4 py-8 text-center animate-pulse">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Loading partner details...</p>
                </div>
              ) : (
                <>
                  {/* Store Vendor Rating */}
                  <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-border/40 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏪</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Store Vendor Service</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">{vendorName}</p>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      {renderStarsInput(vendorRating, setVendorRating)}
                    </div>

                    {vendorRating > 0 && (
                      <div className="py-1">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 text-center">What did you like about the store vendor?</p>
                        <div className="flex flex-wrap gap-1.5 justify-center py-1">
                          {VENDOR_TAGS.map((tag) => {
                            const isSelected = vendorTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  setVendorTags(prev =>
                                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200 cursor-pointer focus:outline-none ${
                                  isSelected
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                                    : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-300'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <textarea
                        rows={2}
                        value={vendorComment}
                        onChange={(e) => setVendorComment(e.target.value)}
                        placeholder="How was the product packaging and quality? (optional)"
                        className="w-full text-xs bg-card border border-border rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Delivery Agent Rating */}
                  <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-border/40 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛵</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Delivery Partner Service</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">{deliveryName}</p>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      {renderStarsInput(deliveryRating, setDeliveryRating)}
                    </div>

                    {deliveryRating > 0 && (
                      <div className="py-1">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 text-center">What did you like about the delivery partner?</p>
                        <div className="flex flex-wrap gap-1.5 justify-center py-1">
                          {DELIVERY_TAGS.map((tag) => {
                            const isSelected = deliveryTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  setDeliveryTags(prev =>
                                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200 cursor-pointer focus:outline-none ${
                                  isSelected
                                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-500/5'
                                    : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-300'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <textarea
                        rows={2}
                        value={deliveryComment}
                        onChange={(e) => setDeliveryComment(e.target.value)}
                        placeholder="How was the rider's behavior and speed? (optional)"
                        className="w-full text-xs bg-card border border-border rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={vendorRating === 0 || deliveryRating === 0 || submittingReview}
                    className={`w-full py-3 rounded-xl font-extrabold text-sm text-white transition-all duration-200 cursor-pointer focus:outline-none ${
                      vendorRating === 0 || deliveryRating === 0 || submittingReview
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 press-effect shadow-md shadow-emerald-600/10'
                    }`}
                  >
                    {submittingReview ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Feedback'
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      )}

      {/* Reorder button */}
      {isCompleted && (
        <div className="mx-4">
          <button
            onClick={() => router.push('/home')}
            className="w-full py-3.5 rounded-2xl text-white font-bold press-effect"
            style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}
          >
            🛒 Order Again
          </button>
        </div>
      )}
    </div>
  );
}
