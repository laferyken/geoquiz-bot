import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const playerPinSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 24 24" fill="#18181b" stroke="#ffffff" stroke-width="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
  </svg>
`);

const opponentPinSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
  </svg>
`);

const targetPinSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 24 24" fill="#22c55e" stroke="#ffffff" stroke-width="1.5">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
  </svg>
`);

const playerIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${playerPinSvg}`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

const opponentIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${opponentPinSvg}`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

const targetIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;utf8,${targetPinSvg}`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

function MapController({ onSelect, disabled }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 50);
  }, [map]);

  useMapEvents({
    click(e) {
      if (!disabled) {
        const wrapped = e.latlng.wrap();
        onSelect([wrapped.lat, wrapped.lng]);
      }
    },
  });
  return null;
}

export default function MapComponent({ playerCoords, opponentCoords, targetCoords, isAnswered, onSelectCoords }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#09090b', overflow: 'hidden' }}>
      <MapContainer
        center={[20, 0]}
        zoom={1.8}
        minZoom={1.5}
        zoomSnap={0.1}
        zoomDelta={0.5}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={true}
        maxBounds={[[-82, -Infinity], [82, Infinity]]}
        maxBoundsViscosity={1.0}
        style={{ width: '100%', height: '100%', background: '#09090b' }}
      >
	<TileLayer
  	 url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"
  	 attribution="&copy; USGS"
         maxZoom={17}
         keepBuffer={6}
        />

        <MapController onSelect={onSelectCoords} disabled={isAnswered} />

        {playerCoords && <Marker position={playerCoords} icon={playerIcon} />}
        {opponentCoords && <Marker position={opponentCoords} icon={opponentIcon} />}

        {isAnswered && targetCoords && (
          <>
            <Marker position={targetCoords} icon={targetIcon} />
            {playerCoords && (
              <Polyline positions={[playerCoords, targetCoords]} color="#000000" weight={1.5} dashArray="3, 5" />
            )}
            {opponentCoords && (
              <Polyline positions={[opponentCoords, targetCoords]} color="#3b82f6" weight={1.5} dashArray="3, 5" />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}