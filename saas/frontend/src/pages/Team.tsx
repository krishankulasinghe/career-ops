import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';
import { IconUserPlus, IconX } from '@tabler/icons-react';

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
  if (role === 'owner') return 'badge bg-warning-lt';
  if (role === 'admin') return 'badge bg-primary-lt';
  return 'badge bg-secondary-lt';
}

function getInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?';
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
                  <h5 className="card-title mb-0">Team Members</h5>
                  <p className="text-secondary small mb-0">Manage your organization's members and roles</p>
                </div>
                <div className="col-auto">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                    <IconUserPlus size={16} className="me-1" />
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
              <h5 className="card-title mb-0">Members ({members?.length ?? 0})</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-vcenter card-table table-hover table-sm small mb-0">
                  <thead>
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
                        <td className="align-middle">
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar avatar-sm">{getInitial(m.fullName)}</span>
                            <span className="fw-semibold">{m.fullName}</span>
                          </div>
                        </td>
                        <td className="text-secondary align-middle">{m.email}</td>
                        <td className="align-middle">
                          <span className={roleBadgeClass(m.role)}>{m.role}</span>
                        </td>
                        <td className="text-secondary small align-middle">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td className="align-middle text-end">
                          {m.role !== 'owner' && (
                            <button
                              className="btn btn-outline-danger btn-sm"
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

      {/* Invite modal */}
      {showModal && (
        <div
          className="modal modal-blur fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Invite Member</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={handleInvite}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email *</label>
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
                    <label className="form-label fw-semibold">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? 'Sending…' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
