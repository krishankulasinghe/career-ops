import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    onDrop: (files) => {
      const file = files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setCvContent(text);
          if (!cvName) setCvName(file.name.replace(/\.[^.]+$/, ''));
          toast.success('CV file loaded — review and save below');
        }
      };
      reader.readAsText(file);
    },
  });

  if (isLoading) return <Layout><LoadingSpinner /></Layout>;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'identity', label: 'Identity', icon: 'fas fa-user' },
    { key: 'roles', label: 'Target Roles', icon: 'fas fa-bullseye' },
    { key: 'compensation', label: 'Compensation', icon: 'fas fa-dollar-sign' },
    { key: 'narrative', label: 'Narrative', icon: 'fas fa-pen' },
    { key: 'cvs', label: 'CVs', icon: 'fas fa-file-alt' },
  ];

  const initials = (profile?.fullName ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Layout title="Profile">
      <div className="row g-3">
        {/* Sidebar */}
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body text-center">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-soft-primary text-primary fw-bold mb-3"
                style={{ width: 80, height: 80, fontSize: 28 }}
              >
                {initials}
              </div>
              <h5 className="mb-1">{profile?.fullName || 'Your Name'}</h5>
              <p className="fs--1 text-500 mb-2">{profile?.emailContact || 'email@example.com'}</p>
              {profile?.location && (
                <p className="fs--2 text-400 mb-0">
                  <span className="fas fa-map-marker-alt me-1" />
                  {profile.location}
                </p>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">Quick Links</h6>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {profile?.linkedinUrl && (
                  <li className="list-group-item fs--1">
                    <span className="fab fa-linkedin text-primary me-2" />
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-truncate d-inline-block" style={{ maxWidth: 180 }}>
                      LinkedIn
                    </a>
                  </li>
                )}
                {profile?.githubUrl && (
                  <li className="list-group-item fs--1">
                    <span className="fab fa-github me-2" />
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </li>
                )}
                {profile?.portfolioUrl && (
                  <li className="list-group-item fs--1">
                    <span className="fas fa-globe text-success me-2" />
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer">
                      Portfolio
                    </a>
                  </li>
                )}
                {!profile?.linkedinUrl && !profile?.githubUrl && !profile?.portfolioUrl && (
                  <li className="list-group-item fs--1 text-500">No links added yet.</li>
                )}
              </ul>
            </div>
          </div>

          {profile?.targetRoles && profile.targetRoles.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">
                <h6 className="mb-0">Target Roles</h6>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {profile.targetRoles.map((r, i) => (
                    <span
                      key={i}
                      className={`badge ${r.fit === 'primary' ? 'badge-soft-primary' : 'badge-soft-secondary'}`}
                    >
                      {r.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="col-lg-8">
          {/* Tab nav */}
          <ul className="nav nav-tabs mb-0" role="tablist">
            {tabs.map((t) => (
              <li key={t.key} className="nav-item">
                <button
                  className={`nav-link ${tab === t.key ? 'active' : ''}`}
                  onClick={() => setTab(t.key)}
                  type="button"
                  role="tab"
                >
                  <span className={`${t.icon} me-1`} />
                  {t.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="card" style={{ borderTopLeftRadius: 0, borderTop: 'none' }}>
            <div className="card-body">

              {/* Identity tab */}
              {tab === 'identity' && (
                <form onSubmit={handleSaveIdentity}>
                  <div className="row g-3">
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
                      <div key={key} className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">{label}</label>
                          <input
                            type={type}
                            className="form-control"
                            value={(form as Record<string, string>)[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>
                    <span className="fas fa-save me-1" />
                    {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              )}

              {/* Target Roles tab */}
              {tab === 'roles' && (
                <div>
                  <h6 className="mb-3">Target Roles</h6>
                  <div className="input-group mb-3">
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
                    <button
                      className="btn btn-falcon-default"
                      type="button"
                      onClick={() => {
                        if (!roleInput.trim()) return;
                        const roles = [...(profile?.targetRoles ?? []), { title: roleInput.trim(), fit: 'primary' }];
                        updateProfile.mutateAsync({ targetRoles: roles });
                        setRoleInput('');
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {profile?.targetRoles?.map((r, i) => (
                      <span
                        key={i}
                        className={`badge badge-soft-${r.fit === 'primary' ? 'primary' : 'secondary'} d-inline-flex align-items-center gap-1 fs--1`}
                      >
                        {r.title}
                        <button
                          type="button"
                          className="btn-close btn-close-sm ms-1"
                          style={{ fontSize: 8 }}
                          aria-label="Remove"
                          onClick={() => {
                            const roles = profile.targetRoles?.filter((_, j) => j !== i);
                            updateProfile.mutateAsync({ targetRoles: roles });
                          }}
                        />
                      </span>
                    ))}
                    {!profile?.targetRoles?.length && (
                      <p className="text-500 fs--1">No target roles added yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Compensation tab */}
              {tab === 'compensation' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  updateProfile.mutateAsync({ compensation: profile?.compensation });
                  toast.success('Saved');
                }}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Currency</label>
                        <select
                          className="form-select"
                          defaultValue={profile?.compensation?.currency ?? 'USD'}
                          onChange={(e) => updateProfile.mutateAsync({ compensation: { ...profile?.compensation, currency: e.target.value } })}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Minimum (annual)</label>
                        <input
                          type="number"
                          className="form-control"
                          defaultValue={profile?.compensation?.min}
                          onBlur={(e) => updateProfile.mutateAsync({ compensation: { ...profile?.compensation, min: parseInt(e.target.value) } })}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Target (annual)</label>
                        <input
                          type="number"
                          className="form-control"
                          defaultValue={profile?.compensation?.max}
                          onBlur={(e) => updateProfile.mutateAsync({ compensation: { ...profile?.compensation, max: parseInt(e.target.value) } })}
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={updateProfile.isPending}>
                    <span className="fas fa-save me-1" />
                    Save
                  </button>
                </form>
              )}

              {/* Narrative tab */}
              {tab === 'narrative' && (
                <div>
                  <div className="mb-3">
                    <label className="form-label">Headline</label>
                    <input
                      className="form-control"
                      defaultValue={profile?.narrative?.headline}
                      onBlur={(e) => updateProfile.mutateAsync({ narrative: { ...profile?.narrative, headline: e.target.value } })}
                      placeholder="e.g. Senior AI Engineer with 8 years in production ML systems"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Exit Story</label>
                    <textarea
                      rows={5}
                      className="form-control"
                      defaultValue={profile?.narrative?.exitStory}
                      onBlur={(e) => updateProfile.mutateAsync({ narrative: { ...profile?.narrative, exitStory: e.target.value } })}
                      placeholder="Why are you looking? Keep it concise and positive."
                    />
                  </div>
                </div>
              )}

              {/* CVs tab */}
              {tab === 'cvs' && (
                <div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {cvList?.map((cv) => (
                      <button
                        key={cv.id}
                        className={`btn btn-sm ${selectedCvId === cv.id ? 'btn-primary' : 'btn-falcon-default'}`}
                        onClick={() => { setSelectedCvId(cv.id); setCvContent(cv.contentMd); setCvName(cv.name); }}
                      >
                        {cv.name}
                        {cv.isPrimary && <span className="ms-1 badge badge-soft-warning fs--2">Primary</span>}
                      </button>
                    ))}
                    <button
                      className="btn btn-sm btn-falcon-default"
                      onClick={() => { setSelectedCvId(''); setCvContent(''); setCvName('New CV'); }}
                    >
                      <span className="fas fa-plus me-1" />
                      New CV
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">CV Name</label>
                    <input
                      className="form-control"
                      value={cvName}
                      onChange={(e) => setCvName(e.target.value)}
                      style={{ maxWidth: 280 }}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Upload CV file</label>
                    <div
                      {...getRootProps()}
                      className={`dropzone border-dashed rounded-2 p-3 text-center ${isDragActive ? 'bg-soft-primary border-primary' : 'bg-soft-secondary'}`}
                      style={{ cursor: 'pointer', borderWidth: 2, borderStyle: 'dashed' }}
                    >
                      <input {...getInputProps()} />
                      <span className="fas fa-upload fs-2 text-400 mb-2 d-block" />
                      <p className="fs--1 text-600 mb-0">
                        {isDragActive ? 'Drop CV here…' : 'Drag & drop CV (.md) or click to browse'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Content (Markdown)</label>
                    <textarea
                      className="form-control font-monospace fs--2"
                      rows={20}
                      value={cvContent}
                      onChange={(e) => setCvContent(e.target.value)}
                      placeholder={'# Your Name\n\n## Summary\n...'}
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleSaveCv}
                    disabled={updateCv.isPending || createCv.isPending}
                  >
                    <span className="fas fa-save me-1" />
                    {updateCv.isPending || createCv.isPending ? 'Saving…' : 'Save CV'}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
