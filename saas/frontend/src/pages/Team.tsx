import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

function useMembers() {
  return useQuery({ queryKey: ['members'], queryFn: async () => (await apiClient.get<Member[]>('/organizations/members')).data });
}

function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; role: string }) =>
      (await apiClient.post('/organizations/invite', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => apiClient.delete(`/organizations/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

function roleBadgeClass(role: string): string {
  if (role === 'owner') return 'badge badge-soft-warning';
  if (role === 'admin') return 'badge badge-soft-primary';
  return 'badge badge-soft-secondary';
}

export function TeamPage() {
  const { data: members } = useMembers();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'member' });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMember.mutateAsync(form);
      toast.success(`Invitation sent to ${form.email}`);
      setShowModal(false);
      setForm({ email: '', role: 'member' });
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <Layout title="Team">
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Team Members</h5>
                  <p className="text-600 fs--1 mb-0">Manage your organization's members and roles</p>
                </div>
                <div className="col-auto">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                    <span className="fas fa-user-plus me-1" />
                    Invite Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Members ({members?.length ?? 0})</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-sm fs--1 mb-0">
                  <thead className="bg-200 text-900">
                    <tr>
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Joined</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {members?.map((m) => (
                      <tr key={m.id}>
                        <td className="fw-semi-bold align-middle">{m.fullName}</td>
                        <td className="text-600 align-middle">{m.email}</td>
                        <td className="align-middle">
                          <span className={roleBadgeClass(m.role)}>{m.role}</span>
                        </td>
                        <td className="text-600 fs--2 align-middle">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td className="align-middle text-end">
                          {m.role !== 'owner' && (
                            <button
                              className="btn btn-falcon-danger btn-sm"
                              onClick={() => { if (confirm('Remove this member?')) removeMember.mutateAsync(m.userId); }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Invite Member</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="mb-3">
                <label className="form-label fw-semi-bold">Email *</label>
                <input
                  required
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="colleague@example.com"
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semi-bold">Role</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button type="button" className="btn btn-falcon-default" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviteMember.isPending}>
                  {inviteMember.isPending ? 'Sending…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
