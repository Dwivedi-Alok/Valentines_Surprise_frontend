import React, { useState } from 'react';
import VideoCall from '../components/VideoCall';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VideoCallPage = () => {
  const { user } = useAuth();
  const [inCall, setInCall] = useState(false);
  const roomId = "couple-room"; // Single room for the couple

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-3xl font-bold text-rose-600">Video Call 📹</h1>
        <p className="text-gray-600 text-center max-w-md">
          Connect with your partner in real-time! 
          Ensure you both grant camera and microphone permissions.
        </p>
        
        {!inCall ? (
           <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
              <div className="text-6xl mb-6">💑</div>
              <button 
                onClick={() => setInCall(true)}
                className="px-8 py-3 bg-rose-500 text-white font-bold rounded-full text-lg hover:bg-rose-600 transform transition hover:scale-105 shadow-lg"
              >
                Join Video Room
              </button>
           </div>
        ) : (
          <div className="w-full max-w-4xl">
             <VideoCall roomId={roomId} userId={user._id} />
             <div className="mt-6 text-center">
                <button 
                    onClick={() => setInCall(false)}
                    className="text-gray-500 hover:text-gray-700 underline"
                >
                    Back to menu
                </button>
             </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VideoCallPage;
