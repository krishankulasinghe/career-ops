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
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Members ({members?.length ?? 0})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Invite Member</button>
        </div>

        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {members?.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.fullName}</td>
                <td style={{ fontSize: 13 }}>{m.email}</td>
                <td><span className={`badge ${m.role === 'owner' ? 'badge-warning' : m.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>{m.role}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td>
                  {m.role !== 'owner' && (
                    <button
                      className="btn btn-danger btn-sm"
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Invite Member</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input required type="email" className="form-control" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="colleague@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
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
