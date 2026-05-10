'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingPasswordError, setIsChangingPasswordError] = useState('');
  const [isChangingPasswordSuccess, setIsChangingPasswordSuccess] = useState(false);
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
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPasswordError('');
    setIsChangingPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setIsChangingPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setIsChangingPasswordError('Password must be at least 6 characters');
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
        setIsChangingPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        setIsChangingPasswordError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setIsChangingPasswordError('An unexpected error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/auth');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/accounts/delete', {
        method: 'DELETE',
      });

      if (response.ok) {
        document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/auth');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to app</span>
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-8">Account Settings</h1>

        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Email address</p>
                <p className="font-medium text-slate-900">{user?.email}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Security</h2>
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

              {isChangingPasswordError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{isChangingPasswordError}</p>
                </div>
              )}

              {isChangingPasswordSuccess && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-600">Password changed successfully!</p>
                </div>
              )}

              <Button type="submit" isLoading={isChangingPassword}>
                Change Password
              </Button>
            </form>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Sessions</h2>
            <Button variant="secondary" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-sm text-slate-600 mb-4">
              Deleting your account is irreversible. All your notes and data will be permanently deleted.
            </p>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
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
              variant="secondary"
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
          <div className="flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">This action cannot be undone</p>
              <p className="text-sm text-red-700 mt-1">
                All your notes and data will be permanently deleted.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            To confirm, type your email address <strong>{user?.email}</strong> below:
          </p>
          <input
            type="text"
            placeholder={user?.email}
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-red-500"
          />
        </div>
      </Modal>
    </div>
  );
}
