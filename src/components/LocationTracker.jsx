import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import L from 'leaflet';
import { Button, Card } from './ui';

// Fix for default Leaflet marker icons not showing
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';



let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const LocationTracker = ({ couple }) => {
  const { user } = useAuth();
  const [myLocation, setMyLocation] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  // Identify partner
  if (!couple || !couple.user1 || !couple.user2) return <div className="p-4 text-center">Loading location...</div>;

  const user1Id = couple.user1._id || couple.user1;
  const user2Id = couple.user2._id || couple.user2;
  const partnerId = user._id === user1Id ? user2Id : user1Id;
  
  // We need the full partner object for location, so we might need to rely on what's passed or the socket data
  // But let's try to get it from the couple object if populated
  const partner = user._id === user1Id ? couple.user2 : couple.user1;

  useEffect(() => {
    // Initialize partner location from DB persistence
    if (partner && partner.lastLocation && partner.lastLocation.latitude) {
      setPartnerLocation({
        latitude: partner.lastLocation.latitude,
        longitude: partner.lastLocation.longitude,
        userName: partner.first_name,
        lastUpdate: new Date(partner.lastLocation.updatedAt),
      });
    }

    const socket = socketService.connect();
    socketService.joinRoom(couple._id);

    // Listen for partner's location updates
    socket.on('receive_location', (data) => {
      if (data.userId !== user._id) {
        setPartnerLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            userName: data.userName,
            lastUpdate: new Date(),
        });
      }
    });

    return () => {
      socket.off('receive_location');
    };
  }, [couple, user._id, partner]);

  useEffect(() => {
    let watchId;

    if (isSharing) {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationData = { latitude, longitude };
          
          setMyLocation(locationData);
          setError(null);

          // Send to partner
          socketService.sendLocation({
            room: couple._id,
            ...locationData,
            userId: user._id,
            userName: user.first_name,
          });
        },
        (err) => {
          console.error(err);
          setError('Unable to retrieve your location. Please check permissions.');
          setIsSharing(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isSharing, couple._id, user]);

  // Calculate distance whenever locations change
  useEffect(() => {
    if (myLocation && partnerLocation) {
      const dist = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );
      setDistance(dist);
    }
  }, [myLocation, partnerLocation]);

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const formatDistance = (dist) => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)} m`;
    }
    return `${dist.toFixed(2)} km`;
  };

  const toggleSharing = () => {
    setIsSharing(!isSharing);
  };

  // Center logic
  const center = myLocation 
    ? [myLocation.latitude, myLocation.longitude] 
    : partnerLocation 
        ? [partnerLocation.latitude, partnerLocation.longitude] 
        : [51.505, -0.09]; // Default fallback

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
            <Button 
                onClick={toggleSharing} 
                variant={isSharing ? "default" : "outline"}
                className={`min-w-[140px] transition-all duration-300 ${isSharing ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
            >
                {isSharing ? 'Scan is On 📡' : 'Start Sharing 📍'}
            </Button>
            <div className="text-sm">
                 {isSharing ? <span className="text-green-600 font-medium animate-pulse">Live Updating</span> : <span className="text-text-muted">Sharing Paused</span>}
            </div>
        </div>
        
        {distance !== null && (
           <div className="text-right">
              <p className="text-xs text-text-muted">Distance Apart</p>
              <p className="text-xl font-bold text-deep">{formatDistance(distance)}</p>
           </div>
        )}
      </div>

      <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-lg border-2 border-rose-light/30 relative z-0">
        {!myLocation && !partnerLocation ? (
           <div className="absolute inset-0 flex items-center justify-center bg-cream z-10">
              <div className="text-center p-6">
                  <div className="text-4xl mb-2">🌍</div>
                  <h3 className="text-lg font-bold text-dark">Location Services</h3>
                  <p className="text-text-muted mb-4">Click "Start Sharing" to see where you are!</p>
                  {error && <p className="text-error text-sm mt-2">{error}</p>}
              </div>
           </div>
        ) : (
          <MapContainer 
              center={center} 
              zoom={13} 
              scrollWheelZoom={true} 
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* My Marker */}
            {myLocation && (
                <Marker position={[myLocation.latitude, myLocation.longitude]}>
                    <Popup>
                    <div className="text-center">
                        <strong>You are here</strong> 📍<br/>
                    </div>
                    </Popup>
                </Marker>
            )}

            {/* Partner Marker */}
            {partnerLocation && (
               <Marker position={[partnerLocation.latitude, partnerLocation.longitude]}>
               <Popup>
                 <div className="text-center">
                    <strong>{partnerLocation.userName}</strong> ❤️<br/>
                    <span className="text-xs text-gray-500">
                        {partnerLocation.lastUpdate.toLocaleDateString() === new Date().toLocaleDateString()
                            ? `Last seen: ${partnerLocation.lastUpdate.toLocaleTimeString()}`
                            : `Last seen: ${partnerLocation.lastUpdate.toLocaleDateString()} ${partnerLocation.lastUpdate.toLocaleTimeString()}`
                        }
                    </span>
                 </div>
               </Popup>
             </Marker>
            )}
            
            {/* Line connecting the two */}
            {myLocation && partnerLocation && (
                <Polyline 
                    positions={[
                        [myLocation.latitude, myLocation.longitude],
                        [partnerLocation.latitude, partnerLocation.longitude]
                    ]}
                    color="#e11d48" // Rose color
                    dashArray="10, 10" 
                    weight={3}
                />
            )}

            <RecenterMap locations={[myLocation, partnerLocation]} />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

// Component to handle auto-centering (bounds)
const RecenterMap = ({ locations }) => {
    const map = useMap();
    
    useEffect(() => {
        const validLocs = locations.filter(l => l !== null);
        if (validLocs.length > 0) {
            const bounds = L.latLngBounds(validLocs.map(l => [l.latitude, l.longitude]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [locations, map]);
    
    return null;
}

export default LocationTracker;
