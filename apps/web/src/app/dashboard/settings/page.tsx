'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authApi, usersApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  User,
  Shield,
  Camera,
  Loader2,
  CheckCircle,
  Smartphone,
  Key,
  AlertTriangle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'security';

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border border-border rounded-2xl p-6', className)}>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.className,
      )}
    />
  );
}

function SaveButton({
  loading,
  label = 'Save changes',
}: {
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.getProfile,
  });

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  // Keep form in sync when profile loads
  const profileLoaded = useRef(false);
  if (profile && !profileLoaded.current) {
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setPhone(profile.phone ?? '');
    profileLoaded.current = true;
  }

  const avatarUrl: string | null = profile?.avatarUrl ?? user?.avatarUrl ?? null;
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const profileMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: (updated) => {
      toast.success('Profile updated successfully');
      updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to update profile'),
  });

  const avatarMutation = useMutation({
    mutationFn: usersApi.uploadAvatar,
    onSuccess: (updated) => {
      toast.success('Avatar updated');
      updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to upload avatar'),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB');
      return;
    }
    avatarMutation.mutate(file);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <SectionCard>
        <h2 className="text-base font-semibold mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          {/* Avatar display */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xl font-bold">{initials}</span>
              )}
            </div>
            {avatarMutation.isPending && (
              <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Upload area */}
          <div>
            <p className="text-sm font-medium mb-1">
              {avatarUrl ? 'Update your photo' : 'Upload a photo'}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              JPEG, PNG, or WebP — max 5 MB
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {avatarMutation.isPending ? 'Uploading…' : 'Choose photo'}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </SectionCard>

      {/* Personal info */}
      <SectionCard>
        <h2 className="text-base font-semibold mb-5">Personal Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                maxLength={50}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                maxLength={50}
              />
            </Field>
          </div>

          <Field label="Email address" hint="Email cannot be changed">
            <Input value={user?.email ?? ''} disabled />
          </Field>

          <Field label="Phone number" hint="Optional — used for account recovery">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 0000000"
              type="tel"
            />
          </Field>

          <div className="flex justify-end pt-1">
            <SaveButton loading={profileMutation.isPending} />
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ── Security Tab ───────────────────────────────────────────────────────────────

function TwoFactorSection() {
  const { user, updateUser } = useAuthStore();
  const is2faEnabled = user?.twoFaEnabled ?? false;

  // Setup flow state
  const [showSetup, setShowSetup] = useState(false);
  const [qrData, setQrData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [enableCode, setEnableCode] = useState('');

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const generateMutation = useMutation({
    mutationFn: authApi.generate2fa,
    onSuccess: (data) => {
      setQrData(data);
      setShowSetup(true);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to start 2FA setup'),
  });

  const enableMutation = useMutation({
    mutationFn: () => authApi.enable2fa(enableCode),
    onSuccess: () => {
      toast.success('Two-factor authentication enabled');
      updateUser({ twoFaEnabled: true });
      setShowSetup(false);
      setQrData(null);
      setEnableCode('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Invalid code'),
  });

  const disableMutation = useMutation({
    mutationFn: () => authApi.disable2fa(disableCode),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled');
      updateUser({ twoFaEnabled: false });
      setShowDisable(false);
      setDisableCode('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Invalid code'),
  });

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              is2faEnabled ? 'bg-emerald-500/10' : 'bg-slate-500/10',
            )}
          >
            <Smartphone
              className={cn('w-4 h-4', is2faEnabled ? 'text-emerald-500' : 'text-muted-foreground')}
            />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Authenticator app</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {is2faEnabled ? 'Currently enabled' : 'Not enabled'}
            </p>
          </div>
        </div>

        {is2faEnabled ? (
          <button
            onClick={() => setShowDisable((v) => !v)}
            className="text-sm text-rose-400 hover:text-rose-300 font-medium transition-colors"
          >
            Disable
          </button>
        ) : (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-50"
          >
            {generateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enable
          </button>
        )}
      </div>

      {/* Setup panel */}
      {showSetup && qrData && (
        <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">
            1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <img
            src={qrData.qrCodeDataUrl}
            alt="2FA QR Code"
            className="w-40 h-40 rounded-xl border border-border"
          />
          <div className="bg-background rounded-lg px-3 py-2 border border-border">
            <p className="text-xs text-muted-foreground mb-0.5">Or enter this secret manually:</p>
            <p className="font-mono text-xs text-foreground tracking-widest break-all">
              {qrData.secret}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">2. Enter the 6-digit code to confirm</p>
            <div className="flex gap-3">
              <input
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-36 px-4 py-2.5 text-sm font-mono tracking-widest bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center"
              />
              <button
                onClick={() => enableMutation.mutate()}
                disabled={enableCode.length !== 6 || enableMutation.isPending}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                {enableMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Verify & Enable
              </button>
              <button
                onClick={() => { setShowSetup(false); setQrData(null); setEnableCode(''); }}
                className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-xl border border-border transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable panel */}
      {showDisable && (
        <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-medium">
              This will remove the extra layer of security from your account.
            </p>
          </div>
          <div className="flex gap-3">
            <input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-44 px-4 py-2.5 text-sm font-mono tracking-widest bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-center"
            />
            <button
              onClick={() => disableMutation.mutate()}
              disabled={disableCode.length !== 6 || disableMutation.isPending}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              {disableMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Disable 2FA
            </button>
            <button
              onClick={() => { setShowDisable(false); setDisableCode(''); }}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-xl border border-border transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      authApi.resetPassword(current, next),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to change password'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    mutation.mutate({ current: currentPassword, next: newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Current password">
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </Field>
      <Field label="New password" hint="Minimum 8 characters">
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm new password">
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </Field>
      <div className="flex justify-end pt-1">
        <SaveButton loading={mutation.isPending} label="Change password" />
      </div>
    </form>
  );
}

function SecurityTab() {
  const { user } = useAuthStore();
  const isGoogleOnly = !user?.emailVerified || !!user?.googleId;

  return (
    <div className="space-y-6">
      {/* 2FA */}
      <SectionCard>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <Smartphone className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none">Two-Factor Authentication</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <TwoFactorSection />
      </SectionCard>

      {/* Change password */}
      <SectionCard>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <Key className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none">Change Password</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your password regularly to keep your account secure
            </p>
          </div>
        </div>

        {isGoogleOnly ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-secondary/50 rounded-xl p-4">
            <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            Your account uses Google sign-in. Password change is not available.
          </div>
        ) : (
          <ChangePasswordSection />
        )}
      </SectionCard>

      {/* Active sessions hint */}
      <SectionCard>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none mb-1">Sign out of all devices</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will invalidate all active sessions and sign you out everywhere.
            </p>
            <button
              onClick={() => toast.info('Coming soon')}
              className="px-4 py-2 text-sm font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
            >
              Sign out all sessions
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your profile, security, and preferences
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  );
}
