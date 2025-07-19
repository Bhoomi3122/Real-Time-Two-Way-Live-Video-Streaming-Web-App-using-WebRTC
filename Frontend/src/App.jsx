import React, { useState, useRef, useEffect } from 'react';
import RoomJoinForm from './components/RoomJoinForm';
import VideoPanel from './components/VideoPanel';
import Notification from './components/Notification';
import Loader from './components/Spinner';

const SIGNALING_SERVER_URL = 'ws://localhost:5000';

const App = () => {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isRemoteMicOn, setIsRemoteMicOn] = useState(true);
  const [isRemoteCamOn, setIsRemoteCamOn] = useState(true);

  const wsRef = useRef(null);
  const pcRef = useRef(null);

  const cleanup = () => {
    wsRef.current?.close();
    pcRef.current?.close();
    localStream?.getTracks().forEach((t) => t.stop());

    setLocalStream(null);
    setRemoteStream(null);
    setJoined(false);
    setRoomId('');
    setIsMicOn(true);
    setIsCamOn(true);
    setIsRemoteMicOn(true);
    setIsRemoteCamOn(true);
  };

  const toggleMic = () => {
    const track = localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
      wsRef.current?.send(JSON.stringify({ type: 'mic-status', enabled: track.enabled }));
    }
  };

  const toggleCam = () => {
    const track = localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCamOn(track.enabled);
      wsRef.current?.send(JSON.stringify({ type: 'camera-status', enabled: track.enabled }));
    }
  };

  const handleLeave = () => cleanup();

  useEffect(() => {
    const leaveOnClose = () => cleanup();
    window.addEventListener('beforeunload', leaveOnClose);
    return () => window.removeEventListener('beforeunload', leaveOnClose);
  }, [localStream]);

  const handleJoin = async (inputId) => {
    setRoomId(inputId);
    setLoading(true);
    setNotification(null);

    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(media);
      setJoined(true);
      setLoading(false);

      const ws = new WebSocket(SIGNALING_SERVER_URL);
      wsRef.current = ws;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      media.getTracks().forEach((track) => pc.addTrack(track, media));
      pc.ontrack = (e) => setRemoteStream(e.streams[0]);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
        }
      };

      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', roomID: inputId }));

      ws.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === 'joined') {
          setNotification({ message: 'Joined room successfully.', type: 'success' });
          if (data.users === 2) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', offer }));
          }
        } else if (data.type === 'user-joined') {
          setNotification({ message: 'Another user joined.', type: 'info' });
        } else if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', answer }));
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else if (data.type === 'user-left') {
          setNotification({ message: 'User left the room.', type: 'warning' });
          setRemoteStream(null);
          setIsRemoteMicOn(true);
          setIsRemoteCamOn(true);
        } else if (data.type === 'mic-status') {
          setIsRemoteMicOn(data.enabled);
        } else if (data.type === 'camera-status') {
          setIsRemoteCamOn(data.enabled);
        } else if (data.type === 'room-full') {
          setNotification({ message: 'Room full. Try another.', type: 'error' });
          cleanup();
        }
      };

      ws.onerror = () => {
        setNotification({ message: 'Connection error.', type: 'error' });
      };

      ws.onclose = () => {
        setNotification({ message: 'Connection closed.', type: 'warning' });
        pcRef.current?.close();
        wsRef.current = null;
        pcRef.current = null;
        setRemoteStream(null);
        setIsRemoteMicOn(true);
        setIsRemoteCamOn(true);
      };
    } catch {
      setNotification({ message: 'Camera or mic access denied.', type: 'error' });
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

      {!joined && !loading && <RoomJoinForm onJoin={handleJoin} />}
      {loading && <Loader message="Connecting..." />}
      {joined && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCam}
          onLeave={handleLeave}
          isMicEnabled={isMicOn}
          isCameraEnabled={isCamOn}
          isRemoteMicEnabled={isRemoteMicOn}
          isRemoteCameraEnabled={isRemoteCamOn}
        />
      )}
    </div>
  );
};

export default App;
