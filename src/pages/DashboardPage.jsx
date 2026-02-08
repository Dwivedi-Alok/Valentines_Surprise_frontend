import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import todoService from '../services/todoService';
import urlService from '../services/urlService';
import coupleService from '../services/coupleService';
import mediaService from '../services/mediaService';
import paymentService from '../services/paymentService';
import { Button, Card, Spinner, Input } from '../components/ui';
import Layout from '../components/Layout';
import api from '../services/api';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ todos: 0, urls: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [recentTodos, setRecentTodos] = useState([]);
  const [recentUrls, setRecentUrls] = useState([]);
  const [partner, setPartner] = useState(null);
  const [payments, setPayments] = useState({ myPayments: [], partnersPayments: [] });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [sendingKiss, setSendingKiss] = useState(false);
  const [newPayment, setNewPayment] = useState({ type: 'link', title: '', value: '' });
  const [qrFile, setQrFile] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [todos, urls, coupleData, paymentData] = await Promise.all([
        todoService.getTodos(),
        urlService.getUrls(),
        coupleService.getCouple(),
        paymentService.getPayments(),
      ]);
      
      setStats({
        todos: todos.length,
        urls: urls.length,
        pending: todos.filter(t => !t.completed).length,
      });
      setRecentTodos(todos.slice(0, 3));
      setRecentUrls(urls.slice(0, 3));
      setPayments(paymentData);

      // Extract partner info
      if (coupleData.couple && coupleData.couple.status === 'accepted') {
        const p = coupleData.couple.user1._id === user._id 
          ? coupleData.couple.user2 
          : coupleData.couple.user1;
        setPartner(p);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendKiss = async () => {
    if (sendingKiss) return;
    setSendingKiss(true);
    try {
      await api.post('/couple/kiss');
      alert('Kiss sent! 💋');
    } catch (err) {
      alert('Failed to send kiss');
    } finally {
      setSendingKiss(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setUploadingQr(true);
    try {
      let paymentValue = newPayment.value;

      if (newPayment.type === 'qr_image' && qrFile) {
        // Upload QR image
        const presigned = await mediaService.getUploadUrl({
          fileName: `qr-${Date.now()}-${qrFile.name}`,
          contentType: qrFile.type,
          type: 'image', // Store in images folder
        });
        
        await mediaService.uploadToS3(presigned.uploadUrl, qrFile);
        paymentValue = presigned.key; // Store S3 key
      }

      const added = await paymentService.addPayment({
        ...newPayment,
        value: paymentValue,
      });

      setPayments({
        ...payments,
        myPayments: [added, ...payments.myPayments],
      });
      setShowAddPayment(false);
      setNewPayment({ type: 'link', title: '', value: '' });
      setQrFile(null);
      if (qrInputRef.current) qrInputRef.current.value = '';
    } catch (err) {
      alert('Failed to add payment method');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleDeletePayment = async (id) => {
    if (!confirm('Delete this payment method?')) return;
    try {
      await paymentService.deletePayment(id);
      setPayments({
        ...payments,
        myPayments: payments.myPayments.filter(p => p._id !== id),
      });
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const [qrUrls, setQrUrls] = useState({});

  useEffect(() => {
    // Fetch View URLs for QR codes
    const fetchQrUrls = async () => {
      const allPayments = [...payments.myPayments, ...payments.partnersPayments];
      const newQrUrls = {};
      
      for (const p of allPayments) {
        if (p.type === 'qr_image' && !qrUrls[p._id]) {
          try {
            const data = await mediaService.getViewUrl(p.value);
            newQrUrls[p._id] = data.viewUrl;
          } catch (e) { console.error(e); }
        }
      }
      
      if (Object.keys(newQrUrls).length > 0) {
        setQrUrls(prev => ({ ...prev, ...newQrUrls }));
      }
    };

    if (!loading) fetchQrUrls();
  }, [payments, loading]);

  const [selectedQr, setSelectedQr] = useState(null);

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
      {/* QR Code Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedQr(null)}>
          <div className="relative bg-white p-2 rounded-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedQr(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-200 p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white rounded-xl overflow-hidden">
              <img src={selectedQr} alt="Payment QR" className="w-full h-auto object-contain" />
            </div>
            <div className="text-center p-4">
              <p className="text-sm text-text-muted">Scan to pay</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-dark">
            Hello, {user?.first_name || 'Love'} 💕
          </h1>
          <p className="text-text-light mt-1">Here's your overview for today</p>
        </div>
        
        {/* Send Kiss Button */}
        {partner && (
          <Button 
            onClick={handleSendKiss} 
            loading={sendingKiss}
            className="animate-pulse shadow-lg bg-gradient-to-r from-rose to-pink-500 border-none"
          >
            {sendingKiss ? 'Sending Love...' : 'Send a Kiss 💋'}
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card variant="gradient" hover className="text-center">
          <div className="text-3xl font-bold text-deep mb-1">{stats.todos}</div>
          <div className="text-sm text-text-light">Total Tasks</div>
        </Card>
        
        <Card variant="gradient" hover className="text-center">
          <div className="text-3xl font-bold text-accent mb-1">{stats.pending}</div>
          <div className="text-sm text-text-light">Pending</div>
        </Card>
        
        <Card variant="gradient" hover className="text-center">
          <div className="text-3xl font-bold text-dusty mb-1">{stats.urls}</div>
          <div className="text-sm text-text-light">Saved Links</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks & Partner Favorites (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Partner Favorites */}
          {partner && (
            <Card variant="gradient" className="bg-gradient-to-br from-rose-light/20 to-blush/30 border-rose-light">
              <Card.Header>
                <Card.Title>❤️ {partner.first_name}'s Favorites</Card.Title>
              </Card.Header>
              <Card.Body>
                {partner.favorites && partner.favorites.length > 0 ? (
                  Array.isArray(partner.favorites) ? (
                    <ul className="space-y-2">
                      {partner.favorites.map((fav, index) => (
                        <li key={index} className="flex items-start gap-2 text-dark">
                          <span className="text-rose mt-1">♥</span>
                          <span>{fav}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-line text-dark leading-relaxed">
                      {partner.favorites}
                    </p>
                  )
                ) : (
                  <p className="text-text-muted italic">They haven't added any favorite things yet.</p>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Recent Tasks */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Recent Tasks</Card.Title>
                <Link to="/todos">
                  <Button variant="ghost" size="sm">View All →</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {recentTodos.length > 0 ? (
                <ul className="space-y-3">
                  {recentTodos.map((todo) => (
                    <li key={todo._id} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-blush/50">
                      <div className={`w-2 h-2 rounded-full ${todo.completed ? 'bg-success' : 'bg-warning'}`} />
                      <span className={`flex-1 ${todo.completed ? 'line-through text-text-muted' : 'text-text'}`}>
                        {todo.title}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-text-muted py-4">No tasks yet</p>
              )}
            </Card.Body>
          </Card>

          {/* Recent Links */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Recent Links</Card.Title>
                <Link to="/urls">
                  <Button variant="ghost" size="sm">View All →</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {recentUrls.length > 0 ? (
                <ul className="space-y-3">
                  {recentUrls.map((url) => (
                    <li key={url._id} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-sky-50 border border-sky-100">
                      <div className="text-xl">🔗</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark truncate">{url.title}</p>
                        <a href={url.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate block">
                          {url.url}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-text-muted py-4">No links saved yet</p>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* Right Column - Wallet/Payments (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Wallet Section */}
          <Card>
            <Card.Header>
              <div className="flex justify-between items-center">
                <Card.Title>💳 Wallet</Card.Title>
                <Button size="sm" onClick={() => setShowAddPayment(!showAddPayment)}>
                  {showAddPayment ? 'Cancel' : '+ Add'}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Add Payment Form */}
              {showAddPayment && (
                <form onSubmit={handleAddPayment} className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3">
                  <select 
                    className="w-full p-2 rounded-lg border border-gray-200 text-sm"
                    value={newPayment.type}
                    onChange={e => setNewPayment({...newPayment, type: e.target.value})}
                  >
                    <option value="link">Payment Link / UPI ID</option>
                    <option value="qr_image">QR Code Image</option>
                  </select>
                  
                  <Input 
                    placeholder="Title (e.g. GPay, Bank)" 
                    value={newPayment.title}
                    onChange={e => setNewPayment({...newPayment, title: e.target.value})}
                    required
                  />

                  {newPayment.type === 'link' ? (
                    <Input 
                      placeholder="URL or UPI ID" 
                      value={newPayment.value}
                      onChange={e => setNewPayment({...newPayment, value: e.target.value})}
                      required
                    />
                  ) : (
                    <input 
                      type="file" 
                      accept="image/*"
                      ref={qrInputRef}
                      onChange={e => setQrFile(e.target.files[0])}
                      className="text-sm w-full"
                      required
                    />
                  )}

                  <Button type="submit" size="sm" fullWidth loading={uploadingQr}>Save</Button>
                </form>
              )}

              {/* My Payments */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">My Methods</h4>
                {payments.myPayments.length > 0 ? (
                  payments.myPayments.map(p => (
                    <div key={p._id} className="relative group p-3 bg-white border border-rose-light/30 rounded-xl shadow-sm hover:shadow-md transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeletePayment(p._id); }}
                        className="absolute top-2 right-2 z-10 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-full p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="font-medium text-dark text-sm mb-2">{p.title}</div>
                      {p.type === 'qr_image' ? (
                        qrUrls[p._id] ? (
                          <div 
                            className="relative cursor-pointer group/qr"
                            onClick={() => setSelectedQr(qrUrls[p._id])}
                          >
                            <img src={qrUrls[p._id]} alt="QR" className="w-full h-48 object-contain bg-gray-50 rounded-lg border border-gray-100" />
                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-opacity rounded-lg">
                              <span className="bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm text-dark font-medium">Click to expand</span>
                            </div>
                          </div>
                        ) : <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
                      ) : (
                        <div className="text-xs text-text-light break-all bg-gray-50 p-2 rounded select-all cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigator.clipboard.writeText(p.value)}>
                          {p.value} 📋
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted italic">No payment methods added</p>
                )}
              </div>

              {/* Partner's Payments */}
              {partner && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Send Gift To {partner.first_name}</h4>
                  {payments.partnersPayments.length > 0 ? (
                    payments.partnersPayments.map(p => (
                      <div key={p._id} className="p-3 bg-rose-light/10 border border-rose-light/30 rounded-xl">
                        <div className="font-medium text-dark text-sm mb-2">{p.title}</div>
                        {p.type === 'qr_image' ? (
                          qrUrls[p._id] ? (
                            <div 
                              className="relative cursor-pointer group/qr"
                              onClick={() => setSelectedQr(qrUrls[p._id])}
                            >
                              <img src={qrUrls[p._id]} alt="QR" className="w-full h-48 object-contain bg-white rounded-lg border border-rose-light/20" />
                              <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-opacity rounded-lg">
                                <span className="bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm text-dark font-medium">Click to expand</span>
                              </div>
                            </div>
                          ) : <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
                        ) : (
                          <div className="text-xs text-text-light break-all bg-white p-2 rounded select-all cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => navigator.clipboard.writeText(p.value)}>
                            {p.value} 📋
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted italic">They haven't added any payment info</p>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
