'use client';

import { useState, useEffect, useCallback } from 'react';

interface QueueItem {
  id: string;
  propertyId: string;
  address: string;
  status: string;
  complaintCount: number;
  priorityScore: number;
  categories: string[];
  daysActive: number;
  thumbnailUrl: string | null;
  escalatedAt: string | null;
  totalComplaints: number;
}

interface ReportData {
  summary: {
    totalComplaints: number;
    totalProperties: number;
    totalReporters: number;
    recentComplaints: number;
    notificationCount: number;
  };
  queue: {
    urgent: number;
    monitoring: number;
    inProgress: number;
    resolved: number;
  };
  categoryBreakdown: { category: string; count: number }[];
  performance: {
    avgResolutionDays: number;
    totalResolved: number;
  };
}

const categoryLabels: Record<string, string> = {
  overgrown_yard: 'Overgrown Yard',
  junk_trash: 'Junk / Bulk Trash',
  unauthorized_vehicle: 'Unauthorized Vehicle',
};

const categoryIcons: Record<string, string> = {
  overgrown_yard: '🌿',
  junk_trash: '🗑️',
  unauthorized_vehicle: '🚛',
};

const statusColors: Record<string, string> = {
  monitoring: 'bg-blue-100 text-blue-800',
  urgent: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'queue' | 'reports'>('queue');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reports, setReports] = useState<ReportData | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [propertyDetail, setPropertyDetail] = useState<Record<string, unknown> | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/queue?${params}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  }, []);

  useEffect(() => {
    if (authenticated && activeTab === 'queue') fetchQueue();
    if (authenticated && activeTab === 'reports') fetchReports();
  }, [authenticated, activeTab, fetchQueue, fetchReports]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error);
        return;
      }

      setAuthenticated(true);
    } catch {
      setLoginError('Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function updateStatus(itemId: string, status: string) {
    try {
      await fetch('/api/admin/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status }),
      });
      fetchQueue();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function viewProperty(propertyId: string) {
    setSelectedProperty(propertyId);
    try {
      const res = await fetch(`/api/admin/properties?id=${propertyId}`);
      const data = await res.json();
      setPropertyDetail(data.property);
    } catch (error) {
      console.error('Failed to fetch property:', error);
    }
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">Admin Portal</h1>
            <p className="text-sm text-[var(--muted)]">Travis Ranch Compliance</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
              />
            </div>

            {loginError && <p className="text-red-600 text-sm mb-3">{loginError}</p>}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="text-xs text-[var(--muted)] mt-3 text-center">
              Default: admin / TravisRanch2024!
            </p>
          </form>
        </div>
      </main>
    );
  }

  if (selectedProperty && propertyDetail) {
    const detail = propertyDetail as {
      address: string;
      ownerName: string | null;
      ownerPhone: string | null;
      complianceItem: { status: string; complaintCount: number; priorityScore: number; escalatedAt: string | null } | null;
      complaints: {
        id: string;
        reporterPhone: string;
        category: string;
        description: string | null;
        photoUrls: string[];
        aiAnalysis: { severity: number; description: string; matchesCategory: boolean; flagged: boolean } | null;
        aiSeverity: number;
        flagged: boolean;
        flagReason: string | null;
        createdAt: string;
      }[];
      notifications: { type: string; message: string; recipientRole: string; sentAt: string }[];
    };

    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { setSelectedProperty(null); setPropertyDetail(null); }}
            className="text-[var(--primary)] text-sm font-medium"
          >
            &larr; Back to Queue
          </button>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{detail.address}</h1>
              {detail.ownerName && (
                <p className="text-sm text-[var(--muted)]">Owner: {detail.ownerName}</p>
              )}
            </div>
            {detail.complianceItem && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[detail.complianceItem.status]}`}>
                {detail.complianceItem.status.toUpperCase().replace('_', ' ')}
              </span>
            )}
          </div>

          {detail.complianceItem && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold">{detail.complianceItem.complaintCount}</p>
                <p className="text-xs text-[var(--muted)]">Unique Reporters</p>
              </div>
              <div className="bg-white rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold">{detail.complianceItem.priorityScore}</p>
                <p className="text-xs text-[var(--muted)]">Priority Score</p>
              </div>
              <div className="bg-white rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold">{detail.complaints.length}</p>
                <p className="text-xs text-[var(--muted)]">Total Reports</p>
              </div>
            </div>
          )}

          <h2 className="font-semibold mb-3">Complaints</h2>
          <div className="space-y-4 mb-8">
            {detail.complaints.map((complaint) => (
              <div key={complaint.id} className="bg-white rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{categoryIcons[complaint.category]}</span>
                    <span className="font-medium text-sm">{categoryLabels[complaint.category]}</span>
                    {complaint.flagged && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Flagged</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2 mb-2">
                  {complaint.photoUrls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  ))}
                </div>

                {complaint.description && (
                  <p className="text-sm text-[var(--muted)] mb-2">{complaint.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Reporter: {complaint.reporterPhone}</span>
                  <span>AI Severity: {complaint.aiSeverity}/10</span>
                </div>

                {complaint.aiAnalysis && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 text-xs">
                    <strong>AI Analysis:</strong> {complaint.aiAnalysis.description}
                    {!complaint.aiAnalysis.matchesCategory && (
                      <span className="text-amber-600 ml-2">(may not match category)</span>
                    )}
                  </div>
                )}

                {complaint.flagged && complaint.flagReason && (
                  <div className="mt-2 bg-red-50 rounded-lg p-2 text-xs text-red-700">
                    <strong>Flag reason:</strong> {complaint.flagReason}
                  </div>
                )}
              </div>
            ))}
          </div>

          <h2 className="font-semibold mb-3">Notification History</h2>
          <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
            {detail.notifications.length === 0 ? (
              <p className="p-4 text-sm text-[var(--muted)]">No notifications sent yet</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {detail.notifications.map((notif, i) => (
                  <div key={i} className="p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs uppercase text-[var(--muted)]">
                        {notif.recipientRole.replace('_', ' ')} — {notif.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(notif.sentAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Compliance Dashboard</h1>
            <p className="text-xs text-[var(--muted)]">Travis Ranch HOA</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'queue' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:bg-gray-100'
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'reports' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:bg-gray-100'
              }`}
            >
              Reports
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'queue' && (
          <>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
              {['', 'urgent', 'monitoring', 'in_progress', 'resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-white border border-[var(--border)] text-[var(--muted)] hover:bg-gray-50'
                  }`}
                >
                  {s ? s.toUpperCase().replace('_', ' ') : 'ALL'}
                </button>
              ))}
              <button
                onClick={fetchQueue}
                className="ml-auto px-3 py-1.5 text-xs text-[var(--primary)] font-medium hover:bg-blue-50 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[var(--muted)]">Loading queue...</div>
            ) : queue.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--muted)] text-sm">No compliance items found</p>
                <p className="text-[var(--muted)] text-xs mt-1">Items appear here when residents submit reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-[var(--border)] p-4 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => viewProperty(item.propertyId)}
                  >
                    <div className="flex items-start gap-3">
                      {item.thumbnailUrl && (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-sm truncate">{item.address}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${statusColors[item.status]}`}>
                            {item.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[var(--muted)] mb-2">
                          <span>{item.complaintCount} reporter{item.complaintCount !== 1 ? 's' : ''}</span>
                          <span>{item.totalComplaints} report{item.totalComplaints !== 1 ? 's' : ''}</span>
                          <span>{item.daysActive} day{item.daysActive !== 1 ? 's' : ''} active</span>
                          <span className="font-medium text-[var(--foreground)]">Priority: {item.priorityScore}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.categories.map((cat) => (
                            <span key={cat} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {categoryIcons[cat]} {categoryLabels[cat]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
                      {item.status !== 'in_progress' && item.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(item.id, 'in_progress')}
                          className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg font-medium hover:bg-yellow-100 transition-colors"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {item.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(item.id, 'resolved')}
                          className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {item.status !== 'dismissed' && (
                        <button
                          onClick={() => updateStatus(item.id, 'dismissed')}
                          className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'reports' && (
          <>
            {!reports ? (
              <div className="text-center py-12 text-[var(--muted)]">Loading reports...</div>
            ) : (
              <>
                <h2 className="font-semibold mb-4">Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  <div className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--primary)]">{reports.summary.totalComplaints}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Total Reports</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--primary)]">{reports.summary.totalProperties}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Properties Reported</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--primary)]">{reports.summary.totalReporters}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Active Reporters</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--primary)]">{reports.summary.notificationCount}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Notifications Sent</p>
                  </div>
                </div>

                <h2 className="font-semibold mb-4">Queue Status</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
                    <p className="text-3xl font-bold text-red-700">{reports.queue.urgent}</p>
                    <p className="text-xs text-red-600 mt-1">Urgent</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{reports.queue.monitoring}</p>
                    <p className="text-xs text-blue-600 mt-1">Monitoring</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-700">{reports.queue.inProgress}</p>
                    <p className="text-xs text-yellow-600 mt-1">In Progress</p>
                  </div>
                  <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">{reports.queue.resolved}</p>
                    <p className="text-xs text-green-600 mt-1">Resolved</p>
                  </div>
                </div>

                <h2 className="font-semibold mb-4">Reports by Category</h2>
                <div className="bg-white rounded-xl border border-[var(--border)] p-4 mb-8">
                  {reports.categoryBreakdown.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {reports.categoryBreakdown.map((cat) => {
                        const maxCount = Math.max(...reports.categoryBreakdown.map((c) => c.count));
                        const percentage = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                        return (
                          <div key={cat.category}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>{categoryIcons[cat.category]} {categoryLabels[cat.category] || cat.category}</span>
                              <span className="font-bold">{cat.count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-[var(--primary)] h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <h2 className="font-semibold mb-4">Performance</h2>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--accent)]">
                      {reports.performance.avgResolutionDays || '—'}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">Avg Days to Resolution</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-3xl font-bold text-[var(--accent)]">
                      {reports.summary.recentComplaints}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">Reports (Last 30 Days)</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
