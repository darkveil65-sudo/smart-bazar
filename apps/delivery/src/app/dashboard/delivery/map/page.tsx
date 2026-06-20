'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function DeliveryMapPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  // Use search params or fallback to Bangalore default for simulation
  const rawLat = parseFloat(searchParams.get('lat') || '0');
  const rawLng = parseFloat(searchParams.get('lng') || '0');
  
  const defaultLat = 12.9716;
  const defaultLng = 77.5946;
  const destinationLat = rawLat && rawLat !== 0 ? rawLat : defaultLat;
  const destinationLng = rawLng && rawLng !== 0 ? rawLng : defaultLng;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  
  // Marker/Polyline refs for dynamic updates
  const startMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Load order details if available
  useEffect(() => {
    if (!orderId) return;
    const unsub = orderService.subscribeToOrder(orderId, setOrder);
    return () => unsub();
  }, [orderId]);

  // Geolocation watch
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null,
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;

    let map: any = null;
    let cancelled = false;
    let animationInterval: any = null;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Guard: if cleanup ran before async resolved, bail out
      if (cancelled || !mapRef.current) return;

      // Guard: if Leaflet already initialized this container, remove it first
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = null;
      }

      // Default center: destination location
      const centerLat = destinationLat;
      const centerLng = destinationLng;

      const startLat = destinationLat - 0.004;
      const startLng = destinationLng - 0.005;

      map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const startIcon = L.divIcon({
        html: `<div style="background-color:#10b981;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);">🏪</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const destIcon = L.divIcon({
        html: `<div style="background-color:#ef4444;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const riderIcon = L.divIcon({
        html: `<div style="
          background-color:#3b82f6;width:42px;height:42px;border-radius:50%;
          border:3px solid white;box-shadow:0 4px 14px rgba(59,130,246,0.5);
          display:flex;align-items:center;justify-content:center;
          animation: pulse-slow 2s infinite;
        "><span style="font-size:22px;">🛵</span></div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      // Segmented route road representation
      const routePoints: [number, number][] = [
        [startLat, startLng],
        [startLat + 0.0015, startLng + 0.001],
        [startLat + 0.001, startLng + 0.003],
        [startLat + 0.0028, startLng + 0.0042],
        [destinationLat, destinationLng]
      ];

      // Add Start (Store) Marker
      startMarkerRef.current = L.marker([startLat, startLng], { icon: startIcon })
        .addTo(map)
        .bindPopup('<b>Smart Bazar Store</b>');

      // Add Destination (Customer) Marker
      destinationMarkerRef.current = L.marker([destinationLat, destinationLng], { icon: destIcon })
        .addTo(map)
        .bindPopup('<b>Delivery Location</b>')
        .openPopup();

      // Add Rider (Scooter) Marker
      riderMarkerRef.current = L.marker([startLat, startLng], { icon: riderIcon })
        .addTo(map)
        .bindPopup('<b> RIDER (You) </b>');

      // Add Dash-styled polyline for route
      routeLineRef.current = L.polyline(routePoints, {
        color: '#f97316',
        weight: 5,
        opacity: 0.8,
        dashArray: '8, 12'
      }).addTo(map);

      // Fit map to show both markers
      map.fitBounds(L.latLngBounds(routePoints), { padding: [50, 50] });

      mapInstanceRef.current = map;
      if (!cancelled) setMapLoaded(true);
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [destinationLat, destinationLng]);

  // Update center when real-time user location changes (only if not simulating)
  useEffect(() => {
    if (!mapInstanceRef.current || !myLocation || isSimulating) return;
    mapInstanceRef.current.setView([myLocation.lat, myLocation.lng], 15);
  }, [myLocation, isSimulating]);

  // Start route animation simulation
  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationProgress(0);
    addToast('Rider is out for delivery! 🛵💨', 'success');

    const startLat = destinationLat - 0.004;
    const startLng = destinationLng - 0.005;

    const pathSegments = [
      [startLat, startLng],
      [startLat + 0.0015, startLng + 0.001],
      [startLat + 0.001, startLng + 0.003],
      [startLat + 0.0028, startLng + 0.0042],
      [destinationLat, destinationLng]
    ];

    // Generate intermediate coordinates for smooth transition
    const stepsPerSegment = 12;
    const allPoints: [number, number][] = [];
    
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const p1 = pathSegments[i];
      const p2 = pathSegments[i + 1];
      for (let j = 0; j < stepsPerSegment; j++) {
        const t = j / stepsPerSegment;
        allPoints.push([
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t
        ]);
      }
    }
    allPoints.push([destinationLat, destinationLng]);

    let index = 0;
    const interval = setInterval(() => {
      if (index >= allPoints.length) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulationProgress(100);
        addToast('Rider arrived at the delivery address! 🏁', 'success');
        return;
      }

      const point = allPoints[index];
      
      // Update rider position
      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng(point);
      }

      // Pan map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(point, 16);
      }

      const progress = Math.round((index / (allPoints.length - 1)) * 100);
      setSimulationProgress(progress);
      index++;
    }, 250);
  };

  const addr = order?.deliveryAddress;

  return (
    <div className="animate-fadeIn h-full flex flex-col w-full max-w-7xl mx-auto py-6 px-4 md:px-0" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Top Banner details */}
      {order ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Active Delivery Route</p>
              <h2 className="text-base font-black text-slate-900 mt-0.5">
                #{order.id.slice(0, 8).toUpperCase()} • {order.items.length} Items • ₹{order.totalAmount}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startSimulation}
                disabled={isSimulating}
                className={`px-4 py-2 rounded-2xl text-xs font-bold text-white transition-all shadow-sm ${
                  isSimulating 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 active:scale-95'
                }`}
              >
                {isSimulating ? '🧭 Simulating...' : '🛵 Start Simulation'}
              </button>
            </div>
          </div>
          {addr && (
            <div className="mt-3 flex items-start gap-2 bg-orange-50/70 border border-orange-100 rounded-2xl px-4 py-3 text-xs">
              <span className="text-base shrink-0">📍</span>
              <div>
                <p className="font-bold text-orange-600 uppercase text-[9px]">Destination</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {addr.street}, {addr.city}{addr.pincode ? ` - ${addr.pincode}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Demo Route Simulation Sandbox</h2>
            <p className="text-xs text-slate-500 mt-0.5">Test map movement & order delivery path tracing</p>
          </div>
          <button
            onClick={startSimulation}
            disabled={isSimulating}
            className={`px-4 py-2 rounded-2xl text-xs font-bold text-white transition-all shadow-sm ${
              isSimulating 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 active:scale-95'
            }`}
          >
            {isSimulating ? '🧭 Simulating...' : '🛵 Start Demo Route'}
          </button>
        </div>
      )}

      {/* Map simulator panel */}
      {isSimulating && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full animate-pulse shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs font-semibold text-blue-700">
              <span>Simulated Route progress</span>
              <span>{simulationProgress}%</span>
            </div>
            <div className="w-full h-2 bg-blue-100 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${simulationProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 shadow-xl relative" style={{ minHeight: '400px' }}>
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-[1000]">
            <p className="text-4xl mb-3 animate-bounce">🗺️</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Map Engine...</p>
          </div>
        )}
      </div>

      {/* Open Google Maps for actual navigation link */}
      {rawLat !== 0 && rawLng !== 0 && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${rawLat},${rawLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full py-3.5 rounded-2xl text-white text-xs font-bold text-center block press-effect shadow-md transition-all hover:opacity-95"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          🚀 Open in Google Maps for Rider Navigation
        </a>
      )}
    </div>
  );
}
