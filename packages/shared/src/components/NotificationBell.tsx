'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { notificationService } from '@smart-bazar/shared/lib/services/notificationService';
import { Notification } from '@smart-bazar/shared/types/firestore';

interface NotificationBellProps {
  isStaff?: boolean;
}

const formatRelativeTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const NotificationBell: FC<NotificationBellProps> = ({ isStaff = false }) => {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData?.id) return;

    const unsubscribe = notificationService.subscribeToNotifications(userData.id, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [userData?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userData?.id) return;
    try {
      await notificationService.markAllAsRead(userData.id);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
      }
      setIsOpen(false);
      
      // Navigate if applicable
      if (notification.orderId) {
        if (isStaff) {
          const role = userData?.role;
          if (role === 'admin' || role === 'co-admin') {
            router.push(`/dashboard/admin/orders`);
          } else if (role === 'manager') {
            router.push(`/dashboard/manager/orders`);
          } else if (role === 'store') {
            router.push(`/dashboard/store/orders`);
          } else if (role === 'delivery') {
            router.push(`/dashboard/delivery/orders`);
          }
        } else {
          router.push(`/orders`);
        }
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition-all duration-200 focus:outline-none"
        style={{
          width: 38,
          height: 38,
          background: isStaff 
            ? 'rgba(148, 163, 184, 0.1)' 
            : 'rgba(0, 200, 83, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isStaff ? '#475569' : 'var(--foreground)',
        }}
        title="Notifications"
      >
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span 
            className="absolute flex h-2.5 w-2.5" 
            style={{ 
              top: 6, 
              right: 6,
            }}
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: isStaff ? '#1e293b' : 'var(--card, #ffffff)',
            borderColor: isStaff ? '#334155' : 'var(--border-light, #e2e8f0)',
            color: isStaff ? '#f1f5f9' : 'var(--foreground, #0f172a)',
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3 flex items-center justify-between border-b"
            style={{
              borderColor: isStaff ? '#334155' : 'var(--border-light, #e2e8f0)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-semibold hover:underline"
                style={{
                  color: isStaff ? '#60a5fa' : '#00a045',
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="text-2xl block mb-2">🔔</span>
                <p 
                  className="text-xs font-medium"
                  style={{ color: isStaff ? '#94a3b8' : 'var(--muted-foreground, #64748b)' }}
                >
                  All caught up! No notifications.
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="p-4 flex items-start justify-between gap-3 hover:bg-black/5 cursor-pointer transition-colors relative border-b last:border-b-0"
                    style={{
                      background: !n.read 
                        ? (isStaff ? 'rgba(96, 165, 250, 0.05)' : 'rgba(0, 200, 83, 0.04)') 
                        : 'transparent',
                    }}
                  >
                    {!n.read && (
                      <span 
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isStaff ? '#3b82f6' : '#00c853',
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs leading-tight truncate">{n.title}</span>
                        <span 
                          className="text-[10px] whitespace-nowrap"
                          style={{ color: isStaff ? '#64748b' : 'var(--muted-foreground, #94a3b8)' }}
                        >
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p 
                        className="text-xs mt-1 leading-normal break-words"
                        style={{ color: isStaff ? '#94a3b8' : 'var(--muted-foreground, #475569)' }}
                      >
                        {n.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteNotification(e, n.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
