// Edit own profile. Loads the full self view (incl. decrypted phone/address)
// and saves whitelisted fields. Phone/address are re-encrypted server-side.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, updateMyProfile } from '../api/users';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyProfile().then((res) => {
      const u = res.data;
      setForm({
        name: u.name || '',
        bio: u.profile.bio || '',
        location: u.profile.location || '',
        phone: u.profile.phone || '',
        address: u.profile.address || '',
      });
    });
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await updateMyProfile(form);
      navigate(`/profile/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your profile.');
    }
  }

  if (!form) return <div className="container-sm"><p className="loading" role="status">Loading…</p></div>;

  return (
    <div className="container-sm">
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Edit profile</h1>
        </div>
      </div>
      <p><a href={`/profile/${localStorage.getItem('userId')}`} className="btn btn-link">← Back to profile</a></p>
      <form onSubmit={onSubmit} noValidate className="card">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="location">Location</label>
          <input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <span className="field-hint">🔒 Encrypted at rest and never shown on your public profile.</span>
        </div>
        <div className="field">
          <label htmlFor="address">Address</label>
          <input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <span className="field-hint">🔒 Encrypted at rest and never shown on your public profile.</span>
        </div>
        <div className="form-actions">
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
