'use client';

import { useState, useEffect } from 'react';
import Pagination from '@/components/Pagination';

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  details: any;
  ip: string;
  user_agent: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchLogs();
  }, [page, limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login_success: '登录成功',
      login_failed: '登录失败',
      register: '注册账号',
      logout: '退出登录',
      password_changed: '修改密码',
      session_revoked: '撤销会话',
      sessions_revoked_all: '撤销所有会话',
      admin_delete_user: '删除用户',
      admin_update_user_role: '修改用户角色',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('failed') || action.includes('delete')) {
      return 'text-error-foreground bg-error';
    }
    if (action.includes('admin')) {
      return 'text-warning-foreground bg-warning';
    }
    if (action.includes('success') || action === 'register') {
      return 'text-success-foreground bg-success';
    }
    return 'text-info-foreground bg-info';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">审计日志</h1>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">用户</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">操作</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">IP</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">详情</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{log.username || '系统'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                        {log.ip || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={total} currentPage={page} itemsPerPage={limit} />
          </>
        ) : (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-text-tertiary">暂无审计日志</p>
          </div>
        )}
      </div>
    </div>
  );
}
