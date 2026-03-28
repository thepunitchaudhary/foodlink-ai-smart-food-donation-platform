import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const highDemandIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #f59e0b, #ef4444); width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display:flex;align-items:center;justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3)">🔥</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const bestPickupIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #22c55e, #059669); width: 32px; height: 32px; border-radius: 50%; border: 3px solid #fbbf24; display:flex;align-items:center;justify-content:center; box-shadow:0 2px 12px rgba(34,197,94,0.5); animation: pulse 2s infinite">⭐</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const normalIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #22c55e, #16a34a); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.2)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function getIcon(food) {
  if (food.smart_match?.is_best_pickup) return bestPickupIcon;
  if (food.is_high_demand) return highDemandIcon;
  return normalIcon;
}

function FitBounds({ foods }) {
  const map = useMap();
  useEffect(() => {
    const valid = foods.filter(f => f?.location?.lat && f?.location?.lng);
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map(f => [f.location.lat, f.location.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [foods, map]);
  return null;
}

export default function MapView({ foods = [], center = [20.5937, 78.9629], zoom = 5, height = '400px' }) {
  const validFoods = (foods || []).filter(f => f?.location?.lat && f?.location?.lng);

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
      <MapContainer center={center} zoom={zoom} style={{ height, width: '100%' }} scrollWheelZoom={true}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds foods={validFoods} />

        {validFoods.map((food) => (
          <Marker
            key={food._id || food.id || Math.random()}
            position={[food.location.lat, food.location.lng]}
            icon={getIcon(food)}
          >
            <Popup>
              <div style={{ fontSize: '13px', lineHeight: '1.6', minWidth: '160px' }}>
                <strong>{food.food_name}</strong><br />
                📦 {food.quantity} servings<br />
                👤 {food.donor_name || 'Restaurant'}
                {food.address && <><br />📍 {food.address}</>}
                {food.demand_level && (
                  <><br /><span style={{ color: food.demand_level === 'High' ? '#ef4444' : food.demand_level === 'Medium' ? '#f59e0b' : '#6b7280', fontWeight: 600 }}>
                    {food.demand_level === 'High' ? '🔥' : '📊'} {food.demand_level} Demand ({food.demand_score || 0})
                  </span></>
                )}
                {food.smart_match?.is_best_pickup && (
                  <><br /><span style={{ color: '#22c55e', fontWeight: 700 }}>
                    ⭐ Best Pickup — urgency + distance optimal
                  </span></>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}