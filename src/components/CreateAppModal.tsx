'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Key, Lock, RefreshCw, Fingerprint, User, Mail, Search, X } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import Modal from '@/components/Modal';
import { getErrorMessage } from '@/lib/api-error';
import { JSON_HEADERS } from '@/lib/constants';
import { Spinner } from '@/components/primitives';

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  nickname?: string;
}

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** API path for creating the app, e.g. '/api/user/applications' or '/api/admin/applications' */
  apiPath: string;
  /** Translation function scoped to the page's namespace (must have the expected keys) */
  t: (key: string) => string;
  /** Show user selector (for admin creating apps under other users) */
  showUserSelect?: boolean;
}

export default function CreateAppModal({ isOpen, onClose, onCreated, apiPath, t, showUserSelect }: CreateAppModalProps) {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    appUrl: '',
    redirectUris: '',
    scopes: 'profile email',
    grants: ['authorization_code', 'refresh_token'] as string[],
  });
  // User selector state
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Search users (debounced)
  const searchUserResults = useCallback(async (q: string) => {
    if (q.length < 1) {
      setUserResults([]);
      setShowUserDropdown(false);
      return;
    }
    setUserSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUserResults(data.users || []);
      setShowUserDropdown(true);
    } catch {
      setUserResults([]);
    } finally {
      setUserSearching(false);
    }
  }, []);

  useEffect(() => {
    if (userSearchRef.current) clearTimeout(userSearchRef.current);
    userSearchRef.current = setTimeout(() => {
      searchUserResults(userQuery);
    }, 300);
    return () => {
      if (userSearchRef.current) clearTimeout(userSearchRef.current);
    };
  }, [userQuery, searchUserResults]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.redirectUris) {
      error(t('fillRequired'));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        appUrl: form.appUrl || null,
        redirectUris: form.redirectUris.split('\n').map(u => u.trim()).filter(Boolean),
        grants: form.grants,
        scopes: form.scopes.split(' ').filter(Boolean),
      };
      if (selectedUser) body.userId = selectedUser.id;

      const res = await fetch(apiPath, {
        method: 'POST',
        credentials: 'include',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        success(t('appCreated'));
        onClose();
        setForm({ name: '', description: '', appUrl: '', redirectUris: '', scopes: 'profile email', grants: ['authorization_code', 'refresh_token'] });
        setSelectedUser(null);
        setUserQuery('');
        onCreated();
      } else {
        error(getErrorMessage(data, t('createFailed')));
      }
    } catch {
      error(t('createFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('createApp')}
      footer={
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 py-3 px-5 sm:px-6 border-t border-border">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm text-text-secondary bg-muted rounded-xl hover:bg-border-strong transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm text-white bg-accent-button rounded-xl hover:bg-accent-button-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* User Selector (admin only) */}
        {showUserSelect && (
          <div ref={userDropdownRef} className="relative">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appOwner') || 'App Owner'}</label>
            {selectedUser ? (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-accent-button/40 bg-accent-button/5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {selectedUser.nickname || selectedUser.username}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">
                    @{selectedUser.username} · {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserQuery(''); }}
                  className="p-1 text-text-quaternary hover:text-text-secondary rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onFocus={() => { if (userResults.length > 0) setShowUserDropdown(true); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors text-sm"
                    placeholder={t('searchUserPlaceholder') || 'Search user by name, email or username...'}
                  />
                  {userSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-accent-button/20 border-t-accent-button rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {showUserDropdown && userResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setUserQuery(''); setShowUserDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent-button/10 flex items-center justify-center text-accent-button text-sm font-semibold shrink-0">
                          {(u.nickname || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{u.nickname || u.username}</p>
                          <p className="text-xs text-text-tertiary truncate">@{u.username} · {u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showUserDropdown && userResults.length === 0 && userQuery.length > 0 && !userSearching && (
                  <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg p-4 text-center">
                    <p className="text-sm text-text-tertiary">{t('noUserFound') || 'No user found'}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appNameLabel')} *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors text-sm"
            placeholder={t('appNamePlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('description')}</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors text-sm"
            placeholder={t('descriptionPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('appUrl')}</label>
          <input
            type="url"
            value={form.appUrl}
            onChange={(e) => setForm({ ...form, appUrl: e.target.value })}
            className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors text-sm"
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('redirectUri')} *</label>
          <textarea
            value={form.redirectUris}
            onChange={(e) => setForm({ ...form, redirectUris: e.target.value })}
            className="w-full px-4 py-2.5 border border-border-input rounded-xl bg-card text-text-primary focus:outline-none focus:border-accent-foreground focus:ring-1 focus:ring-accent-foreground transition-colors h-24 resize-none text-sm"
            placeholder={t('redirectUriPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('grantTypes')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: 'authorization_code', label: t('grantAuthCode'), icon: Key },
              { value: 'client_credentials', label: t('grantClientCredentials'), icon: Lock },
              { value: 'refresh_token', label: 'refresh_token', icon: RefreshCw },
            ].map((grant) => {
              const checked = form.grants.includes(grant.value);
              const Icon = grant.icon;
              return (
                <label
                  key={grant.value}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    checked
                      ? 'bg-accent-button/10 border-accent-button/40 text-accent-button'
                      : 'border-border-input bg-card text-text-tertiary hover:border-accent-foreground/30 hover:text-text-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, grants: [...form.grants, grant.value] });
                      } else {
                        setForm({ ...form, grants: form.grants.filter(g => g !== grant.value) });
                      }
                    }}
                    className="sr-only"
                  />
                  <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${checked ? 'text-accent-button' : ''}`} />
                  <span className={`text-xs font-medium leading-tight transition-colors duration-200 ${checked ? 'text-accent-button' : ''}`}>{grant.label}</span>
                  <Check className={`w-3.5 h-3.5 ml-auto shrink-0 transition-all duration-200 ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('scopes')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: 'openid', label: t('scopeOpenid'), icon: Fingerprint },
              { value: 'profile', label: t('scopeProfile'), icon: User },
              { value: 'email', label: t('scopeEmail'), icon: Mail },
            ].map((scope) => {
              const checked = form.scopes.split(' ').includes(scope.value);
              const Icon = scope.icon;
              return (
                <label
                  key={scope.value}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    checked
                      ? 'bg-accent-button/10 border-accent-button/40 text-accent-button'
                      : 'border-border-input bg-card text-text-tertiary hover:border-accent-foreground/30 hover:text-text-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const current = form.scopes.split(' ').filter(Boolean);
                      if (e.target.checked) {
                        setForm({ ...form, scopes: [...current, scope.value].join(' ') });
                      } else {
                        setForm({ ...form, scopes: current.filter(s => s !== scope.value).join(' ') });
                      }
                    }}
                    className="sr-only"
                  />
                  <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${checked ? 'text-accent-button' : ''}`} />
                  <span className={`text-xs font-medium leading-tight transition-colors duration-200 ${checked ? 'text-accent-button' : ''}`}>{scope.label}</span>
                  <Check className={`w-3.5 h-3.5 ml-auto shrink-0 transition-all duration-200 ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
