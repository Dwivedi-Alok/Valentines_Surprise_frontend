import { useState, useEffect, useRef } from 'react';
import mediaService from '../services/mediaService';
import { Button, Input, Card, Spinner } from '../components/ui';
import Layout from '../components/Layout';

const MediaPage = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewUrls, setViewUrls] = useState({});
  const [activeTab, setActiveTab] = useState('all'); // all, photo, video, audio
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const data = await mediaService.getMedia();
      setMedia(data.media || []);
      
      // Get view URLs for all media
      for (const item of (data.media || [])) {
        try {
          const urlData = await mediaService.getViewUrl(item.s3_key);
          setViewUrls(prev => ({ ...prev, [item._id]: urlData.viewUrl }));
        } catch (e) {
          console.error('Failed to get view URL:', e);
        }
      }
    } catch (err) {
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !title) return;

    setUploading(true);
    setError('');

    try {
      // Determine type
      let type = 'image';
      if (selectedFile.type.startsWith('video/')) type = 'video';
      else if (selectedFile.type.startsWith('audio/')) type = 'audio';

      // Get presigned URL
      const presigned = await mediaService.getUploadUrl({
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        type,
      });

      // Upload to S3
      await mediaService.uploadToS3(presigned.uploadUrl, selectedFile);

      // Save record
      const result = await mediaService.saveMedia({
        type,
        title,
        s3_key: presigned.key,
        content_type: selectedFile.type,
        size_bytes: selectedFile.size,
      });

      // Get view URL
      const urlData = await mediaService.getViewUrl(presigned.key);
      setViewUrls(prev => ({ ...prev, [result.media._id]: urlData.viewUrl }));

      setMedia([result.media, ...media]);
      setTitle('');
      setSelectedFile(null);
      setShowUpload(false);
      // Reset active tab to 'all' or matching type to show new upload
      setActiveTab('all');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this media?')) return;

    try {
      await mediaService.deleteMedia(id);
      setMedia(media.filter(m => m._id !== id));
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const getFileIcon = (type) => {
    if (type === 'video') return '🎬';
    if (type === 'audio') return '🎵';
    return '🖼️';
  };

  const filteredMedia = media.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'photo') return item.type === 'image';
    return item.type === activeTab;
  });

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
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Our Memories</h1>
          <p className="text-text-light">Videos, audio & more to treasure 💕</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel' : '+ Upload'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm mb-6 w-fit mx-auto md:mx-0">
        {[
          { id: 'all', label: 'All' },
          { id: 'photo', label: 'Photos' },
          { id: 'video', label: 'Videos' },
          { id: 'audio', label: 'Audio' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id 
                ? 'bg-rose text-white shadow-md' 
                : 'text-text-light hover:bg-rose-light/20'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-sm">
          {error}
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <Card className="mb-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Our first dance..."
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-text-light mb-2">
                Select File (Video/Audio/Image)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full text-sm text-text file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blush file:text-deep hover:file:bg-rose-light file:cursor-pointer"
                required
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-text-muted">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button type="submit" loading={uploading}>
              Upload 💝
            </Button>
          </form>
        </Card>
      )}

      {/* Media Grid */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedia.map((item) => (
            <Card key={item._id} variant="default" padding="none" className="overflow-hidden">
              {/* Media Preview */}
              <div className="aspect-video bg-cream-dark flex items-center justify-center relative group">
                {item.type === 'video' && viewUrls[item._id] ? (
                  <video
                    src={viewUrls[item._id]}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : item.type === 'audio' && viewUrls[item._id] ? (
                  <div className="p-6 text-center w-full">
                    <div className="text-5xl mb-4">🎵</div>
                    <audio src={viewUrls[item._id]} controls className="w-full" />
                  </div>
                ) : item.type === 'image' && viewUrls[item._id] ? (
                  <img
                    src={viewUrls[item._id]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-5xl">{getFileIcon(item.type)}</div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                  {item.type === 'image' ? 'Photo' : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-dark">{item.title}</h3>
                    <p className="text-xs text-text-muted mt-1">
                      by {item.uploaded_by?.first_name} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="blush" className="text-center py-12">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-text-light">No memories found in this category.</p>
        </Card>
      )}
    </Layout>
  );
};

export default MediaPage;
