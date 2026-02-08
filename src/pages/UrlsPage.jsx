import { useState, useEffect } from 'react';
import urlService from '../services/urlService';
import { Button, Input, Card, Spinner } from '../components/ui';
import Layout from '../components/Layout';

const UrlsPage = () => {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ url: '', title: '' });

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const data = await urlService.getUrls();
      setUrls(data);
    } catch (err) {
      setError('Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url || !formData.title) return;

    setSubmitting(true);
    setError('');

    try {
      const newUrl = await urlService.createUrl(formData);
      setUrls([newUrl, ...urls]);
      setFormData({ url: '', title: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this link?')) return;
    
    try {
      await urlService.deleteUrl(id);
      setUrls(urls.filter(u => u._id !== id));
    } catch (err) {
      setError('Failed to delete link');
    }
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Saved Links</h1>
          <p className="text-text-light">Your bookmarked URLs</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Save Link'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-sm">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="My favorite site"
              required
            />
            <Input
              label="URL"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
              required
            />
            <Button type="submit" loading={submitting}>
              Save Link
            </Button>
          </form>
        </Card>
      )}

      {/* URL Grid */}
      {urls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {urls.map((url) => (
            <Card key={url._id} hover variant="default" padding="none" className="group">
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Favicon placeholder */}
                  <div className="w-10 h-10 rounded-xl bg-blush flex items-center justify-center text-deep font-medium shrink-0">
                    {url.title.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-dark truncate group-hover:text-deep transition-colors">
                      {url.title}
                    </h3>
                    <p className="text-xs text-text-muted truncate mt-1">
                      {getDomain(url.url)}
                    </p>
                  </div>
                </div>
              </a>
              
              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <a
                  href={url.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="ghost" size="sm" fullWidth>
                    Open
                    <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Button>
                </a>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(url._id);
                  }}
                  className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="blush" className="text-center py-12">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-text-light">No saved links yet. Add your favorites!</p>
        </Card>
      )}
    </Layout>
  );
};

export default UrlsPage;
