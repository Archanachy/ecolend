// Create or edit a listing. The same form serves both — edit mode is detected
// from a route param and pre-fills from the existing listing.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createListing, getListing, updateListing } from '../api/listings';
import { CATEGORIES } from '../constants/categories';

const EMPTY = { title: '', description: '', category: '', location: '', feePerDay: '', depositAmount: '', photoUrl: '' };

export default function ListingForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    getListing(id).then((res) => {
      const l = res.data;
      setForm({
        title: l.title,
        description: l.description || '',
        category: l.category,
        location: l.location || '',
        feePerDay: l.feePerDay,
        depositAmount: l.depositAmount,
        photoUrl: (l.photos || []).join('\n'),
      });
    });
  }, [id, editing]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Live preview list, mirroring what will be submitted.
  const photoList = form.photoUrl
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 10);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      feePerDay: Number(form.feePerDay),
      depositAmount: Number(form.depositAmount),
      // One URL per line, up to the 10 the API accepts.
      photos: form.photoUrl
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, 10),
    };
    try {
      if (editing) await updateListing(id, payload);
      else await createListing(payload);
      navigate('/listings/mine');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the listing.');
    }
  }

  return (
    <div className="container-sm">
      <p className="text-sm"><Link to="/listings/mine">← My listings</Link></p>
      <div className="page-header">
        <div>
          <span className="eyebrow">Lending</span>
          <h1>{editing ? 'Edit listing' : 'New listing'}</h1>
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate className="card">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)} required>
            <option value="" disabled>Select a category…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="location">Location</label>
          <input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="photoUrl">Photos</label>
          <textarea
            id="photoUrl"
            placeholder={'https://example.com/photo-1.jpg\nhttps://example.com/photo-2.jpg'}
            value={form.photoUrl}
            onChange={(e) => set('photoUrl', e.target.value)}
            style={{ minHeight: 80 }}
          />
          <span className="field-hint">Optional. One image URL per line, up to 10. The first is the cover.</span>
          {photoList.length > 0 && (
            <div className="photo-preview-grid">
              {photoList.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={i === 0 ? 'Cover preview' : `Preview ${i + 1}`}
                  className="listing-thumb"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="feePerDay">Fee per day (NPR)</label>
            <input id="feePerDay" type="number" min="0" value={form.feePerDay} onChange={(e) => set('feePerDay', e.target.value)} required />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label htmlFor="depositAmount">Deposit (NPR)</label>
            <input id="depositAmount" type="number" min="0" value={form.depositAmount} onChange={(e) => set('depositAmount', e.target.value)} required />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit">{editing ? 'Save changes' : 'Create listing'}</button>
          <Link to="/listings/mine" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
