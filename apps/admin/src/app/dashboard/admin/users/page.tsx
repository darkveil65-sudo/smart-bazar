'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { UserData, UserRole } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

type RoleFilter = 'all' | 'customer' | 'store' | 'delivery' | 'manager';

const ROLE_FILTERS: { value: RoleFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '👥' },
  { value: 'customer', label: 'Customer', icon: '🛒' },
  { value: 'store', label: 'Store', icon: '🏪' },
  { value: 'delivery', label: 'Delivery', icon: '🛵' },
  { value: 'manager', label: 'Manager', icon: '👨‍💼' },
];

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; dot: string }> = {
  admin: { label: 'Admin', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', dot: '#f43f5e' },
  'co-admin': { label: 'Co-Admin', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', dot: '#ec4899' },
  manager: { label: 'Manager', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', dot: '#a78bfa' },
  store: { label: 'Store', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', dot: '#60a5fa' },
  delivery: { label: 'Delivery', color: '#34d399', bg: 'rgba(52,211,153,0.12)', dot: '#34d399' },
  customer: { label: 'Customer', color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' },
};

const ASSIGNABLE_ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'customer', label: 'Customer', desc: 'Standard shopping access' },
  { value: 'delivery', label: 'Delivery', desc: 'Fulfils order shipments' },
  { value: 'store', label: 'Store Vendor', desc: 'Manages products & inventory' },
  { value: 'manager', label: 'Manager', desc: 'Oversees stores & operations' },
  { value: 'admin', label: 'Admin', desc: 'Full control of all settings' },
];

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Animated toggle switch */
const ToggleSwitch = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
    disabled={disabled}
    aria-pressed={checked}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
      checked ? 'bg-emerald-500' : 'bg-white/10'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

/** Role badge pill */
const RoleBadge = ({ role }: { role: UserRole }) => {
  const meta = ROLE_META[role] ?? ROLE_META.customer;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ color: meta.color, background: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
};

/** Role-change confirmation modal */
const RoleConfirmModal = ({
  user,
  newRole,
  onConfirm,
  onCancel,
  loading,
}: {
  user: UserData;
  newRole: UserRole;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => {
  const meta = ROLE_META[newRole] ?? ROLE_META.customer;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-scaleIn">
        <div className="p-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 mx-auto"
            style={{ background: meta.bg }}
          >
            🔑
          </div>
          <h3 className="text-lg font-black text-center text-white mb-1">Confirm Role Change</h3>
          <p className="text-sm text-center text-muted-foreground mb-5">
            Change <span className="font-bold text-white">{user.name}</span>&apos;s role to{' '}
            <span className="font-bold" style={{ color: meta.color }}>{meta.label}</span>?
          </p>
          <p className="text-xs text-center text-muted-foreground bg-white/5 rounded-xl p-3 mb-5 border border-white/8">
            This action will immediately update the user&apos;s permissions across the platform.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-muted-foreground border border-white/10 hover:bg-white/5 transition-all press-effect disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all press-effect disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${meta.dot}, ${meta.color})` }}
            >
              {loading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 019.8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : null}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** User profile side drawer */
const ProfileDrawer = ({
  user,
  onClose,
}: {
  user: UserData;
  onClose: () => void;
}) => {
  const meta = ROLE_META[user.role] ?? ROLE_META.customer;
  const joinDate = (() => {
    try {
      const raw = user.createdAt as unknown;
      if (raw && typeof raw === 'object' && 'toDate' in (raw as object)) {
        return ((raw as { toDate: () => Date }).toDate()).toLocaleDateString(undefined, {
          year: 'numeric', month: 'long', day: 'numeric',
        });
      }
      return new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  })();

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-end p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full max-h-[90vh] glass rounded-2xl shadow-2xl border border-white/10 overflow-y-auto animate-slideInLeft flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/8 flex items-center justify-between shrink-0">
          <h3 className="text-base font-black text-white">User Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white/8 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>
        {/* Avatar + Name */}
        <div className="p-6 flex flex-col items-center text-center border-b border-white/8 shrink-0">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mb-3 border"
            style={{ background: meta.bg, color: meta.color, borderColor: `${meta.dot}30` }}
          >
            {user.name[0]?.toUpperCase()}
          </div>
          <p className="text-lg font-black text-white">{user.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          <div className="mt-3">
            <RoleBadge role={user.role} />
          </div>
        </div>
        {/* Details */}
        <div className="p-6 flex-1 space-y-4">
          {[
            { label: 'User ID', value: user.id, mono: true },
            { label: 'Status', value: user.status === 'inactive' ? '🔴 Suspended' : '🟢 Active' },
            { label: 'Phone', value: user.phone || 'Not provided' },
            { label: 'Joined', value: joinDate },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <p className={`text-sm text-white font-medium ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Role change confirmation state
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: UserData;
    newRole: UserRole;
  } | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  // Profile drawer
  const [profileUser, setProfileUser] = useState<UserData | null>(null);

  // Load users via real-time subscription
  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'co-admin')) return;
    const unsub = userService.subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [search, roleFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setActiveDropdown(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Role counts for filter tabs ────────────────────────────────────────────
  const roleCounts: Record<RoleFilter, number> = {
    all: users.length,
    customer: users.filter((u) => u.role === 'customer').length,
    store: users.filter((u) => u.role === 'store').length,
    delivery: users.filter((u) => u.role === 'delivery').length,
    manager: users.filter((u) => u.role === 'manager').length,
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleToggleStatus = async (userId: string, currentStatus: string | undefined) => {
    try {
      const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
      await userService.toggleStatus(userId, newStatus);
      addToast(
        `User ${newStatus === 'inactive' ? 'suspended' : 'activated'} successfully`,
        newStatus === 'inactive' ? 'info' : 'success'
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
      addToast('Failed to update user status', 'error');
    }
  };

  const handleRoleChangeRequest = useCallback((user: UserData, newRole: UserRole) => {
    if (newRole === user.role) { setActiveDropdown(null); return; }
    setPendingRoleChange({ user, newRole });
    setActiveDropdown(null);
  }, []);

  const handleRoleChangeConfirm = async () => {
    if (!pendingRoleChange) return;
    setRoleChanging(true);
    try {
      await userService.changeRole(pendingRoleChange.user.id, pendingRoleChange.newRole);
      addToast(`Role updated to ${pendingRoleChange.newRole} successfully`, 'success');
      setPendingRoleChange(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      addToast('Failed to update user role', 'error');
    } finally {
      setRoleChanging(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (raw: unknown): string => {
    try {
      if (raw && typeof raw === 'object' && 'toDate' in (raw as object)) {
        return ((raw as { toDate: () => Date }).toDate()).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      }
      return new Date(raw as string).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="animate-fadeIn max-w-7xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-xl">
                  👥
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">User Management</h1>
              </div>
              <p className="text-muted-foreground text-sm max-w-lg">
                Manage platform users, assign roles, and control access permissions across all stores.
              </p>
            </div>
            {/* Stats chips */}
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Total', value: users.length, color: '#10b981' },
                { label: 'Active', value: users.filter((u) => u.status !== 'inactive').length, color: '#34d399' },
                { label: 'Suspended', value: users.filter((u) => u.status === 'inactive').length, color: '#f43f5e' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-center min-w-[72px]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="text-xl font-black mt-0.5" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filters + Search ── */}
        <div className="glass rounded-2xl border border-white/10 p-4 space-y-4">
          {/* Role filter tabs */}
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-effect border ${
                  roleFilter === f.value
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'text-muted-foreground border-white/8 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    roleFilter === f.value ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/8 text-muted-foreground'
                  }`}
                >
                  {roleCounts[f.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/40 transition-all"
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                {roleFilter === 'all' ? 'All Users' : ROLE_FILTERS.find((f) => f.value === roleFilter)?.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
                {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Skeleton width="40px" height="40px" className="rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                              <Skeleton width="120px" height="14px" className="rounded" />
                              <Skeleton width="160px" height="10px" className="rounded" />
                            </div>
                          </div>
                        </td>
                        <td><Skeleton width="80px" height="24px" className="rounded-full" /></td>
                        <td><Skeleton width="44px" height="24px" className="rounded-full" /></td>
                        <td><Skeleton width="90px" height="12px" className="rounded" /></td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton width="32px" height="32px" className="rounded-lg" />
                            <Skeleton width="70px" height="32px" className="rounded-lg" />
                          </div>
                        </td>
                      </tr>
                    ))
                  : paginated.map((u) => {
                      const isProtected = u.role === 'admin' || u.id === userData?.id;
                      const isDropOpen = activeDropdown === u.id;
                      return (
                        <tr key={u.id} className="group">
                          {/* Identity */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border"
                                  style={{
                                    background: ROLE_META[u.role]?.bg ?? 'rgba(255,255,255,0.05)',
                                    color: ROLE_META[u.role]?.color ?? '#94a3b8',
                                    borderColor: `${ROLE_META[u.role]?.dot ?? '#94a3b8'}25`,
                                  }}
                                >
                                  {u.name[0]?.toUpperCase()}
                                </div>
                                {u.status === 'inactive' && (
                                  <span
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-[#090e1a] rounded-full"
                                    title="Suspended"
                                  />
                                )}
                              </div>
                              <div>
                                <p
                                  className={`text-sm font-bold transition-colors ${
                                    u.status === 'inactive'
                                      ? 'text-muted-foreground line-through'
                                      : 'text-white group-hover:text-emerald-400'
                                  }`}
                                >
                                  {u.name}
                                  {u.id === userData?.id && (
                                    <span className="ml-2 text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role — dropdown to change */}
                          <td>
                            <div className="relative">
                              <button
                                type="button"
                                disabled={isProtected}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(isDropOpen ? null : u.id);
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                  isProtected
                                    ? 'opacity-60 cursor-not-allowed border-white/8 bg-white/5 text-muted-foreground'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 press-effect'
                                }`}
                                style={
                                  !isProtected
                                    ? { color: ROLE_META[u.role]?.color }
                                    : undefined
                                }
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: ROLE_META[u.role]?.dot ?? '#94a3b8' }}
                                />
                                {ROLE_META[u.role]?.label ?? u.role}
                                {!isProtected && (
                                  <svg
                                    className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isDropOpen ? 'rotate-180' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="none"
                                  >
                                    <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  </svg>
                                )}
                              </button>

                              {/* Dropdown */}
                              {isDropOpen && !isProtected && (
                                <>
                                  <div
                                    className="fixed inset-0 z-30"
                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}
                                  />
                                  <div className="absolute left-0 mt-2 w-56 glass rounded-xl border border-white/12 shadow-xl py-1.5 z-40 animate-scaleIn">
                                    <p className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/8 mb-1">
                                      Change Role
                                    </p>
                                    {ASSIGNABLE_ROLES.map((r) => (
                                      <button
                                        key={r.value}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRoleChangeRequest(u, r.value);
                                        }}
                                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-white/6 transition-colors group/item"
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                                          style={{ background: ROLE_META[r.value]?.dot ?? '#94a3b8' }}
                                        />
                                        <span>
                                          <span
                                            className="block text-xs font-bold"
                                            style={{ color: ROLE_META[r.value]?.color ?? '#f8fafc' }}
                                          >
                                            {r.label}
                                            {u.role === r.value && (
                                              <span className="ml-1.5 text-[9px] text-cyan-400 font-black">✓ Current</span>
                                            )}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">{r.desc}</span>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Status badge + toggle */}
                          <td>
                            <div className="flex items-center gap-2.5">
                              <ToggleSwitch
                                checked={u.status !== 'inactive'}
                                onChange={() => handleToggleStatus(u.id, u.status)}
                                disabled={isProtected}
                              />
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  u.status === 'inactive' ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {u.status === 'inactive' ? 'Suspended' : 'Active'}
                              </span>
                            </div>
                          </td>

                          {/* Join date */}
                          <td className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(u.createdAt)}
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="flex items-center justify-end gap-2">
                              {/* View profile */}
                              <button
                                type="button"
                                onClick={() => setProfileUser(u)}
                                title="View Profile"
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/8 text-muted-foreground hover:text-white hover:bg-white/10 transition-all press-effect"
                              >
                                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                                  <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                                  <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              </button>

                              {/* Suspend / Activate quick button */}
                              {!isProtected && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u.id, u.status)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all press-effect border ${
                                    u.status === 'inactive'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                  }`}
                                >
                                  {u.status === 'inactive' ? 'Activate' : 'Suspend'}
                                </button>
                              )}

                              {isProtected && (
                                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1 bg-white/5 border border-white/8 rounded-lg">
                                  Protected
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-3xl">
                          👻
                        </div>
                        <p className="text-sm font-bold text-white">No users found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or filter criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all press-effect disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all press-effect border ${
                        currentPage === page
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'border-white/8 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-all press-effect disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Role Change Confirmation Modal ── */}
      {pendingRoleChange && (
        <RoleConfirmModal
          user={pendingRoleChange.user}
          newRole={pendingRoleChange.newRole}
          onConfirm={handleRoleChangeConfirm}
          onCancel={() => setPendingRoleChange(null)}
          loading={roleChanging}
        />
      )}

      {/* ── Profile Drawer ── */}
      {profileUser && (
        <ProfileDrawer user={profileUser} onClose={() => setProfileUser(null)} />
      )}
    </>
  );
}
