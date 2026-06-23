'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { Order, Product } from '@smart-bazar/shared/types/firestore';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

type TimeRange = '7d' | '30d' | 'all';

interface DailySale {
  dateStr: string;
  dateLabel: string;
  amount: number;
  count: number;
}

export default function StoreAnalyticsPage() {
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  useEffect(() => {
    if (!userData) return;

    let ordersLoaded = false;
    let productsLoaded = false;

    const checkLoading = () => {
      if (ordersLoaded && productsLoaded) {
        setLoading(false);
      }
    };

    const unsubOrders = orderService.subscribeToOrdersByStore(userData.id, (data) => {
      setOrders(data);
      ordersLoaded = true;
      checkLoading();
    });

    const unsubProducts = productService.subscribeToProductsByVendor(userData.id, (data) => {
      setProducts(data);
      productsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, [userData]);

  // Date Filtering Helper
  const getFilteredOrders = () => {
    if (timeRange === 'all') return orders;

    const now = new Date();
    const limitDate = new Date();
    if (timeRange === '7d') {
      limitDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30d') {
      limitDate.setDate(now.getDate() - 30);
    }

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= limitDate;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Metrics Calculations
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
  const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelled');

  const totalSales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const completionSuccessRate =
    filteredOrders.length > 0
      ? Math.round((completedOrders.length / filteredOrders.length) * 100)
      : 0;

  const totalActiveItems = products.filter(
    (p) => p.isAvailable !== false && p.stock > 0
  ).length;

  const averageOrderValue =
    completedOrders.length > 0
      ? Math.round(totalSales / completedOrders.length)
      : 0;

  // Generate Daily Sales Data for SVG Trend Chart
  const getDailySalesData = (): DailySale[] => {
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 10;
    const result: DailySale[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      const dateLabel = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      result.push({ dateStr, dateLabel, amount: 0, count: 0 });
    }

    completedOrders.forEach((order) => {
      const orderDateStr = new Date(order.createdAt).toDateString();
      const match = result.find((r) => r.dateStr === orderDateStr);
      if (match) {
        match.amount += order.totalAmount;
        match.count += 1;
      }
    });

    return result;
  };

  const dailySales = getDailySalesData();
  const maxSaleAmount = Math.max(...dailySales.map((d) => d.amount), 1000);

  // Top Selling Products Calculation
  const getTopProducts = () => {
    const counts: Record<string, { name: string; qty: number; sales: number; emoji?: string }> = {};

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!counts[item.productId]) {
          counts[item.productId] = {
            name: item.name,
            qty: 0,
            sales: 0,
            emoji: item.emoji,
          };
        }
        counts[item.productId].qty += item.quantity;
        counts[item.productId].sales += item.price * item.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  // Render SVG Path for Chart
  const generateChartPath = (width: number, height: number) => {
    if (dailySales.length === 0) return null;
    const points = dailySales.map((d, index) => {
      const x = (index / (dailySales.length - 1)) * width;
      const y = height - (d.amount / maxSaleAmount) * (height - 20) - 10;
      return `${x},${y}`;
    });

    return {
      line: `M ${points.join(' L ')}`,
      area: `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`,
      pointsArray: points.map((p) => {
        const [x, y] = p.split(',');
        return { x: parseFloat(x), y: parseFloat(y) };
      }),
    };
  };

  const chartWidth = 600;
  const chartHeight = 220;
  const chartPaths = generateChartPath(chartWidth, chartHeight);

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Loading store analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* ── Premium Glassmorphic Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 md:p-8 text-white border border-slate-700/50 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold tracking-widest uppercase">
              Analytics Hub
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              Performance Insights
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-md">
              Real-time telemetry, revenue calculation, and inventory health metrics for{' '}
              <span className="text-amber-400 font-semibold">{userData.name}</span>.
            </p>
          </div>

          {/* Time Filter Controls */}
          <div className="flex bg-slate-800/80 backdrop-blur border border-slate-700/80 p-1.5 rounded-2xl self-start md:self-center shadow-inner">
            {(['7d', '30d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-xs font-bold tracking-wide rounded-xl uppercase transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`metric-skel-${i}`}
              className="bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-amber-200/20 shadow-sm space-y-4"
            >
              <Skeleton width="48px" height="48px" className="rounded-2xl" />
              <div className="space-y-2">
                <Skeleton width="50%" height="12px" />
                <Skeleton width="80%" height="28px" />
              </div>
              <Skeleton width="60%" height="10px" />
            </div>
          ))
        ) : (
          [
            {
              title: 'Total Revenue',
              value: `₹${totalSales.toLocaleString('en-IN')}`,
              desc: `From ${completedOrders.length} completed order${
                completedOrders.length === 1 ? '' : 's'
              }`,
              icon: '💰',
              glow: 'hover:shadow-amber-500/10 hover:border-amber-400/60',
              gradient: 'from-amber-500/10 to-yellow-500/5',
              textColor: 'text-amber-600',
            },
            {
              title: 'Completion Rate',
              value: `${completionSuccessRate}%`,
              desc: `${cancelledOrders.length} cancelled order${
                cancelledOrders.length === 1 ? '' : 's'
              }`,
              icon: '📈',
              glow: 'hover:shadow-emerald-500/10 hover:border-emerald-400/60',
              gradient: 'from-emerald-500/10 to-teal-500/5',
              textColor: 'text-emerald-600',
            },
            {
              title: 'Active Products',
              value: totalActiveItems,
              desc: `Out of ${products.length} catalog items`,
              icon: '📦',
              glow: 'hover:shadow-indigo-500/10 hover:border-indigo-400/60',
              gradient: 'from-indigo-500/10 to-violet-500/5',
              textColor: 'text-indigo-600',
            },
            {
              title: 'Avg Order Value',
              value: `₹${averageOrderValue.toLocaleString('en-IN')}`,
              desc: 'Average size of delivered carts',
              icon: '🛒',
              glow: 'hover:shadow-orange-500/10 hover:border-orange-400/60',
              gradient: 'from-orange-500/10 to-red-500/5',
              textColor: 'text-orange-600',
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`relative overflow-hidden group bg-white/70 backdrop-blur-md rounded-3xl border border-amber-200/40 p-6 shadow-sm transition-all duration-300 -translate-y-0 hover:-translate-y-1.5 hover:shadow-xl ${card.glow}`}
            >
              {/* Card Ambient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity duration-300`}
              />

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl p-2.5 bg-white/90 rounded-2xl shadow-sm border border-slate-100/80">
                    {card.icon}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Live
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <h3 className={`text-3xl font-black mt-1 ${card.textColor}`}>
                    {card.value}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    {card.desc}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Main Dashboard Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Chart (Glassmorphic Container) */}
        <div className="lg:col-span-2 bg-white/75 backdrop-blur-md border border-amber-200/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Revenue Trend</h2>
              <p className="text-xs text-slate-500">
                Completed sales volume chart over filtered timeframe
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Peak Daily Sales
              </p>
              <p className="text-sm font-extrabold text-amber-600">
                ₹{maxSaleAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton width="100%" height="160px" className="rounded-2xl" />
            </div>
          ) : (
            <div className="relative flex-1 w-full flex flex-col justify-end">
              {/* Custom SVG Line Chart */}
              {dailySales.length > 0 && chartPaths ? (
                <div className="w-full h-[220px]">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area under the line */}
                    <path
                      d={chartPaths.area}
                      fill="url(#areaGradient)"
                      className="transition-all duration-500"
                    />

                    {/* Trend Line */}
                    <path
                      d={chartPaths.line}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                    />

                    {/* Data Points */}
                    {chartPaths.pointsArray.map((pt, idx) => (
                      <g key={idx} className="group/point">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          className="fill-white stroke-amber-600 stroke-[2.5] cursor-pointer hover:r-7 transition-all duration-155"
                        />
                        {/* Tooltip on hover */}
                        <foreignObject
                          x={pt.x - 45}
                          y={pt.y - 45}
                          width="90"
                          height="40"
                          className="opacity-0 hover:opacity-100 group-hover/point:opacity-100 transition-opacity pointer-events-none"
                        >
                          <div className="bg-slate-900/90 text-white text-[9px] py-1 px-1.5 rounded-lg text-center font-bold shadow-lg border border-slate-700">
                            ₹{dailySales[idx].amount}
                          </div>
                        </foreignObject>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-3xl">📭</p>
                  <p className="text-xs font-bold text-slate-400 mt-2">No Sales Record</p>
                  <p className="text-[10px] text-slate-300">
                    Delivered orders within filter window will render here.
                  </p>
                </div>
              )}

              {/* X Axis Labels */}
              <div className="flex justify-between mt-4 border-t border-slate-100 pt-3">
                {dailySales.map((day, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] font-bold text-slate-400 tracking-wider text-center"
                    style={{ width: `${100 / dailySales.length}%` }}
                  >
                    {day.dateLabel}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Products / Inventory Breakdown */}
        <div className="bg-white/75 backdrop-blur-md border border-amber-200/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Top Performing Products</h2>
            <p className="text-xs text-slate-500 mb-6">
              Highest grossing products by units ordered
            </p>
          </div>

          <div className="flex-1 space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`prod-skel-${i}`} className="flex items-center gap-3">
                  <Skeleton width="32px" height="32px" className="rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton width="60%" height="10px" />
                    <Skeleton width="40%" height="8px" />
                  </div>
                </div>
              ))
            ) : topProducts.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <span className="text-3xl mb-2">⭐</span>
                <p className="text-xs font-bold text-slate-400">No products sold yet</p>
                <p className="text-[10px] text-slate-300">
                  Deliver orders to count product statistics
                </p>
              </div>
            ) : (
              topProducts.map((prod, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/20 border border-transparent hover:border-amber-200/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-md font-bold shrink-0 text-amber-700">
                      {prod.emoji || '📦'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-950 truncate">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {prod.qty} unit{prod.qty > 1 ? 's' : ''} sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">
                      ₹{prod.sales.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Order Status Funnel Analysis ── */}
      <div className="bg-white/75 backdrop-blur-md border border-amber-200/40 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-1">Fulfillment Funnel</h2>
        <p className="text-xs text-slate-500 mb-6">
          Monitoring active and finalized states of your operations
        </p>

        {loading ? (
          <Skeleton width="100%" height="70px" className="rounded-2xl" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              {
                label: 'Pending',
                count: orders.filter((o) => o.status === 'store').length,
                color: 'bg-amber-500',
                bg: 'bg-amber-50',
                textColor: 'text-amber-800',
              },
              {
                label: 'Assigned',
                count: orders.filter((o) => o.status === 'manager').length,
                color: 'bg-blue-500',
                bg: 'bg-blue-50',
                textColor: 'text-blue-800',
              },
              {
                label: 'At Store',
                count: orders.filter((o) => o.status === 'store').length,
                color: 'bg-violet-500',
                bg: 'bg-violet-50',
                textColor: 'text-violet-800',
              },
              {
                label: 'Packed',
                count: orders.filter((o) => o.status === 'packed').length,
                color: 'bg-cyan-500',
                bg: 'bg-cyan-50',
                textColor: 'text-cyan-800',
              },
              {
                label: 'Transit',
                count: orders.filter((o) => o.status === 'delivery').length,
                color: 'bg-orange-500',
                bg: 'bg-orange-50',
                textColor: 'text-orange-800',
              },
              {
                label: 'Completed',
                count: orders.filter((o) => o.status === 'completed').length,
                color: 'bg-emerald-500',
                bg: 'bg-emerald-50',
                textColor: 'text-emerald-800',
              },
              {
                label: 'Cancelled',
                count: orders.filter((o) => o.status === 'cancelled').length,
                color: 'bg-rose-500',
                bg: 'bg-rose-50',
                textColor: 'text-rose-800',
              },
            ].map((status, index) => (
              <div
                key={index}
                className={`${status.bg} rounded-2xl p-4 flex flex-col justify-between border border-slate-100`}
              >
                <div>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.color} mb-2`} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {status.label}
                  </p>
                </div>
                <h4 className={`text-2xl font-black mt-2 ${status.textColor}`}>
                  {status.count}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
