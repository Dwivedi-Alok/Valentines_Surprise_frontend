import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import coupleService from '../services/coupleService';
import api from '../services/api'; // Direct API access for profile updates
import { Button, Input, Card, Spinner } from '../components/ui';
import Layout from '../components/Layout';

const ProfilePage = () => {
  const { user, login } = useAuth(); // login used to update user context
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Invite form state
  const [inviteData, setInviteData] = useState({
    email: '',
    first_name: '',
    last_name: '',
  });

  // Profile edit state
  const [profileData, setProfileData] = useState({
    address: '',
    favorites: '',
  });

  // Favorites list state
  const [newFavorite, setNewFavorite] = useState('');
  const [newPartnerFavorite, setNewPartnerFavorite] = useState('');

  useEffect(() => {
    fetchCouple();
    if (user) {
      let favs = user.favorites || [];
      // Handle legacy string format
      if (typeof favs === 'string') {
        favs = favs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      }
      
      setProfileData({
        address: user.address || '',
        favorites: favs,
      });
    }
  }, [user]);

  // Partner edit state
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [partnerFavorites, setPartnerFavorites] = useState([]);

  useEffect(() => {
    if (couple) {
      const p = getPartnerInfo();
      if (p) {
        let favs = p.favorites || [];
        if (typeof favs === 'string') {
          favs = favs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        }
        setPartnerFavorites(favs);
      }
    }
  }, [couple]);

  const handleAddFavorite = () => {
    if (!newFavorite.trim()) return;
    setProfileData(prev => ({
      ...prev,
      favorites: [...(prev.favorites || []), newFavorite.trim()]
    }));
    setNewFavorite('');
  };

  const handleRemoveFavorite = (index) => {
    setProfileData(prev => ({
      ...prev,
      favorites: prev.favorites.filter((_, i) => i !== index)
    }));
  };

  const handleAddPartnerFavorite = () => {
    if (!newPartnerFavorite.trim()) return;
    setPartnerFavorites(prev => [...(prev || []), newPartnerFavorite.trim()]);
    setNewPartnerFavorite('');
  };

  const handleRemovePartnerFavorite = (index) => {
    setPartnerFavorites(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePartnerFavorites = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put('/profile/partner', { favorites: partnerFavorites });
      setSuccess('Partner favorites updated! 💕');
      setIsEditingPartner(false);
      fetchCouple(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCouple = async () => {
    try {
      const data = await coupleService.getCouple();
      setCouple(data.couple);
    } catch (err) {
      setError('Failed to load couple info');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.put('/profile', profileData);
      // Update local user context if possible, or just show success
      // Assuming response.data.user contains updated user
      // For now, simple success message
      setSuccess('Profile updated successfully! ✨');
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteData.email || !inviteData.first_name) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await coupleService.invitePartner(inviteData);
      setCouple(result.couple);
      setSuccess(result.message);
      setShowInviteForm(false);
      setInviteData({ email: '', first_name: '', last_name: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePartner = async () => {
    if (!confirm('Are you sure you want to remove your partner?')) return;

    try {
      await coupleService.removePartner();
      setCouple(null);
      setSuccess('Partner removed');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || 'Failed to remove partner';
      setError(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
    }
  };

  const getPartnerInfo = () => {
    if (!couple) return null;
    
    if (couple.status === 'pending') {
      return {
        name: `${couple.invite_first_name} ${couple.invite_last_name || ''}`.trim(),
        email: couple.invite_email,
        isPending: true,
      };
    }
    
    // Find the partner (the other user)
    const partner = couple.user1._id === user._id ? couple.user2 : couple.user1;
    if (!partner) return null;
    
    return {
      name: `${partner.first_name} ${partner.last_name || ''}`.trim(),
      email: partner.email,
      address: partner.address,
      favorites: partner.favorites,
      isPending: false,
    };
  };

  const partner = getPartnerInfo();

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-accent mb-4 shadow-lg shadow-rose/20">
            <span className="text-3xl">💕</span>
          </div>
          <h1 className="text-2xl font-semibold text-dark">Your Profile</h1>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 text-error text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-success/10 text-success text-sm text-center">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Info */}
          <Card className="h-fit">
            <Card.Header>
              <div className="flex justify-between items-center">
                <Card.Title>Your Information</Card.Title>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blush flex items-center justify-center text-deep font-semibold text-2xl">
                    {user?.first_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-dark text-lg">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sm text-text-muted">{user?.email}</p>
                  </div>
                </div>

                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <Input
                      label="Delivery Address"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Where should gifts be sent?"
                    />
                    <div>
                      <label className="block text-sm font-medium text-text-light mb-1.5">
                        Favorite Things
                      </label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a new favorite..."
                            value={newFavorite}
                            onChange={(e) => setNewFavorite(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddFavorite();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button type="button" onClick={handleAddFavorite} disabled={!newFavorite.trim()}>
                            Add
                          </Button>
                        </div>
                        
                        <ul className="space-y-2">
                          {Array.isArray(profileData.favorites) && profileData.favorites.map((fav, index) => (
                            <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                              <div className="flex items-center gap-2">
                                <span className="text-rose">♥</span>
                                <span className="text-dark">{fav}</span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleRemoveFavorite(index)}
                                className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button type="submit" loading={submitting} className="w-full mt-4">
                      Save Changes
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-text-muted mb-1">📍 Address</h4>
                      <p className="text-dark bg-cream-dark/50 p-3 rounded-xl">
                        {profileData.address || <span className="text-text-muted italic">No address added yet</span>}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-muted mb-1">🎁 Favorite Things</h4>
                      {profileData.favorites && profileData.favorites.length > 0 ? (
                        Array.isArray(profileData.favorites) ? (
                          <ul className="space-y-2 bg-cream-dark/50 p-3 rounded-xl">
                            {profileData.favorites.map((fav, index) => (
                              <li key={index} className="flex items-start gap-2 text-dark">
                                <span className="text-rose mt-1">♥</span>
                                <span>{fav}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-dark bg-cream-dark/50 p-3 rounded-xl whitespace-pre-line">
                            {profileData.favorites}
                          </p>
                        )
                      ) : (
                        <p className="text-dark bg-cream-dark/50 p-3 rounded-xl text-text-muted italic">
                          No favorites added yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Partner Section */}
          <Card variant="gradient" className="h-fit">
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <span>❤️</span> Your Partner
              </Card.Title>
            </Card.Header>
            <Card.Body>
              {partner ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-rose flex items-center justify-center text-white font-semibold text-2xl shadow-md">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-dark text-lg flex items-center gap-2">
                        {partner.name}
                        {partner.isPending && (
                          <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-text-muted">{partner.email}</p>
                    </div>
                  </div>
                  
                  {partner.isPending ? (
                    <div className="space-y-3">
                      <p className="text-sm text-text-light bg-blush rounded-lg p-3">
                        💌 An invitation has been sent! Once they sign up, you'll be connected.
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleRemovePartner} 
                        className="text-error hover:bg-error/10 hover:text-error"
                      >
                        Cancel Invitation
                      </Button>
                    </div>
                  ) : (
                    <>
                      {isEditingPartner ? (
                        <form onSubmit={handleUpdatePartnerFavorites} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-text-light mb-1.5">
                              {partner.name}'s Favorite Things
                            </label>
                            
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  placeholder={`Add something ${partner.name} loves...`}
                                  value={newPartnerFavorite}
                                  onChange={(e) => setNewPartnerFavorite(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddPartnerFavorite();
                                    }
                                  }}
                                  className="flex-1"
                                />
                                <Button type="button" onClick={handleAddPartnerFavorite} disabled={!newPartnerFavorite.trim()}>
                                  Add
                                </Button>
                              </div>

                              <ul className="space-y-2">
                                {Array.isArray(partnerFavorites) && partnerFavorites.map((fav, index) => (
                                  <li key={index} className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-light/20 group">
                                    <div className="flex items-center gap-2">
                                      <span className="text-rose">♥</span>
                                      <span className="text-dark">{fav}</span>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => handleRemovePartnerFavorite(index)}
                                      className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ✕
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button type="submit" loading={submitting}>
                              Save Changes
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsEditingPartner(false)}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4 pt-2">
                           <div>
                            <h4 className="text-sm font-medium text-text-muted mb-1">📍 Address</h4>
                            <p className="text-dark bg-white/50 p-3 rounded-xl border border-rose-light/20">
                              {partner.address || <span className="text-text-muted italic">Not shared yet</span>}
                            </p>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-sm font-medium text-text-muted">🎁 Favorite Things</h4>
                              <button 
                                onClick={() => setIsEditingPartner(true)}
                                className="text-xs text-accent hover:text-deep transition-colors"
                              >
                                ✎ Edit
                              </button>
                            </div>
                            
                            {partner.favorites && partner.favorites.length > 0 ? (
                              Array.isArray(partner.favorites) ? (
                                <ul className="space-y-2 bg-white/50 p-3 rounded-xl border border-rose-light/20">
                                  {partner.favorites.map((fav, index) => (
                                    <li key={index} className="flex items-start gap-2 text-dark">
                                      <span className="text-rose mt-1">♥</span>
                                      <span>{fav}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-dark bg-white/50 p-3 rounded-xl border border-rose-light/20 whitespace-pre-line">
                                  {partner.favorites}
                                </p>
                              )
                            ) : (
                              <p className="text-dark bg-white/50 p-3 rounded-xl border border-rose-light/20 text-text-muted italic">
                                Not shared yet
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-rose-light/20">
                        <Button variant="ghost" size="sm" onClick={handleRemovePartner} className="text-error hover:bg-error/10 hover:text-error">
                          Remove Partner
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : showInviteForm ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <Input
                    label="Partner's Email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="First Name"
                      value={inviteData.first_name}
                      onChange={(e) => setInviteData({ ...inviteData, first_name: e.target.value })}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={inviteData.last_name}
                      onChange={(e) => setInviteData({ ...inviteData, last_name: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" loading={submitting} className="flex-1">
                      Send Invite
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowInviteForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6">
                  <p className="text-text-light mb-6 leading-relaxed">
                    Add your special someone to share tasks, links, and memories together. Plus, unlock the ability to see their favorite things! 💝
                  </p>
                  <Button onClick={() => setShowInviteForm(true)} className="w-full">
                    + Invite Partner
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
