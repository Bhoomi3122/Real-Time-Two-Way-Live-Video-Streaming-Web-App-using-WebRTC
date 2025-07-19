import { useState } from 'react';
import '../styles/RoomJoinForm.css';

const RoomJoinForm = ({ onJoin }) => {
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      onJoin(roomId.trim());
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h1 className="form-title">Join Room</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="roomId" className="input-label">
              Room ID
            </label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              className="input-field"
              required
            />
          </div>
          <button
            type="submit"
            className="join-button"
            disabled={!roomId.trim()}
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoomJoinForm;
