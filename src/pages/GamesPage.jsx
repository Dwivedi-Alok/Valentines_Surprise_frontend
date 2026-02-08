import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import coupleService from '../services/coupleService';
import TicTacToe from '../components/games/TicTacToe';
import LocationTracker from '../components/LocationTracker';
import { Card, Spinner } from '../components/ui';

const GamesPage = () => {
    const { user } = useAuth();
    const [couple, setCouple] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('games'); // 'games' or 'location'

    useEffect(() => {
        const fetchCouple = async () => {
            try {
                const data = await coupleService.getCouple();
                setCouple(data.couple);
            } catch (err) {
                console.error("Failed to load couple", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCouple();
    }, []);

    if (loading) {
        return (
            <Layout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Spinner size="xl" />
                </div>
            </Layout>
        );
    }

    if (!couple) {
        return (
            <Layout>
                 <div className="text-center py-10">
                    <h2 className="text-2xl font-bold text-dark">No Partner Found 💔</h2>
                    <p className="text-text-muted mt-2">Invite your partner to start playing games!</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-deep mb-2">Fun Zone 🎮</h1>
                    <p className="text-text-muted">Play together or find each other in real-time!</p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('games')}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${
                            activeTab === 'games' 
                            ? 'bg-rose text-white shadow-lg shadow-rose/30' 
                            : 'bg-white text-text-muted hover:bg-rose-light/10'
                        }`}
                    >
                        Mini Games
                    </button>
                    <button
                        onClick={() => setActiveTab('location')}
                         className={`px-6 py-2 rounded-full font-medium transition-all ${
                            activeTab === 'location' 
                            ? 'bg-rose text-white shadow-lg shadow-rose/30' 
                            : 'bg-white text-text-muted hover:bg-rose-light/10'
                        }`}
                    >
                        Live Location 📍
                    </button>
                </div>

                {activeTab === 'games' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <Card.Body>
                                <TicTacToe couple={couple} />
                            </Card.Body>
                        </Card>
                        
                        {/* Placeholder for Next Game */}
                        <Card className="opacity-75">
                             <Card.Body className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                                <span className="text-4xl mb-4">🃏</span>
                                <h3 className="text-xl font-bold text-dark">Memory Match</h3>
                                <p className="text-text-muted mt-2">Coming Soon...</p>
                            </Card.Body>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Card>
                            <Card.Header>
                                <Card.Title>Real-time Location Sharing</Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <LocationTracker couple={couple} />
                                <p className="text-xs text-text-light text-center mt-3">
                                    Location is shared only while this page is open. 🔒
                                </p>
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default GamesPage;
