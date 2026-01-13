import React, { useState, useEffect } from 'react';
import { ref, set, onValue, get } from 'firebase/database';
import { database } from './firebase';

const DEFAULT_LOCATIONS = ['Inside', 'Outside', 'Living Room', 'Bedroom', 'Kitchen', 'Unknown'];

const DEFAULT_CATS = {
  pepper: { name: 'Pepper', location: 'Unknown', updatedAt: null, updatedBy: null },
  nori: { name: 'Nori', location: 'Unknown', updatedAt: null, updatedBy: null }
};

export default function CatTracker() {
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [error, setError] = useState(null);

  // Load data on mount and set up real-time listeners
  useEffect(() => {
    loadData();
    setupRealtimeListeners();
  }, []);

  const loadData = async () => {
    try {
      // Load cats
      const catsRef = ref(database, 'cats');
      const catsSnapshot = await get(catsRef);
      if (catsSnapshot.exists()) {
        setCats(catsSnapshot.val());
      } else {
        // Initialize with defaults if doesn't exist
        await set(catsRef, DEFAULT_CATS);
      }

      // Load locations
      const locationsRef = ref(database, 'locations');
      const locationsSnapshot = await get(locationsRef);
      if (locationsSnapshot.exists()) {
        setLocations(locationsSnapshot.val());
      } else {
        // Initialize with defaults if doesn't exist
        await set(locationsRef, DEFAULT_LOCATIONS);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
      setError('Failed to load data. Check Firebase configuration.');
    }
    setLoading(false);
  };

  const setupRealtimeListeners = () => {
    // Listen for cat updates
    const catsRef = ref(database, 'cats');
    onValue(catsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCats(snapshot.val());
      }
    });

    // Listen for location updates
    const locationsRef = ref(database, 'locations');
    onValue(locationsRef, (snapshot) => {
      if (snapshot.exists()) {
        setLocations(snapshot.val());
      }
    });
  };

  const updateCatLocation = async (catId, location) => {
    const updatedCat = {
      ...cats[catId],
      location,
      updatedAt: new Date().toISOString()
    };

    setSelectedCat(null);

    try {
      const catRef = ref(database, `cats/${catId}`);
      await set(catRef, updatedCat);
    } catch (e) {
      console.error('Failed to save:', e);
      setError('Failed to save location update');
    }
  };

  const addLocation = async () => {
    if (!newLocation.trim() || locations.includes(newLocation.trim())) return;

    const updatedLocations = [...locations, newLocation.trim()];
    setNewLocation('');

    try {
      const locationsRef = ref(database, 'locations');
      await set(locationsRef, updatedLocations);
    } catch (e) {
      console.error('Failed to save location:', e);
      setError('Failed to save location');
    }
  };

  const removeLocation = async (loc) => {
    if (locations.length <= 1) return;

    const updatedLocations = locations.filter(l => l !== loc);

    try {
      const locationsRef = ref(database, 'locations');
      await set(locationsRef, updatedLocations);
    } catch (e) {
      console.error('Failed to remove location:', e);
      setError('Failed to remove location');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Never updated';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getCatEmoji = (name) => {
    return name === 'Pepper' ? '🐈‍⬛' : '🐱';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-800 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-amber-900">🐾 Cat Tracker</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-amber-200 hover:bg-amber-300 transition-colors"
          >
            ⚙️
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-amber-200">
            <h2 className="font-semibold text-amber-900 mb-3">Manage Locations</h2>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                placeholder="Add new location..."
                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={addLocation}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {locations.map(loc => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                >
                  {loc}
                  <button
                    onClick={() => removeLocation(loc)}
                    className="ml-1 text-amber-600 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ Real-time sync enabled
            </div>
          </div>
        )}

        {/* Cat Cards */}
        <div className="space-y-4">
          {Object.entries(cats).map(([id, cat]) => (
            <div
              key={id}
              className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden"
            >
              <button
                onClick={() => setSelectedCat(selectedCat === id ? null : id)}
                className="w-full p-4 text-left hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getCatEmoji(cat.name)}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-amber-900">{cat.name}</h2>
                      <p className="text-sm text-amber-600">{formatTime(cat.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">
                      {cat.location}
                    </span>
                  </div>
                </div>
              </button>

              {/* Location Picker */}
              {selectedCat === id && (
                <div className="border-t border-amber-200 p-4 bg-amber-50">
                  <p className="text-sm text-amber-700 mb-3">Where is {cat.name}?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {locations.map(loc => (
                      <button
                        key={loc}
                        onClick={() => updateCatLocation(id, loc)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                          cat.location === loc
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-amber-600 text-xs mt-6">
          Tap a cat to update their location
        </p>
      </div>
    </div>
  );
}
