import React, { useEffect, useRef, useState } from 'react';
import socketService from '../services/socketService';

const VideoCall = ({ roomId, userId }) => {
  const [localStream, setLocalStreamState] = useState(null);
  const localStreamRef = useRef(null);
  
  // Wrapper to keep ref in sync
  const setLocalStream = (stream) => {
      localStreamRef.current = stream;
      setLocalStreamState(stream);
  };

  // Filters
  const filters = {
    normal: { name: 'Normal', filter: 'none', icon: '😊' },
    love: { name: 'Love', filter: 'contrast(1.1) saturate(1.3) hue-rotate(-10deg)', icon: '😍' },
    vintage: { name: 'Vintage', filter: 'sepia(0.5) contrast(1.2)', icon: '🎞️' },
    dreamy: { name: 'Dreamy', filter: 'brightness(1.1) contrast(0.9) saturate(1.2) blur(0.5px)', icon: '☁️' },
    bw: { name: 'B&W', filter: 'grayscale(1)', icon: '🎬' },
  };

  const [activeFilter, setActiveFilter] = useState('normal');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const peerConnection = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Socket
    let socket = socketService.socket;
    if (!socket) {
        socket = socketService.connect();
    }
    socketRef.current = socket;

    // 2. Setup Event Listeners
    const onConnect = () => {
        console.log("Socket connected:", socket.id);
        setConnectionStatus('Connected to Server');
        socket.emit('join-room', { roomId, userId });
    };

    const onConnectError = (err) => {
        console.error("Socket connection error:", err);
        setConnectionStatus('Connection Error: ' + err.message);
    };

    if (socket.connected) {
        onConnect();
    } else {
        socket.on('connect', onConnect);
    }
    socket.on('connect_error', onConnectError);

    // Handle incoming offer
    socket.on('offer', async ({ offer, senderId }) => {
      console.log("Received offer from", senderId);
      setConnectionStatus('Receiving Call...');
      const pc = createPeerConnection(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { answer, targetUserId: senderId });
      setIsCallActive(true);
      setConnectionStatus('Connected with Partner');
    });

    // Handle incoming answer
    socket.on('answer', async ({ answer }) => {
      console.log("Received answer");
      if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          setIsCallActive(true);
          setConnectionStatus('Connected with Partner');
      }
    });

    // Handle incoming ICE candidates
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection.current) {
          try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
              console.error("Error adding received ice candidate", e);
          }
      }
    });

    socket.on('user-connected', (userId) => {
        console.log('User connected:', userId);
        setConnectionStatus('Partner Joined. Calling...');
        initiateOneToOneCall(userId);
    });

    socket.on('user-disconnected', (disconnectedUserId) => {
        console.log('User disconnected:', disconnectedUserId);
        if (disconnectedUserId !== userId) {
             setConnectionStatus('Partner Disconnected');
             endCall();
        }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-connected');
      socket.off('user-disconnected');
    };
  }, [roomId, userId]);

  const createPeerConnection = (targetUserId) => {
      console.log("Creating peer connection for", targetUserId);
      const pc = new RTCPeerConnection({
          iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
          ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', { candidate: event.candidate, targetUserId });
        }
      };

      pc.ontrack = (event) => {
        console.log("Received remote stream");
        setRemoteStream(event.streams[0]);
        setConnectionStatus('Partner Video Connected');
      };

      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
      }

      peerConnection.current = pc;
      return pc;
  };

  const startCall = async () => {
    try {
        if (localStreamRef.current) return;

        setConnectionStatus('Accessing Camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setConnectionStatus('Ready to Call');

        console.log("Starting local stream...");
    } catch (err) {
        console.error("Error accessing media devices:", err);
        setConnectionStatus('Camera Error: ' + err.message);
    }
  };
  
  // Helper to actually initiate the P2P handshake
  const initiateOneToOneCall = async (targetUserId) => {
      setConnectionStatus('Initiating Call...');
      if (!localStreamRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
          } catch (e) {
              console.error("Failed to get local stream on auto-answer", e);
              return;
          }
      }
      
      const pc = createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit('offer', { offer, targetUserId });
  };

  const endCall = () => {
      if (peerConnection.current) {
          peerConnection.current.close();
          peerConnection.current = null;
      }
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          setLocalStream(null);
      }
      setRemoteStream(null);
      setIsCallActive(false);
      setConnectionStatus('Call Ended');
  };

  // Media Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOn;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const activeFilterData = filters[activeFilter];

  return (
    <div className={`flex flex-col items-center gap-6 ${isCallActive ? 'p-0 bg-black min-h-screen justify-center' : 'bg-cream/50 p-6 rounded-3xl shadow-sm'} w-full transition-all duration-500`}>
      /* Video Grid - Adaptive Layout */
      <div className={`relative w-full max-w-6xl transition-all duration-500 ${isCallActive ? 'h-[80vh] md:h-auto' : 'h-auto'}`}>
        
        {/* Remote Video (Full screen on mobile when active) */}
        <div className={`relative transition-all duration-500 ${isCallActive ? 'absolute inset-0 z-0 md:relative md:inset-auto' : 'w-full'} ${!isCallActive && 'hidden md:block'}`}>
             {remoteStream ? (
                <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl w-full h-full md:aspect-video border-4 border-rose-200">
                    <video
                      ref={(video) => {
                        if (video && remoteStream) {
                          video.srcObject = remoteStream;
                          video.play().catch(e => console.error("Error playing remote video", e));
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={!isSpeakerOn}
                      style={{ filter: activeFilterData.style }}
                      className="w-full h-full object-cover"
                    />
                     <div className="absolute bottom-20 md:bottom-4 left-4 flex items-center gap-2 bg-rose-500/80 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg z-10 transition-all">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                        </span>
                        <span>My Love ❤️</span>
                    </div>
                </div>
             ) : (
                 <div className="flex flex-col items-center justify-center bg-rose-50 rounded-3xl border-4 border-dashed border-rose-200 aspect-video text-rose-300 animate-pulse w-full">
                     <div className="text-6xl mb-2">🔭</div>
                     <p className="font-medium">Waiting for partner...</p>
                 </div>
             )}
        </div>

        {/* Local Video (Floating PiP on mobile when active, or side-by-side) */}
        <div className={`transition-all duration-500 ${
            isCallActive 
            ? 'absolute top-4 right-4 w-32 md:w-full md:static md:col-span-1 z-20 shadow-xl rounded-2xl overflow-hidden border-2 border-white' 
            : 'w-full md:w-1/2 mx-auto'
        } ${!isCallActive && remoteStream && 'hidden'}`}>
            <div className={`relative bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video border-4 border-white ${!isCameraOn ? 'bg-gray-800' : ''}`}>
                <video
                  ref={(video) => {
                    if (video && localStream) {
                      video.srcObject = localStream;
                      video.play().catch(e => console.error("Error playing local video", e));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    filter: activeFilterData.style,
                    display: isCameraOn ? 'block' : 'none'
                  }}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <span className="text-2xl">📷 Off</span>
                  </div>
                )}
                
                {/* Only show 'You' tag if not in PiP mode or if on desktop */}
                <div className={`absolute bottom-4 left-4 flex gap-2 ${isCallActive ? 'hidden md:flex' : 'flex'}`}>
                    <div className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-sm font-medium border border-white/30">
                        You
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-2xl shadow-lg border border-rose-100 max-w-2xl w-full">
        
        {/* Filter Selector - Stories Style */}
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex justify-center gap-4 min-w-max px-4">
                {Object.entries(filters).map(([key, filter]) => (
                    <button
                        key={key}
                        onClick={() => setActiveFilter(key)}
                        className={`
                            relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 transform
                            ${activeFilter === key 
                                ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white scale-110 shadow-lg ring-2 ring-rose-200 ring-offset-2' 
                                : 'bg-gray-50 text-gray-500 hover:bg-white hover:shadow-md'
                            }
                        `}
                    >
                        <span className="text-2xl mb-1 filter drop-shadow-sm">{filter.icon || '✨'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{filter.name}</span>
                        {activeFilter === key && (
                            <div className="absolute -bottom-1 w-1 h-1 bg-rose-500 rounded-full"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        <div className="h-px w-full bg-gray-100"></div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
            {!isCallActive && !localStream ? (
                <button 
                    onClick={startCall} 
                    className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-rose-500 to-pink-500 text-white rounded-full hover:from-rose-600 hover:to-pink-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                >
                    <span>📸</span> Turn On Camera
                </button>
            ) : (
             <>
                 {/* Mic Toggle */}
                 <button 
                    onClick={toggleMic}
                    className={`p-4 rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95 ${!isMicOn ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-gray-100 text-gray-700 hover:bg-rose-50'}`}
                    title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                 >
                     {isMicOn ? (
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                     ) : (
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2" /></svg>
                     )}
                 </button>

                 {/* Camera Toggle */}
                 <button 
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95 ${!isCameraOn ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-gray-100 text-gray-700 hover:bg-rose-50'}`}
                    title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                 >
                     {isCameraOn ? (
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                     ) : (
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2" /></svg>
                     )}
                 </button>

                 {/* Speaker Toggle (Remote Audio) */}
                 <button 
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`p-4 rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95 ${!isSpeakerOn ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-gray-100 text-gray-700 hover:bg-rose-50'}`}
                    title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
                 >
                     {isSpeakerOn ? (
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                     ) : (
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2" /></svg>
                     )}
                 </button>

                 {/* End Call / Stop Camera */}
                 <button 
                    onClick={endCall} 
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg hover:shadow-xl ml-2 font-medium active:scale-95 transform duration-150"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6.616l2.062-2.062a2 2 0 012.828 0l2 2z" /></svg>
                    <span>{isCallActive ? "End Call" : "Stop Camera"}</span>
                </button>
             </>
            )}
        </div>
        {!isCallActive && !localStream && <p className="text-gray-400 text-xs">Access to camera & microphone required</p>}
        {/* Connection Status Indicator */}
        <div className="text-center mt-2 px-4 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-mono">
            Status: {connectionStatus}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
