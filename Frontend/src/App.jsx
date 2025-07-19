import React, { useState, useRef, useEffect } from 'react';
import RoomJoinForm from './components/RoomJoinForm';
import VideoPanel from './components/VideoPanel';
import Notification from './components/Notification';
import Loader from './components/Spinner';

const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL;

const App = () => {
  const [roomId, setRoomId] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerMic, setPeerMic] = useState(true);
  const [peerCam, setPeerCam] = useState(true);

  const wsRef = useRef(null);
  const pcRef = useRef(null);

  const handleCleanup = () => {
    wsRef.current?.close();
    pcRef.current?.close();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    setLocalStream(null);
    setRemoteStream(null);
    setHasJoined(false);
    setRoomId('');
    setMicOn(true);
    setCamOn(true);
    setPeerMic(true);
    setPeerCam(true);
  };

  const toggleMic = () => {
    const track = localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
      wsRef.current?.send(JSON.stringify({ type: 'mic-status', enabled: track.enabled }));
    }
  };

  const toggleCam = () => {
    const track = localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
      wsRef.current?.send(JSON.stringify({ type: 'camera-status', enabled: track.enabled }));
    }
  };

  const handleLeave = () => handleCleanup();

  useEffect(() => {
    const handleWindowClose = () => handleCleanup();
    window.addEventListener('beforeunload', handleWindowClose);
    return () => window.removeEventListener('beforeunload', handleWindowClose);
  }, [localStream]);

  const handleJoin = async (inputId) => {
    setRoomId(inputId);
    setLoading(true);
    setNotification(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setHasJoined(true);
      setLoading(false);

      const ws = new WebSocket(SIGNALING_SERVER_URL);
      wsRef.current = ws;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
        }
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', roomID: inputId }));
      };

      ws.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);

        switch (data.type) {
          case 'joined':
            setNotification({ message: 'Connected to the room.', type: 'success' });
            if (data.users === 2) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'offer', offer }));
            }
            break;

          case 'user-joined':
            setNotification({ message: 'Someone just joined the room.', type: 'info' });
            break;

          case 'offer':
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', answer }));
            break;

          case 'answer':
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            break;

          case 'candidate':
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;

          case 'user-left':
            setNotification({ message: 'Peer left the call.', type: 'warning' });
            setRemoteStream(null);
            setPeerMic(true);
            setPeerCam(true);
            break;

          case 'mic-status':
            setPeerMic(data.enabled);
            break;

          case 'camera-status':
            setPeerCam(data.enabled);
            break;

          case 'room-full':
            setNotification({ message: 'Room is already full. Try another one.', type: 'error' });
            handleCleanup();
            break;

          default:
            console.warn('Unhandled message type:', data.type);
        }
      };

      ws.onerror = () => {
        console.error('WebSocket connection error');
        setNotification({ message: 'Oops! Something went wrong.', type: 'error' });
      };

      ws.onclose = () => {
        setNotification({ message: 'Connection closed.', type: 'warning' });
        pcRef.current?.close();
        wsRef.current = null;
        pcRef.current = null;
        setRemoteStream(null);
        setPeerMic(true);
        setPeerCam(true);
      };
    } catch (err) {
      console.error('Media access denied or error: ', err);
      setNotification({ message: 'Please allow camera and mic access.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible
          autoHide
          autoHideDelay={4000}
          onDismiss={() => setNotification(null)}
        />
      )}

      {!hasJoined && !loading && <RoomJoinForm onJoin={handleJoin} />}
      {loading && <Loader message="Connecting..." />}
      {hasJoined && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCam}
          onLeave={handleLeave}
          isMicEnabled={micOn}
          isCameraEnabled={camOn}
          isRemoteMicEnabled={peerMic}
          isRemoteCameraEnabled={peerCam}
        />
      )}
    </div>
  );
};

export default App;
