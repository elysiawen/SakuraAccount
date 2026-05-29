'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

interface Session {
  id: string;
  ip: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

export default function SessionsPage() {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    confirm('确定要撤销此会话吗？该设备将被强制登出。', {
      confirmText: '撤销',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/auth/sessions?id=${sessionId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            success('会话已撤销');
            fetchSessions();
          } else {
            error('撤销失败');
          }
        } catch (err) {
          error('撤销失败');
        }
      },
    });
  };

  const handleRevokeAll = async () => {
    confirm('确定要撤销所有其他会话吗？除当前设备外的所有设备将被强制登出。', {
      confirmText: '撤销全部',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/auth/sessions?all=true', {
            method: 'DELETE',
          });

          if (res.ok) {
            success('所有其他会话已撤销');
            fetchSessions();
          } else {
            error('撤销失败');
          }
        } catch (err) {
          error('撤销失败');
        }
      },
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">会话管理</h1>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAll}
            className="px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-xl hover:bg-error transition-colors"
          >
            撤销所有其他会话
          </button>
        )}
      </div>

      <p className="text-text-tertiary">管理您的活跃会话，您可以撤销任何可疑的会话。</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent-foreground/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {session.user_agent?.includes('Mobile') ? '📱' : '💻'}
                </span>
                <div>
                  <p className="font-medium text-text-primary">
                    {session.ip || '未知 IP'}
                    {index === 0 && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">
                        当前会话
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-tertiary truncate max-w-md">
                    {session.user_agent || '未知设备'}
                  </p>
                  <p className="text-xs text-text-quaternary mt-1">
                    创建于 {new Date(session.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              {index !== 0 && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="px-3 py-1.5 text-sm text-destructive hover:bg-error rounded-lg transition-colors"
                >
                  撤销
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📱</span>
          <p className="text-text-tertiary">暂无活跃会话</p>
        </div>
      )}
    </div>
  );
}
