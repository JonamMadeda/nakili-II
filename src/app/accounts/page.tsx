'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export default function AccountsPage() {
  const [user, setUser] = useState<{ id: string; email: string; createdAt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/auth');
        }
      } else {
        router.push('/auth');
      }
    } catch {
      router.push('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/accounts/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = () => {
    document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/auth');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/accounts/delete', { method: 'DELETE' });
      if (response.ok) {
        document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/auth');
      }
    } catch {
      /* ignore */
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to app</span>
        </button>

        <h1 className="text-2xl font-semibold text-slate-900 mb-10">Account</h1>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-slate-200">
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Profile</h2>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Member since {user?.createdAt ? formatDate(user.createdAt) : '...'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-slate-200">
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Security</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  type="password"
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="New Password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                {passwordError && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-100">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md border border-emerald-100">
                    Password changed successfully
                  </div>
                )}

                <Button type="submit" isLoading={isChangingPassword} className="w-full sm:w-auto">
                  Change Password
                </Button>
              </form>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-slate-200">
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Session</h2>
              <Button variant="secondary" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-red-200">
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-red-600 mb-2 uppercase tracking-wider">Delete Account</h2>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                Deleting your account is permanent. All books and pages will be removed.
              </p>
              <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmation('');
        }}
        title="Delete Account"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              disabled={deleteConfirmation !== user?.email}
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            This will permanently delete your account and all associated data. This cannot be undone.
          </p>
          <p className="text-sm text-slate-600">
            Type <strong className="text-slate-900">{user?.email}</strong> to confirm:
          </p>
          <input
            type="text"
            placeholder={user?.email}
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
          />
        </div>
      </Modal>
    </div>
  );
}
