'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { reviewService } from '@smart-bazar/shared/lib/services/reviewService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { clientDb, collection, getDocs, query, where } from '@smart-bazar/shared/lib/firebase';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES, ORDER_STATUS_FLOW } from '@smart-bazar/shared/lib/constants';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';

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

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // New states for review feedback tracking
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dismissed_feedback_orders');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });
  
  // Feedback modal states
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [vendorName, setVendorName] = useState<string>('Store Vendor');
  const [deliveryName, setDeliveryName] = useState<string>('Delivery Agent');
  const [loadingNames, setLoadingNames] = useState<boolean>(false);

  // Rating and comment states
  const [vendorRating, setVendorRating] = useState<number>(0);
  const [vendorComment, setVendorComment] = useState<string>('');
  const [deliveryRating, setDeliveryRating] = useState<number>(0);
  const [deliveryComment, setDeliveryComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Quick tag states
  const [vendorTags, setVendorTags] = useState<string[]>([]);
  const [deliveryTags, setDeliveryTags] = useState<string[]>([]);

  // Reset rating, comment, and tags state when modal is closed
  useEffect(() => {
    if (!reviewOrder) {
      setVendorRating(0);
      setVendorComment('');
      setDeliveryRating(0);
      setDeliveryComment('');
      setVendorTags([]);
      setDeliveryTags([]);
    }
  }, [reviewOrder]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // ✅ Real-time subscription — updates instantly on status change
    const unsubscribe = orderService.subscribeToOrdersByCustomer(user.uid, (o) => {
      setOrders(o);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Load reviews to identify which completed orders have already been rated
  useEffect(() => {
    if (!user) return;
    const fetchReviewedOrders = async () => {
      try {
        const reviews = await reviewService.getReviewsByCustomer(user.uid);
        const ids = new Set(reviews.map((r) => r.orderId));
        setReviewedOrderIds(ids);
      } catch (err) {
        console.error('Error fetching reviewed orders:', err);
      }
    };
    fetchReviewedOrders();
  }, [user]);

  // Fetch names for the feedback modal
  useEffect(() => {
    if (!reviewOrder) {
      setVendorName('Store Vendor');
      setDeliveryName('Delivery Agent');
      return;
    }

    const fetchNames = async () => {
      setLoadingNames(true);
      try {
        const promises: Promise<any>[] = [];
        
        if (reviewOrder.assignedVendorId) {
          promises.push(
            userService.getUser(reviewOrder.assignedVendorId).then(u => {
              if (u?.name) setVendorName(u.name);
            })
          );
        }
        
        if (reviewOrder.assignedDeliveryBoyId) {
          promises.push(
            userService.getUser(reviewOrder.assignedDeliveryBoyId).then(u => {
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
  }, [reviewOrder]);

  // Auto-open feedback modal for recently completed orders without review
  useEffect(() => {
    if (loading || orders.length === 0) return;
    
    const now = Date.now();
    const twoHoursLimit = 2 * 60 * 60 * 1000; // 2 hours in ms
    
    const unreviewedCompletedOrder = orders.find((o) => {
      if (o.status !== 'completed' || reviewedOrderIds.has(o.id) || dismissedOrderIds.has(o.id)) {
        return false;
      }
      // Only auto-prompt if completed within the last 2 hours (or fallback to createdAt)
      const completionTime = o.deliveredAt ? new Date(o.deliveredAt).getTime() : new Date(o.createdAt).getTime();
      return (now - completionTime) < twoHoursLimit;
    });
    
    if (unreviewedCompletedOrder) {
      const timer = setTimeout(() => {
        setReviewOrder(unreviewedCompletedOrder);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, orders, reviewedOrderIds, dismissedOrderIds]);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
  ] as const;

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
    if (filter === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  const getStatusConfig = (status: string) => {
    return ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || { label: status, color: '#64748b', bg: '#f1f5f9' };
  };

  const getStatusEmoji = (status: string) => {
    const map: Record<string, string> = {
      pending: '⏳',
      manager: '👨‍💼',
      store: '🏪',
      packed: '📦',
      delivery: '🛵',
      completed: '✅',
      cancelled: '❌',
    };
    return map[status] || '📋';
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vendorRating === 0 || deliveryRating === 0) {
      alert('Please select star ratings for both.');
      return;
    }
    if (!reviewOrder) return;

    setSubmittingReview(true);
    try {
      const finalVendorComment = vendorTags.length > 0 
        ? `[Tags: ${vendorTags.join(', ')}] ${vendorComment}` 
        : vendorComment;
      const finalDeliveryComment = deliveryTags.length > 0 
        ? `[Tags: ${deliveryTags.join(', ')}] ${deliveryComment}` 
        : deliveryComment;

      await reviewService.submitReview({
        orderId: reviewOrder.id,
        customerId: reviewOrder.customerId,
        customerName: reviewOrder.customerName || 'Anonymous',
        vendorId: reviewOrder.assignedVendorId || 'unknown',
        // backward compatibility fields
        rating: vendorRating,
        comment: finalVendorComment || '',
        
        // new fields
        vendorRating,
        vendorComment: finalVendorComment,
        deliveryBoyId: reviewOrder.assignedDeliveryBoyId || 'unknown',
        deliveryRating,
        deliveryComment: finalDeliveryComment,
        vendorTags,
        deliveryTags,
      } as any);

      // Mark order as reviewed locally
      setReviewedOrderIds((prev) => new Set([...prev, reviewOrder.id]));
      
      // Close modal and reset form
      setReviewOrder(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
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

  if (loading) {
    return (
      <div className="px-4 py-5 animate-fadeIn">
        <div className="h-8 w-32 rounded animate-shimmer mb-1" />
        <div className="h-4 w-20 rounded animate-shimmer mb-4" />
        
        {/* Filter tabs shimmer */}
        <div className="flex gap-2 mb-5 p-1 bg-muted rounded-xl">
          <div className="flex-1 h-8 rounded-lg animate-shimmer" />
          <div className="flex-1 h-8 rounded-lg animate-shimmer" />
          <div className="flex-1 h-8 rounded-lg animate-shimmer" />
        </div>

        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex justify-between mb-2.5">
                <div className="h-4 w-24 rounded animate-shimmer" />
                <div className="h-6 w-20 rounded-full animate-shimmer" />
              </div>
              <div className="h-4 w-32 rounded animate-shimmer mb-1" />
              <div className="flex justify-between mt-2.5">
                <div className="h-4 w-16 rounded animate-shimmer" />
                <div className="h-3.5 w-20 rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 animate-fadeIn">
      {/* Dynamic inline styles for pulse animation */}
      <style>{`
        @keyframes stepper-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .animate-stepper-pulse {
          animation: stepper-pulse 2s infinite ease-in-out;
        }
      `}</style>

      {/* Header */}
      <h1 className="text-xl font-extrabold mb-1">My Orders</h1>
      <p className="text-sm text-muted-foreground mb-4">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 p-1 bg-muted rounded-xl">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 press-effect ${
              filter === opt.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          type="orders"
          title={filter === 'active' ? 'No active orders' : filter === 'completed' ? 'No completed orders' : 'No orders yet'}
          description={filter === 'all' ? 'Place your first order and get premium furniture delivered!' : 'Switch to "All" to see all orders'}
          action={filter === 'all' ? {
            label: 'Shop Now',
            onClick: () => router.push('/home')
          } : undefined}
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredOrders.map((order, i) => {
            const statusConfig = getStatusConfig(order.status);
            const isActive = !['completed', 'cancelled'].includes(order.status);
            const isCompleted = order.status === 'completed';
            const hasBeenReviewed = reviewedOrderIds.has(order.id);
            const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.status as any);
            const showStepper = currentStepIndex !== -1 && order.status !== 'cancelled';

            return (
              <div
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className="w-full text-left bg-card rounded-2xl border border-border p-4 card-hover press-effect animate-fadeInUp cursor-pointer relative"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                    {isActive && (
                      <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <span
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: statusConfig.bg, color: statusConfig.color }}
                  >
                    {getStatusEmoji(order.status)} {statusConfig.label}
                  </span>
                </div>

                {/* Items preview */}
                <p className="text-sm font-medium mb-0.5">
                  {order.items[0]?.name}
                  {order.items.length > 1 && (
                    <span className="text-muted-foreground font-normal"> +{order.items.length - 1} more</span>
                  )}
                </p>

                {/* Live Stepper Tracker */}
                {showStepper && (
                  <div className="mt-4 pt-4 pb-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                    <div className="relative mb-6 px-1">
                      {/* Progress Line Container */}
                      <div className="absolute left-[14px] right-[14px] top-[14px] h-[3px] -translate-y-1/2 z-0">
                        {/* Background track */}
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 rounded-full" />
                        {/* Active fill */}
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${(currentStepIndex / 5) * 100}%` }}
                        />
                      </div>

                      {/* Steps Container */}
                      <div className="flex justify-between relative z-10 px-0.5">
                        {ORDER_STATUS_FLOW.map((statusStep, idx) => {
                          const isStepCompleted = idx <= currentStepIndex;
                          const isStepActive = idx === currentStepIndex;
                          const stepLabels = ['Placed', 'Assigned', 'At Store', 'Packed', 'Out for Delivery', 'Delivered'];
                          const stepEmojis = ['📋', '👨‍💼', '🏪', '📦', '🛵', '✅'];
                          
                          return (
                            <div key={statusStep} className="flex flex-col items-center flex-1">
                              {/* Step Node */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500 shadow-md ${
                                  isStepActive 
                                    ? 'animate-stepper-pulse ring-4 ring-amber-500/20 scale-110 border-2 border-amber-400 bg-slate-900' 
                                    : isStepCompleted
                                      ? 'border border-emerald-500 bg-emerald-950/20'
                                      : 'border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-600 opacity-60'
                                }`}
                                style={{
                                  backgroundColor: isStepActive 
                                    ? undefined 
                                    : isStepCompleted 
                                      ? 'rgba(16, 185, 129, 0.1)'
                                      : undefined
                                }}
                              >
                                <span className={isStepActive ? 'scale-110 animate-bounce' : ''}>
                                  {stepEmojis[idx]}
                                </span>
                              </div>
                              
                              {/* Step Label */}
                              <span 
                                className={`text-[8px] sm:text-[9px] font-bold mt-1.5 tracking-tight text-center leading-none max-w-[55px] transition-colors duration-300 ${
                                  isStepActive 
                                    ? 'text-slate-800 dark:text-white font-black' 
                                    : isStepCompleted 
                                      ? 'text-slate-600 dark:text-slate-300' 
                                      : 'text-slate-400 dark:text-slate-600 font-medium'
                                }`}
                              >
                                {stepLabels[idx]}
                              </span>

                              {/* Status Badge */}
                              <span 
                                className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded-full mt-1.5 border transition-all duration-300 uppercase tracking-wider ${
                                  isStepActive 
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                    : isStepCompleted 
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                      : 'bg-slate-100 dark:bg-slate-900/20 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/40'
                                }`}
                              >
                                {isStepActive ? 'Active' : isStepCompleted ? 'Done' : 'Pending'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-primary">₹{order.totalAmount}</span>
                    {isCompleted && (
                      <div onClick={(e) => e.stopPropagation()} className="inline-block">
                        {hasBeenReviewed ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-0.5">
                            ✨ Reviewed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setReviewOrder(order);
                            }}
                            className="text-[10px] font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 px-3 py-1 rounded-full shadow-sm hover:shadow transition-all press-effect flex items-center gap-1"
                          >
                            ⭐ Rate Delivery & Store
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {order.deliverySlot && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                        ⏱️ {order.deliverySlot}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground">
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback Modal */}
      {reviewOrder && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn"
          onClick={() => {
            setDismissedOrderIds((prev) => new Set([...prev, reviewOrder.id]));
            setReviewOrder(null);
          }}
        >
          <div 
            className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-border p-6 shadow-2xl animate-scaleIn overflow-y-auto max-h-[85vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5 border-b border-border pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Order Feedback</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order ID: <span className="font-mono text-primary font-semibold">#{reviewOrder.id.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  setDismissedOrderIds((prev) => new Set([...prev, reviewOrder.id]));
                  setReviewOrder(null);
                }}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-all duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              {loadingNames ? (
                <div className="space-y-4 py-8 text-center">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground animate-pulse">Loading partner details...</p>
                </div>
              ) : (
                <>
                  {/* Store Vendor Rating */}
                  <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-border/40">
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
                  <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-border/40">
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

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedOrderIds((prev) => {
                          const next = new Set([...prev, reviewOrder.id]);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('dismissed_feedback_orders', JSON.stringify(Array.from(next)));
                          }
                          return next;
                        });
                        setReviewOrder(null);
                      }}
                      className="flex-1 py-3 border border-border rounded-xl font-bold text-sm hover:bg-muted text-muted-foreground transition-all duration-200 press-effect cursor-pointer focus:outline-none"
                    >
                      Not Now
                    </button>
                    <button
                      type="submit"
                      disabled={vendorRating === 0 || deliveryRating === 0 || submittingReview}
                      className={`flex-1 py-3 rounded-xl font-extrabold text-sm text-white transition-all duration-200 cursor-pointer focus:outline-none ${
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
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
