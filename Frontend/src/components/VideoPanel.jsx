import { useEffect, useRef } from 'react';
import '../styles/VideoPanel.css';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

const VideoPanel = ({
  localStream,
  remoteStream,
  onToggleMic,
  onToggleCamera,
  onLeave,
  isMicEnabled,
  isCameraEnabled,
  isRemoteMicEnabled = true,
  isRemoteCameraEnabled = true,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="video-panel-container">
      <div className="video-panel">
        {["local", "remote"].map((type) => {
          const isLocal = type === "local";
          const stream = isLocal ? localStream : remoteStream;
          const micEnabled = isLocal ? isMicEnabled : isRemoteMicEnabled;
          const camEnabled = isLocal ? isCameraEnabled : isRemoteCameraEnabled;
          const label = isLocal ? "You" : "Remote";
          const videoRef = isLocal ? localVideoRef : remoteVideoRef;
          return (
            <div key={type} className="video-stream">
              <div className="video-container">
                {stream ? (
                  <>
                    <video
                      ref={videoRef}
                      className="video-element"
                      autoPlay
                      muted={isLocal}
                      playsInline
                    />
                    <div className={`connection-status ${stream ? "" : "disconnected"}`} />
                    <div className="status-indicators">
                      {!micEnabled && (
                        <div className="status-icon">
                          <FaMicrophoneSlash size={16} />
                        </div>
                      )}
                      {!camEnabled && (
                        <div className="status-icon">
                          <FaVideoSlash size={16} />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="video-placeholder">
                    {isLocal ? "Connecting..." : "Waiting for remote..."}
                  </div>
                )}
              </div>
              <div className="video-label">{label}</div>
            </div>
          );
        })}

        <div className="controls-container">
          <button
            className={`control-button ${!isMicEnabled ? "disabled" : ""}`}
            onClick={onToggleMic}
          >
            {isMicEnabled ? <FaMicrophone size={18} /> : <FaMicrophoneSlash size={18} />}
            {isMicEnabled ? "Mute" : "Unmute"}
          </button>

          <button
            className={`control-button ${!isCameraEnabled ? "disabled" : ""}`}
            onClick={onToggleCamera}
          >
            {isCameraEnabled ? <FaVideo size={18} /> : <FaVideoSlash size={18} />}
            {isCameraEnabled ? "Stop Video" : "Start Video"}
          </button>

          <button className="control-button leave" onClick={onLeave}>
            <FaPhoneSlash size={18} />
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;