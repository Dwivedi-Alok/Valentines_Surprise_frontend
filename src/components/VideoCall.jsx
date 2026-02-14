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

  // Debug Logs State
  const [logs, setLogs] = useState([]);
  const addLog = (msg) => {
      console.log(msg);
      setLogs(prev => [...prev.slice(-4), msg]); // Keep last 5 logs
  };

  // Use addLog in other functions too
  const createPeerConnection = React.useCallback((targetUserId) => {
      addLog(`Creating PC for ${targetUserId}`);
      
      // Close any existing peer connection first
      if (peerConnection.current) {
          addLog('Closing existing PC before creating new one');
          peerConnection.current.close();
          peerConnection.current = null;
      }
      
      const pc = new RTCPeerConnection({
          iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' }
          ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          addLog(`Sending ICE candidate`);
          socketRef.current.emit('ice-candidate', { candidate: event.candidate, targetUserId });
        }
      };

      pc.oniceconnectionstatechange = () => {
        addLog(`ICE State: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setConnectionStatus('Video Connected');
        } else if (pc.iceConnectionState === 'failed') {
            addLog('ICE connection failed - restarting ICE');
            pc.restartIce();
        } else if (pc.iceConnectionState === 'disconnected') {
            setConnectionStatus('Reconnecting...');
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        const track = event.track;
        addLog(`Track Rx: ${track.kind} (${track.enabled ? 'enabled' : 'disabled'}, readyState: ${track.readyState})`);
        console.log("Track Received:", track, "Stream:", stream);
        
        track.onunmute = () => addLog(`Track ${track.kind} unmuted`);
        track.onmute = () => addLog(`Track ${track.kind} muted`);

        setRemoteStream(stream);
        setConnectionStatus('Video Connected');
      };
      
      // Add local tracks to the peer connection
      const currentStream = localStreamRef.current;
      if (currentStream) {
          addLog(`Adding ${currentStream.getTracks().length} local tracks to PC`);
          currentStream.getTracks().forEach(track => {
              addLog(`Adding track: ${track.kind} (${track.readyState})`);
              pc.addTrack(track, currentStream);
          });
      } else {
          addLog('WARNING: No local stream when creating PC!');
      }

      peerConnection.current = pc;
      return pc;
  }, []);

  useEffect(() => {
    // 1. Initialize Socket
    let socket = socketService.socket;
    if (!socket) {
        socket = socketService.connect();
    }
    socketRef.current = socket;

    // 2. Setup Event Listeners
    const onConnect = () => {
        addLog(`Socket connected: ${socket.id}`);
        setConnectionStatus('Connected to Server');
        socket.emit('join-room', { roomId, userId });
    };

    const onConnectError = (err) => {
        addLog(`Socket Error: ${err.message}`);
        setConnectionStatus('Error: ' + err.message);
    };

    if (socket.connected) {
        onConnect();
    } else {
        socket.on('connect', onConnect);
    }
    socket.on('connect_error', onConnectError);

    // Handle incoming offer
    socket.on('offer', async ({ offer, senderId }) => {
      try {
          addLog(`Received offer from ${senderId.slice(-4)}`);
          setConnectionStatus('Receiving Call...');
          
          // Auto-start camera if not active
          if (!localStreamRef.current) {
              try {
                  addLog("Auto-starting camera...");
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                  setLocalStream(stream);
              } catch (e) {
                  addLog("Camera Auto-start failed");
                  console.error(e);
              }
          }

          const pc = createPeerConnection(senderId);
          if (!pc) {
              addLog("Failed to create PC for specific offer");
              return;
          }

          addLog("Setting Remote Description...");
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          
          addLog("Creating Answer...");
          const answer = await pc.createAnswer();
          
          addLog("Setting Local Description...");
          await pc.setLocalDescription(answer);
          
          addLog("Sending Answer...");
          socket.emit('answer', { answer, targetUserId: senderId });
          
          setIsCallActive(true);
          setConnectionStatus('Connected');
      } catch (err) {
          console.error("Error handling offer:", err);
          addLog(`Offer Handle Err: ${err.message}`);
      }
    });

    // Handle incoming answer
    socket.on('answer', async ({ answer }) => {
      try {
          addLog("Received answer");
          if (peerConnection.current) {
              const signalingState = peerConnection.current.signalingState;
              if (signalingState === 'stable') {
                  addLog("Ignored Answer (State is Stable)");
                  return;
              }
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
              setIsCallActive(true);
              setConnectionStatus('Connected');
              addLog("Remote Desc Set (Answer)");
          } else {
              addLog("No PC found for answer!");
          }
      } catch (err) {
          console.error("Error handling answer:", err);
          addLog(`Answer Handle Err: ${err.message}`);
      }
    });

    // Handle incoming ICE candidates
    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection.current) {
          try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
              console.error("Error adding ice candidate", e);
          }
      }
    });

    socket.on('user-connected', async (connectedUserId) => {
        addLog(`User connected: ${connectedUserId}`);
        setConnectionStatus('Partner Joined');
        
        // Auto-start camera if not active, then initiate the call
        if (!localStreamRef.current) {
            try {
                addLog('Auto-starting camera for outgoing call...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
            } catch (e) {
                addLog(`Camera Error: ${e.message}`);
                return;
            }
        }
        
        // Now initiate the P2P handshake
        try {
            addLog(`Initiating call to ${connectedUserId}`);
            setConnectionStatus('Initiating Call...');
            
            const pc = createPeerConnection(connectedUserId);
            if (!pc) {
                addLog('Failed to create PeerConnection');
                return;
            }
            
            addLog('Creating Offer...');
            const offer = await pc.createOffer();
            addLog('Setting Local Description...');
            await pc.setLocalDescription(offer);
            
            addLog(`Sending Offer to ${connectedUserId}...`);
            if (socketRef.current) {
                socketRef.current.emit('offer', { offer, targetUserId: connectedUserId });
                addLog('Offer Sent!');
            } else {
                addLog('Socket Ref is null! Cannot send offer.');
            }
            
            setIsCallActive(true);
        } catch (e) {
            console.error('Error initiating call', e);
            addLog(`Call Init Error: ${e.message}`);
        }
    });

    socket.on('user-disconnected', (disconnectedUserId) => {
        addLog(`User disconnected: ${disconnectedUserId}`);
        if (disconnectedUserId !== userId) {
             setConnectionStatus('Partner Disconnected');
             endCall();
        }
    });

    socket.on('debug_ping', (senderId) => {
        addLog(`PING received from ${senderId}`);
        console.log("PING Received");
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
  }, [roomId, userId, createPeerConnection]);

  const startCall = async () => {
    try {
        if (localStreamRef.current) return;
        addLog("Requesting Camera...");
        setConnectionStatus('Accessing Camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        addLog("Camera Active");
        setConnectionStatus('Ready');
    } catch (err) {
        addLog(`Camera Error: ${err.message}`);
        setConnectionStatus('Camera Error');
    }
  };

  const sendPing = () => {
      if (socketRef.current) {
          addLog("Sending Ping...");
          console.log("[VideoCall] Sending Ping");
          socketRef.current.emit('debug_ping', userId); // Sending my ID so they know who pinged
      } else {
          addLog("Socket not connected");
      }
  };

  const endCall = () => {
      addLog("Ending Call");
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
    <div className={`flex flex-col items-center ${isCallActive ? 'fixed inset-0 bg-black z-40' : 'bg-cream/50 p-4 md:p-6 rounded-3xl shadow-sm gap-4'} w-full transition-all duration-500`}>
      
      {/* Video Area */}
      <div className={`relative w-full max-w-6xl transition-all duration-500 ${isCallActive ? 'flex-1 h-full' : 'h-auto'}`}>
        
        {/* Remote Video — fills screen on mobile during call */}
        <div className={`relative transition-all duration-500 ${isCallActive ? 'w-full h-full' : 'w-full'} ${!isCallActive && !remoteStream && 'block'}`}>
             {remoteStream ? (
                <div className={`relative bg-black overflow-hidden shadow-2xl w-full ${isCallActive ? 'h-full rounded-none' : 'rounded-3xl aspect-video border-4 border-rose-200'}`}>
                    <video
                      ref={(video) => {
                        if (video && remoteStream && video.srcObject !== remoteStream) {
                          video.srcObject = remoteStream;
                          video.play().catch(e => {
                              if (e.name !== 'AbortError') console.error("Error playing remote video", e);
                          });
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={!isSpeakerOn}
                      onLoadedMetadata={(e) => {
                          addLog(`Remote Video Loaded: ${e.target.videoWidth}x${e.target.videoHeight}`);
                          e.target.play().catch(err => addLog(`Play Err: ${err.message}`));
                      }}
                      onCanPlay={() => addLog("Remote Video Can Play")}
                      onError={(e) => addLog(`Video Error: ${e.target.error.message}`)}
                      style={{ filter: activeFilterData.filter }}
                      className="w-full h-full object-cover"
                    />
                     <div className={`absolute ${isCallActive ? 'bottom-28 md:bottom-4' : 'bottom-4'} left-4 flex items-center gap-2 bg-rose-500/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs md:text-sm font-medium shadow-lg z-10`}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
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

        {/* Local Video — floating PiP during call */}
        <div className={`transition-all duration-500 ${
            isCallActive 
            ? 'absolute top-4 right-4 w-28 md:w-40 z-20 shadow-2xl rounded-2xl overflow-hidden border-2 border-white/80' 
            : `w-full md:w-1/2 mx-auto mt-4 ${remoteStream ? 'hidden' : ''}`
        }`}>
            <div className={`relative bg-black overflow-hidden shadow-2xl aspect-video ${isCallActive ? 'rounded-2xl' : 'rounded-3xl border-4 border-white'} ${!isCameraOn ? 'bg-gray-800' : ''}`}>
                <video
                  ref={(video) => {
                    if (video && localStream && video.srcObject !== localStream) {
                      video.srcObject = localStream;
                      video.play().catch(e => console.error("Error playing local video", e));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    filter: activeFilterData.filter,
                    display: isCameraOn ? 'block' : 'none'
                  }}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <span className={`${isCallActive ? 'text-sm' : 'text-2xl'}`}>📷 Off</span>
                  </div>
                )}
                
                {/* 'You' tag — hidden in PiP mode on mobile */}
                {!isCallActive && (
                  <div className="absolute bottom-3 left-3">
                    <div className="bg-white/20 backdrop-blur-md text-white px-3 py-0.5 rounded-full text-xs font-medium border border-white/30">
                        You
                    </div>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* Controls — overlaid at bottom during active call */}
      <div className={`flex flex-col items-center gap-3 w-full max-w-2xl transition-all duration-500 ${
        isCallActive 
          ? 'absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl p-4 pb-6 z-30 rounded-t-3xl border-t border-white/10 max-w-full' 
          : 'bg-white p-4 rounded-2xl shadow-lg border border-rose-100'
      }`}>
        
        {/* Filter Selector — hidden on mobile during active call */}
        <div className={`w-full overflow-x-auto pb-2 scrollbar-hide ${isCallActive ? 'hidden md:block' : ''}`}>
            <div className="flex justify-center gap-3 min-w-max px-2">
                {Object.entries(filters).map(([key, filter]) => (
                    <button
                        key={key}
                        onClick={() => setActiveFilter(key)}
                        className={`
                            relative flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl transition-all duration-300 transform
                            ${activeFilter === key 
                                ? `bg-gradient-to-br from-rose-400 to-pink-500 text-white scale-110 shadow-lg ring-2 ring-rose-200 ring-offset-2 ${isCallActive ? 'ring-offset-black/60' : ''}` 
                                : `${isCallActive ? 'bg-white/10 text-white/70' : 'bg-gray-50 text-gray-500 hover:bg-white hover:shadow-md'}`
                            }
                        `}
                    >
                        <span className="text-xl md:text-2xl mb-0.5 filter drop-shadow-sm">{filter.icon || '✨'}</span>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">{filter.name}</span>
                        {activeFilter === key && (
                            <div className="absolute -bottom-1 w-1 h-1 bg-rose-500 rounded-full"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {!isCallActive && <div className="h-px w-full bg-gray-100"></div>}

        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-3 md:gap-4">
            {!isCallActive && !localStream ? (
                <button 
                    onClick={startCall} 
                    className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-rose-500 to-pink-500 text-white rounded-full hover:from-rose-600 hover:to-pink-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                >
                    <span>📸</span> Turn On Camera
                </button>
            ) : (
             <>
                 <button 
                    onClick={toggleMic}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-md active:scale-95 ${!isMicOn ? 'bg-rose-500 text-white' : isCallActive ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-gray-100 text-gray-700'}`}
                    title={isMicOn ? "Mute" : "Unmute"}
                 >
                     <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />{!isMicOn && <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />}</svg>
                 </button>

                 <button 
                    onClick={toggleCamera}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-md active:scale-95 ${!isCameraOn ? 'bg-rose-500 text-white' : isCallActive ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-gray-100 text-gray-700'}`}
                    title={isCameraOn ? "Camera Off" : "Camera On"}
                 >
                     <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />{!isCameraOn && <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />}</svg>
                 </button>

                 <button 
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`p-3 md:p-4 rounded-full transition-all shadow-md active:scale-95 ${!isSpeakerOn ? 'bg-rose-500 text-white' : isCallActive ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-gray-100 text-gray-700'}`}
                    title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
                 >
                     <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSpeakerOn ? "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" : "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"} />{!isSpeakerOn && <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />}</svg>
                 </button>

                 <button 
                    onClick={endCall} 
                    className="flex items-center gap-2 px-5 md:px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg font-medium active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6.616l2.062-2.062a2 2 0 012.828 0l2 2z" /></svg>
                    <span className="text-sm md:text-base">{isCallActive ? "End" : "Stop"}</span>
                </button>
             </>
            )}
        </div>
        {!isCallActive && !localStream && <p className="text-gray-400 text-xs">Access to camera & microphone required</p>}
        {/* Status — compact during call */}
        {!isCallActive && (
          <div className="text-center mt-1 px-4 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-mono">
              Status: {connectionStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
