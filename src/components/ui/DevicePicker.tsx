'use client';

import { useState, useRef, useEffect } from 'react';
import { useDevices } from '@/hooks/useDevices';

const DEVICE_ICONS: Record<string, string> = {
  Computer: '💻',
  Smartphone: '📱',
  Speaker: '🔊',
  TV: '📺',
  Tablet: '📱',
  default: '🎵',
};

export function DevicePicker() {
  const { devices, activeDevice, isLoading, error, fetchDevices, transferPlayback } = useDevices();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpen = () => {
    fetchDevices();
    setIsOpen(!isOpen);
  };

  const handleSelect = async (deviceId: string) => {
    await transferPlayback(deviceId);
    setIsOpen(false);
  };

  const getDeviceIcon = (type: string) => {
    return DEVICE_ICONS[type] || DEVICE_ICONS.default;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
          activeDevice
            ? 'text-zinc-300 hover:text-white hover:bg-white/[0.1]'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.08]'
        }`}
        title={activeDevice ? `Playing on ${activeDevice.name}` : 'No active device'}
      >
        {isLoading ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/>
          </svg>
        )}
        <span className="hidden sm:inline truncate max-w-[100px]">
          {activeDevice?.name || 'No device'}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Select Device</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {devices.length} device{devices.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Devices list */}
          <div className="max-h-60 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                <p>No devices found</p>
                <p className="text-xs mt-1">Open Spotify on a device</p>
              </div>
            ) : (
              devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleSelect(device.id)}
                  disabled={device.is_active}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                    ${device.is_active 
                      ? 'bg-spotify-green/10 text-spotify-green cursor-default' 
                      : 'hover:bg-white/5 text-white'
                    }
                  `}
                >
                  <span className="text-lg">{getDeviceIcon(device.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{device.name}</span>
                      {device.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-spotify-green/20 rounded text-spotify-green uppercase font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{device.type}</span>
                      {device.volume_percent !== null && (
                        <>
                          <span>•</span>
                          <span>🔊 {device.volume_percent}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Refresh button */}
          <div className="px-4 py-2 border-t border-white/10">
            <button
              onClick={fetchDevices}
              disabled={isLoading}
              className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : '↻ Refresh devices'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

