'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, MapPin, Navigation, WifiOff, Truck } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

/**
 * Task destination coordinates.
 */
interface TaskDestination {
    latitude: number;
    longitude: number;
    address: string;
}

/**
 * Agent location update from WebSocket.
 */
interface AgentLocation {
    agent_id: string;
    agent_name?: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    updated_at?: string;
    task_id?: string; // Optional task ID for filtering
}

interface LiveTrackingMapProps {
    taskId: string;
    destination: TaskDestination;
    token: string; // JWT token for WebSocket auth
    className?: string;
}

// Declare Google Maps types
declare global {
    interface Window {
        google: typeof google;
    }
}

/**
 * Live Tracking Map Component.
 * 
 * Shows the task destination and real-time agent location with smooth animation.
 * Connects to WebSocket for live updates.
 * 
 * @requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable
 * @requires NEXT_PUBLIC_WEBSOCKET_URL environment variable
 */
export function LiveTrackingMap({
    taskId,
    destination,
    token,
    className = '',
}: LiveTrackingMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
    const agentMarkerRef = useRef<google.maps.Marker | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [agentLocation, setAgentLocation] = useState<AgentLocation | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Target position for smooth animation
    const targetPositionRef = useRef<{ lat: number; lng: number } | null>(null);
    const currentPositionRef = useRef<{ lat: number; lng: number } | null>(null);

    // Load Google Maps script
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            setError('Google Maps API key not configured');
            setIsLoading(false);
            return;
        }

        if (window.google?.maps) {
            setIsLoaded(true);
            setIsLoading(false);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            setIsLoaded(true);
            setIsLoading(false);
        };

        script.onerror = () => {
            setError('Failed to load Google Maps');
            setIsLoading(false);
        };

        document.head.appendChild(script);
    }, []);

    // Initialize map when loaded
    useEffect(() => {
        if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

        try {
            // Initialize map centered on destination
            mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat: destination.latitude, lng: destination.longitude },
                zoom: 14,
                styles: [
                    // Dark theme styles
                    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
                    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
                ],
                disableDefaultUI: true,
                zoomControl: true,
            });

            // Add destination marker
            destinationMarkerRef.current = new window.google.maps.Marker({
                position: { lat: destination.latitude, lng: destination.longitude },
                map: mapRef.current,
                title: destination.address,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: '#10b981',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
            });

            // Add info window for destination
            const infoWindow = new window.google.maps.InfoWindow({
                content: `<div style="color: #1e293b; padding: 4px;"><strong>Destination</strong><br/>${destination.address}</div>`,
            });

            destinationMarkerRef.current.addListener('click', () => {
                infoWindow.open(mapRef.current!, destinationMarkerRef.current!);
            });

        } catch (err) {
            console.error('Failed to initialize map:', err);
            setError('Failed to initialize map');
        }
    }, [isLoaded, destination]);

    // Smooth marker animation
    const animateMarker = useCallback(() => {
        if (!agentMarkerRef.current || !targetPositionRef.current || !currentPositionRef.current) {
            return;
        }

        const current = currentPositionRef.current;
        const target = targetPositionRef.current;

        // Interpolate position (ease towards target)
        const factor = 0.1; // Animation smoothness (0-1)
        const newLat = current.lat + (target.lat - current.lat) * factor;
        const newLng = current.lng + (target.lng - current.lng) * factor;

        currentPositionRef.current = { lat: newLat, lng: newLng };
        agentMarkerRef.current.setPosition({ lat: newLat, lng: newLng });

        // Continue animation if not at target
        const distance = Math.sqrt(
            Math.pow(target.lat - newLat, 2) + Math.pow(target.lng - newLng, 2)
        );

        if (distance > 0.00001) {
            animationFrameRef.current = requestAnimationFrame(animateMarker);
        }
    }, []);

    // Update agent marker when location changes
    useEffect(() => {
        if (!mapRef.current || !agentLocation) return;

        const position = { lat: agentLocation.latitude, lng: agentLocation.longitude };

        // Create marker if doesn't exist
        if (!agentMarkerRef.current) {
            agentMarkerRef.current = new window.google.maps.Marker({
                position,
                map: mapRef.current,
                title: agentLocation.agent_name || 'Delivery Agent',
                icon: {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 6,
                    rotation: agentLocation.heading || 0,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
            });

            currentPositionRef.current = position;
            targetPositionRef.current = position;

            // Fit bounds to show both markers
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(destinationMarkerRef.current!.getPosition()!);
            bounds.extend(position);
            mapRef.current.fitBounds(bounds, 50);

        } else {
            // Update target for smooth animation
            targetPositionRef.current = position;

            // Update rotation
            if (agentLocation.heading !== undefined) {
                const icon = agentMarkerRef.current.getIcon() as google.maps.Symbol;
                agentMarkerRef.current.setIcon({
                    ...icon,
                    rotation: agentLocation.heading,
                });
            }

            // Start animation
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(animateMarker);
        }
    }, [agentLocation, animateMarker]);

    // Connect to WebSocket
    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

        const socket = io(`${wsUrl}/tracking`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socket.on('connect', () => {
            console.log('[Tracking] WebSocket connected');
            setIsConnected(true);
            setError(null);

            // Subscribe to task updates
            socket.emit('subscribe:task', { task_id: taskId }, (response: any) => {
                if (response?.success && response?.current_location) {
                    setAgentLocation(response.current_location);
                }
            });
        });

        socket.on('disconnect', () => {
            console.log('[Tracking] WebSocket disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('[Tracking] WebSocket error:', err);
            setError('Failed to connect to tracking server');
            setIsConnected(false);
        });

        socket.on('location:update', (data: AgentLocation) => {
            console.log('[Tracking] Location update:', data);
            if (data.task_id === taskId || !data.task_id) {
                setAgentLocation(data);
            }
        });

        socket.on('error', (data: { message: string }) => {
            console.error('[Tracking] Server error:', data.message);
            setError(data.message);
        });

        socketRef.current = socket;

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            socket.emit('unsubscribe:task', { task_id: taskId });
            socket.disconnect();
        };
    }, [taskId, token]);

    if (error) {
        return (
            <div className={`bg-slate-800 rounded-lg p-8 text-center ${className}`}>
                <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={`bg-slate-800 rounded-lg p-8 text-center ${className}`}>
                <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
                <p className="text-slate-400">Loading map...</p>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Map container */}
            <div ref={mapContainerRef} className="w-full h-full min-h-[400px] rounded-lg" />

            {/* Connection status overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 px-3 py-2 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-white">
                    {isConnected ? 'Live' : 'Disconnected'}
                </span>
            </div>

            {/* Agent info overlay */}
            {agentLocation && (
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <Truck className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-medium">
                                {agentLocation.agent_name || 'Delivery Agent'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                {agentLocation.speed !== undefined && (
                                    <span className="flex items-center gap-1">
                                        <Navigation className="w-3 h-3" />
                                        {(agentLocation.speed * 3.6).toFixed(1)} km/h
                                    </span>
                                )}
                                {agentLocation.updated_at && (
                                    <span>
                                        Updated {new Date(agentLocation.updated_at).toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute top-4 right-4 bg-slate-900/80 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-white mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Destination</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Delivery Agent</span>
                </div>
            </div>
        </div>
    );
}
