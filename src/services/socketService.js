import io from 'socket.io-client';

class SocketService {
    socket;

    connect() {
        if (this.socket) return this.socket;
        this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:2609');
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinRoom(room) {
        if (this.socket) {
            this.socket.emit('join_room', room);
        }
    }

    sendMove(data) {
        if (this.socket) {
            this.socket.emit('send_move', data);
        }
    }

    resetGame(data) {
        if (this.socket) {
            this.socket.emit('game_reset', data);
        }
    }

    sendLocation(data) {
        if (this.socket) {
            this.socket.emit('send_location', data);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

export default new SocketService();
