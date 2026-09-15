import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';

export default function ImageUploader({ auditId, sites, onSaved }) {
  return (
    <section className="entity-section">
      <h3>Photos</h3>
      {sites.length === 0 && <p className="muted">Add a site to this audit before uploading photos.</p>}
      {sites.map((site) => (
        <SitePhotoPanel key={site.id} auditId={auditId} site={site} onSaved={onSaved} />
      ))}
    </section>
  );
}

function SitePhotoPanel({ auditId, site, onSaved }) {
  const [images, setImages] = useState([]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    api
      .get('/api/images', { params: { entity_type: 'site', entity_id: site.id } })
      .then((res) => setImages(res.data))
      .catch((err) => setError(errorMessage(err)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('audit_id', auditId);
      formData.append('entity_type', 'site');
      formData.append('entity_id', site.id);
      if (caption) formData.append('caption', caption);
      await api.post('/api/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      setCaption('');
      e.target.reset();
      load();
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/api/images/${id}`);
    load();
    onSaved?.();
  }

  return (
    <div className="card">
      <h4>{site.name}</h4>
      {error && <p className="error-text">{error}</p>}
      <form
        onSubmit={handleUpload}
        style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}
      >
        <label style={{ flex: '1 1 200px' }}>
          <span>
            Photo <span className="required-marker">*</span>
          </span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
        </label>
        <label style={{ flex: '2 1 240px' }}>
          Caption
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Comms room UPS" />
        </label>
        <button className="btn-primary" type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      <div className="image-grid">
        {images.map((img) => (
          <figure key={img.id}>
            <img src={`/uploads/${img.file_path}`} alt={img.caption || img.original_filename} />
            <figcaption>
              {img.caption || img.original_filename}
              <button className="btn-link" onClick={() => handleDelete(img.id)} style={{ display: 'block' }}>
                Delete
              </button>
            </figcaption>
          </figure>
        ))}
        {images.length === 0 && <p className="muted">No photos yet for this site.</p>}
      </div>
    </div>
  );
}
