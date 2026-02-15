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
      {/* Refined Image Lightbox */}
      {selectedQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md transition-all" onClick={() => setSelectedQr(null)}>
          <div className="relative bg-white p-3 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedQr(null)}
              className="absolute -top-14 right-0 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="overflow-hidden rounded-[2rem] bg-slate-50">
              <img src={selectedQr} alt="Payment QR" className="w-full h-auto object-contain" />
            </div>
            <div className="text-center py-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Payment Authorization</span>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Welcome, {user?.first_name || 'User'}
          </h1>
          <p className="text-slate-500 font-medium mt-2">Here is your shared overview for today.</p>
        </div>
        
        {partner && (
          <Button 
            onClick={handleSendKiss} 
            loading={sendingKiss}
            className="rounded-2xl px-8 py-6 shadow-xl shadow-rose-100 bg-rose border-none hover:bg-rose-dark transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            <span className="font-bold tracking-wide">Send Love</span>
          </Button>
        )}
      </div>

      {/* Modern Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Tasks', value: stats.todos, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Pending Action', value: stats.pending, color: 'text-rose', bg: 'bg-rose-50/30' },
          { label: 'Shared Links', value: stats.urls, color: 'text-slate-900', bg: 'bg-white' }
        ].map((stat, i) => (
          <div key={i} className={`p-8 rounded-[2rem] border border-slate-100 shadow-sm ${stat.bg}`}>
            <div className={`text-4xl font-bold ${stat.color} mb-1 tracking-tighter`}>{stat.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          {/* Partner Favorites: Immersive Card */}
          {partner && (
            <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-200">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-6">Partner Preferences</h2>
              <h3 className="text-2xl font-bold mb-4">{partner.first_name}'s Favorites</h3>
              <div className="mt-2">
                {partner.favorites && (Array.isArray(partner.favorites) ? partner.favorites.length > 0 : partner.favorites.trim()) ? (
                  Array.isArray(partner.favorites) ? (
                    <ul className="space-y-3">
                      {partner.favorites.map((fav, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-rose-400 mt-0.5">♥</span>
                          <span className="text-slate-300 leading-relaxed font-medium">{fav}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-300 leading-relaxed font-medium whitespace-pre-line">{partner.favorites}</p>
                  )
                ) : (
                  <p className="text-slate-500 italic font-medium">No preferences shared yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Recent Tasks</h3>
                <Link to="/todos" className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </Link>
              </div>
              <div className="space-y-4">
                {recentTodos.map((todo) => (
                  <div key={todo._id} className="flex items-center gap-4 group">
                    <div className={`w-2 h-2 rounded-full transition-transform group-hover:scale-150 ${todo.completed ? 'bg-emerald-400' : 'bg-rose'}`} />
                    <span className={`text-sm font-semibold transition-colors ${todo.completed ? 'text-slate-300 line-through' : 'text-slate-600 group-hover:text-slate-900'}`}>
                      {todo.title}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Saved Links</h3>
                <Link to="/urls" className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </Link>
              </div>
              <div className="space-y-4">
                {recentUrls.map((url) => (
                  <a key={url._id} href={url.url} target="_blank" rel="noreferrer" className="block group">
                    <p className="text-sm font-bold text-slate-700 group-hover:text-rose transition-colors truncate">{url.title}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1 truncate">{new URL(url.url).hostname}</p>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Sidebar: Digital Wallet */}
        <div className="lg:col-span-4">
          <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 sticky top-8">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900">Wallet</h2>
              <button 
                onClick={() => setShowAddPayment(!showAddPayment)}
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-all ${showAddPayment ? 'bg-rose text-white shadow-lg shadow-rose-100' : 'bg-white text-slate-400 border border-slate-100 hover:border-rose hover:text-rose'}`}
              >
                {showAddPayment ? 'Close' : 'Add Method'}
              </button>
            </div>

            {showAddPayment && (
              <form onSubmit={handleAddPayment} className="mb-10 space-y-4 animate-in slide-in-from-top-4 duration-300">
                <select 
                  className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-rose/20 outline-none appearance-none transition-all"
                  value={newPayment.type}
                  onChange={e => setNewPayment({...newPayment, type: e.target.value})}
                >
                  <option value="link">Payment Link</option>
                  <option value="qr_image">QR Code Image</option>
                </select>
                <Input 
                  placeholder="Provider Name" 
                  className="rounded-2xl border-slate-100 font-bold px-5 py-4"
                  value={newPayment.title}
                  onChange={e => setNewPayment({...newPayment, title: e.target.value})}
                />
                <Button fullWidth loading={uploadingQr} className="bg-slate-900 border-none py-4 font-bold rounded-2xl shadow-xl shadow-slate-200">Confirm Save</Button>
              </form>
            )}

            <div className="space-y-8">
              {/* Internal Wallet Sections */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">My Accounts</h4>
                <div className="grid gap-4">
                  {payments.myPayments.map(p => (
                    <div key={p._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 mb-1">{p.title}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">{p.value || 'Visual QR'}</p>
                      </div>
                      <div className="flex gap-2">
                         {p.type === 'qr_image' && (
                           <button onClick={() => setSelectedQr(qrUrls[p._id])} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-rose transition-colors">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 11v1m8-8h-1m-11 0H4m12 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                           </button>
                         )}
                         <button onClick={() => handleDeletePayment(p._id)} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {partner && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose mb-6">Transfer to {partner.first_name}</h4>
                  <div className="grid gap-4">
                    {payments.partnersPayments.map(p => (
                      <div key={p._id} className="bg-white border-2 border-rose/5 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 mb-1">{p.title}</p>
                          <p className="text-[10px] font-bold text-rose/40 uppercase tracking-widest">Available Account</p>
                        </div>
                        <button 
                          onClick={() => p.type === 'qr_image' ? setSelectedQr(qrUrls[p._id]) : navigator.clipboard.writeText(p.value)}
                          className="bg-rose/5 text-rose p-3 rounded-xl hover:bg-rose hover:text-white transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
