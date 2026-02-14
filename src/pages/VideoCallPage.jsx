import React, { useState } from 'react';
import VideoCall from '../components/VideoCall';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Camera, Video, ArrowLeft, Heart } from 'lucide-react'; // Optional: install lucide-react or use SVGs

const VideoCallPage = () => {
  const { user } = useAuth();
  const [inCall, setInCall] = useState(false);
  const roomId = "couple-room";

  return (
    <Layout>
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-rose-200/30 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl -z-10" />

        {!inCall ? (
          <div className="w-full max-w-md">
            {/* Header Section */}
            <div className="text-center mb-10 space-y-2">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">
                Private Space
              </h1>
              <p className="text-slate-500 font-medium">Ready to see your favorite person?</p>
            </div>

            {/* Main Action Card */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-10 rounded-[2.5rem] shadow-2xl shadow-rose-200/40 text-center relative">
              {/* Floating Icon */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-br from-rose-500 to-pink-600 p-4 rounded-2xl shadow-lg ring-4 ring-white">
                <Video className="w-8 h-8 text-white" />
              </div>

              <div className="mt-4 mb-8">
                <div className="relative inline-block">
                  <span className="text-7xl">💑</span>
                  <Heart className="absolute -top-1 -right-1 w-6 h-6 text-rose-500 fill-rose-500 animate-bounce" />
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => setInCall(true)}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-2xl text-xl hover:shadow-rose-300/50 hover:shadow-2xl transform transition-all active:scale-95 duration-200 flex items-center justify-center gap-3"
                >
                  Start Call
                </button>
                
                <div className="flex items-center justify-center gap-6 pt-4 border-t border-rose-100">
                  <div className="flex flex-col items-center gap-1">
                    <div className="p-2 bg-rose-50 rounded-full text-rose-400">
                       <Camera size={18} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">HD Video</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="p-2 bg-rose-50 rounded-full text-rose-400">
                       <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v5m-3-4.5A4.5 4.5 0 1113.5 6a4.5 4.5 0 01-1.5 8.5z" /></svg>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Call State */
          <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-500">
             <div className="flex items-center justify-between mb-4 px-2">
                <button 
                  onClick={() => setInCall(false)}
                  className="group flex items-center gap-2 text-slate-500 font-medium hover:text-rose-600 transition-colors"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  Leave Room
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Connection</span>
                </div>
             </div>
             
             <div className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                <VideoCall roomId={roomId} userId={user._id} />
             </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VideoCallPage;