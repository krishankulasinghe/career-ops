import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useProfile, useUpdateProfile, useCvs, useUpdateCv, useCreateCv } from '@/api/profile';
import toast from 'react-hot-toast';

type Tab = 'identity' | 'roles' | 'compensation' | 'narrative' | 'cvs';

export function ProfilePage() {
  const [tab, setTab] = useState<Tab>('identity');
  const { data: profile, isLoading } = useProfile();
  const { data: cvList } = useCvs();
  const updateProfile = useUpdateProfile();
  const updateCv = useUpdateCv();
  const createCv = useCreateCv();

  const [form, setForm] = useState({
    fullName: '', emailContact: '', phone: '', location: '', timezone: '',
    linkedinUrl: '', portfolioUrl: '', githubUrl: '',
  });
  const [roleInput, setRoleInput] = useState('');
  const [selectedCvId, setSelectedCvId] = useState('');
  const [cvContent, setCvContent] = useState('');
  const [cvName, setCvName] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? '',
        emailContact: profile.emailContact ?? '',
        phone: profile.phone ?? '',
        location: profile.location ?? '',
        timezone: profile.timezone ?? '',
        linkedinUrl: profile.linkedinUrl ?? '',
        portfolioUrl: profile.portfolioUrl ?? '',
        githubUrl: profile.githubUrl ?? '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (cvList?.length) {
      const primary = cvList.find((c) => c.isPrimary) ?? cvList[0];
      setSelectedCvId(primary.id);
      setCvContent(primary.contentMd);
      setCvName(primary.name);
    }
  }, [cvList]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync(form);
    toast.success('Profile saved');
  };

  const handleSaveCv = async () => {
    const cv = cvList?.find((c) => c.id === selectedCvId);
    if (!cv) {
      await createCv.mutateAsync({ name: cvName || 'My CV', contentMd: cvContent, isPrimary: true });
    } else {
      await updateCv.mutateAsync({ id: selectedCvId, contentMd: cvContent, name: cvName });
    }
    toast.success('CV saved');
  };

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'identity', label: 'Identity' },
    { key: 'roles', label: 'Target Roles' },
    { key: 'compensation', label: 'Compensation' },
    { key: 'narrative', label: 'Narrative' },
    { key: 'cvs', label: 'CVs' },
  ];

  return (
    <Layout title="Profile">
      <div style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ borderTopLeftRadius: 0 }}>
          {tab === 'identity' && (
            <form onSubmit={handleSaveIdentity}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { key: 'fullName', label: 'Full Name', type: 'text' },
                  { key: 'emailContact', label: 'Contact Email', type: 'email' },
                  { key: 'phone', label: 'Phone', type: 'tel' },
                  { key: 'location', label: 'Location', type: 'text' },
                  { key: 'timezone', label: 'Timezone', type: 'text' },
                  { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
                  { key: 'portfolioUrl', label: 'Portfolio URL', type: 'url' },
                  { key: 'githubUrl', label: 'GitHub URL', type: 'url' },
                ].map(({ key, label, type }) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input
                      type={type}
                      className="form-control"
                      value={(form as Record<string, string>)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}

          {tab === 'roles' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Target Roles</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  className="form-control"
                  placeholder="Add a target role…"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && roleInput.trim()) {
                      const roles = [...(profile?.targetRoles ?? []), { title: roleInput.trim(), fit: 'primary' }];
                      updateProfile.mutateAsync({ targetRoles: roles });
                      setRoleInput('');
                    }
                  }}
                />
                <button className="btn btn-primary" onClick={() => {
                  if (!roleInput.trim()) return;
                  const roles = [...(profile?.targetRoles ?? []), { title: roleInput.trim(), fit: 'primary' }];
                  updateProfile.mutateAsync({ targetRoles: roles });
                  setRoleInput('');
                }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile?.targetRoles?.map((r, i) => (
                  <span key={i} style={{
                    background: r.fit === 'primary' ? 'rgba(93,156,236,0.1)' : 'var(--body-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 16,
                    padding: '4px 12px',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    {r.title}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                      onClick={() => {
                        const roles = profile.targetRoles?.filter((_, j) => j !== i);
                        updateProfile.mutateAsync({ targetRoles: roles });
                      }}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {tab === 'compensation' && (
            <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutateAsync({ compensation: profile?.compensation }); toast.success('Saved'); }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-control" defaultValue={profile?.compensation?.currency ?? 'USD'}
                    onChange={(e) => updateProfile.mutateAsync({ compensation: { ...profile?.compensation, currency: e.target.value } })}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                <div />
                <div className="form-group">
                  <label className="form-label">Minimum (annual)</label>
                  <input type="number" className="form-control" defaultValue={profile?.compensation?.min}
                    onBlur={(e) => updateProfile.mutateAsync({ compensation: { ...profile?.compensation, min: parseInt(e.target.value) } })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target (annual)</label>
                  <input type="number" className="form-control" defaultValue={profile?.compensation?.max}
                    onBlur={(e) => updateProfile.mutateAsync({ compensation: { ...profile?.compensation, max: parseInt(e.target.value) } })} />
                </div>
              </div>
            </form>
          )}

          {tab === 'narrative' && (
            <div>
              <div className="form-group">
                <label className="form-label">Headline</label>
                <input className="form-control" defaultValue={profile?.narrative?.headline}
                  onBlur={(e) => updateProfile.mutateAsync({ narrative: { ...profile?.narrative, headline: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Story</label>
                <textarea rows={4} className="form-control" defaultValue={profile?.narrative?.exitStory}
                  onBlur={(e) => updateProfile.mutateAsync({ narrative: { ...profile?.narrative, exitStory: e.target.value } })} />
              </div>
            </div>
          )}

          {tab === 'cvs' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {cvList?.map((cv) => (
                  <button key={cv.id} className={`btn ${selectedCvId === cv.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setSelectedCvId(cv.id); setCvContent(cv.contentMd); setCvName(cv.name); }}>
                    {cv.name} {cv.isPrimary ? '⭐' : ''}
                  </button>
                ))}
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedCvId('');
                  setCvContent('');
                  setCvName('New CV');
                }}>+ New CV</button>
              </div>

              <div className="form-group">
                <label className="form-label">CV Name</label>
                <input className="form-control" value={cvName} onChange={(e) => setCvName(e.target.value)} style={{ maxWidth: 200 }} />
              </div>

              <div className="form-group">
                <label className="form-label">Content (Markdown)</label>
                <textarea
                  className="form-control"
                  rows={20}
                  value={cvContent}
                  onChange={(e) => setCvContent(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                  placeholder="# Your Name&#10;&#10;## Summary&#10;..."
                />
              </div>

              <button className="btn btn-primary" onClick={handleSaveCv}
                disabled={updateCv.isPending || createCv.isPending}>
                Save CV
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
