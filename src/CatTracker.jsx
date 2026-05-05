import React, { useState, useEffect } from 'react';
import { ref, set, onValue, increment, update, remove } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { database, auth } from './firebase';

const EMOJI_OPTIONS = ['🐱', '🐈', '🐈‍⬛', '🐾', '😺', '😸', '🙀', '😻'];

export default function CatTracker({ user, householdId }) {
  const [cats, setCats] = useState({});
  const [locations, setLocations] = useState([]);
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🐱');
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const unsubscribers = setupRealtimeListeners();
    requestNotificationPermission();

    const reminderInterval = setInterval(() => {
      checkReminders();
    }, 60000);

    return () => {
      clearInterval(reminderInterval);
      unsubscribers.forEach(unsub => unsub());
    };
  }, [householdId]);

  const setupRealtimeListeners = () => {
    const unsubscribers = [];

    // Listen for cat updates
    const catsRef = ref(database, `households/${householdId}/cats`);
    const unsubCats = onValue(catsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCats(snapshot.val());
      }
      setLoading(false);
    });
    unsubscribers.push(unsubCats);

    // Listen for location updates
    const locationsRef = ref(database, `households/${householdId}/locations`);
    const unsubLocations = onValue(locationsRef, (snapshot) => {
      if (snapshot.exists()) {
        setLocations(snapshot.val());
      }
    });
    unsubscribers.push(unsubLocations);

    // Listen for household info
    const nameRef = ref(database, `households/${householdId}/name`);
    const unsubName = onValue(nameRef, (snapshot) => {
      if (snapshot.exists()) setHouseholdName(snapshot.val());
    });
    unsubscribers.push(unsubName);

    const codeRef = ref(database, `households/${householdId}/inviteCode`);
    const unsubCode = onValue(codeRef, (snapshot) => {
      if (snapshot.exists()) setInviteCode(snapshot.val());
    });
    unsubscribers.push(unsubCode);

    return unsubscribers;
  };

  const updateCatLocation = async (catId, location) => {
    const updatedCat = {
      ...cats[catId],
      location,
      updatedAt: new Date().toISOString(),
      updatedBy: user.displayName || user.email
    };

    setSelectedCat(null);

    try {
      const catRef = ref(database, `households/${householdId}/cats/${catId}`);
      await set(catRef, updatedCat);

      // Log anonymous aggregate stats (no identifying info)
      const previousLocation = cats[catId]?.location;
      const hour = new Date().getHours();
      const statsUpdates = {};
      statsUpdates['aggregateStats/totalTransitions'] = increment(1);
      statsUpdates[`aggregateStats/transitionsByLocation/${location}`] = increment(1);
      statsUpdates[`aggregateStats/transitionsByHour/${hour}`] = increment(1);
      if (location === 'Outside') {
        statsUpdates['aggregateStats/outsideSessions/totalCount'] = increment(1);
      }
      if (previousLocation === 'Outside' && location !== 'Outside' && cats[catId]?.updatedAt) {
        const minutes = Math.floor((Date.now() - new Date(cats[catId].updatedAt).getTime()) / 60000);
        if (minutes > 0 && minutes < 1440) {
          statsUpdates['aggregateStats/outsideSessions/totalMinutes'] = increment(minutes);
        }
      }
      update(ref(database), statsUpdates).catch(() => {});
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
      const locationsRef = ref(database, `households/${householdId}/locations`);
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
      const locationsRef = ref(database, `households/${householdId}/locations`);
      await set(locationsRef, updatedLocations);
    } catch (e) {
      console.error('Failed to remove location:', e);
      setError('Failed to remove location');
    }
  };

  const buildCatKey = (name) => {
    const baseKey = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cat';

    let key = baseKey;
    let suffix = 2;
    while (cats[key]) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }
    return key;
  };

  const addCat = async () => {
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;

    const catId = buildCatKey(trimmedName);
    const newCat = {
      name: trimmedName,
      emoji: newCatEmoji,
      location: 'Unknown',
      updatedAt: null,
      updatedBy: null
    };

    setNewCatName('');
    setNewCatEmoji('🐱');

    try {
      await set(ref(database, `households/${householdId}/cats/${catId}`), newCat);
      update(ref(database), {
        'aggregateStats/catCount': increment(1)
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to add cat:', e);
      setError('Failed to add cat');
    }
  };

  const updateCatDetails = async (catId, updates) => {
    const currentCat = cats[catId];
    if (!currentCat) return;

    const nextCat = {
      ...currentCat,
      ...updates
    };

    if (!nextCat.name.trim()) {
      setError('Cat name cannot be blank');
      return;
    }

    try {
      await set(ref(database, `households/${householdId}/cats/${catId}`), nextCat);
    } catch (e) {
      console.error('Failed to update cat:', e);
      setError('Failed to update cat');
    }
  };

  const toggleCatMemorial = async (catId, cat) => {
    const isMemorialized = Boolean(cat.memorialized);
    const message = isMemorialized
      ? `Move ${cat.name} back to active tracking?`
      : `Memorialize ${cat.name}? They will move out of active tracking.`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    const updates = isMemorialized
      ? { memorialized: false, memorializedAt: null }
      : { memorialized: true, memorializedAt: new Date().toISOString() };

    await updateCatDetails(catId, updates);
    if (!isMemorialized && selectedCat === catId) setSelectedCat(null);
  };

  const removeCat = async (catId, catName) => {
    if (Object.keys(cats).length <= 1) {
      setError('Add another cat before removing the last one.');
      return;
    }

    const confirmed = window.confirm(`Remove ${catName} from this household?`);
    if (!confirmed) return;

    try {
      await remove(ref(database, `households/${householdId}/cats/${catId}`));
      if (selectedCat === catId) setSelectedCat(null);
    } catch (e) {
      console.error('Failed to remove cat:', e);
      setError('Failed to remove cat');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleSignOut = () => {
    signOut(auth);
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

  const getCatEmoji = (cat) => {
    return cat.emoji || '🐱';
  };

  const needsReminder = (cat) => {
    if (!cat.updatedAt) return false;
    const now = new Date();
    const lastUpdate = new Date(cat.updatedAt);
    const diffMinutes = Math.floor((now - lastUpdate) / 60000);
    return diffMinutes >= 30;
  };

  const checkReminders = () => {
    Object.entries(cats).forEach(([id, cat]) => {
      if (!cat.memorialized && needsReminder(cat) && cat.location === 'Outside') {
        showReminderNotification(cat.name, id);
      }
    });
  };

  const showReminderNotification = (catName, catId) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notification = new Notification(`Is ${catName} still outside?`, {
        body: `${catName} has been outside for 30+ minutes. Tap to update location.`,
        tag: catId,
        requireInteraction: true
      });

      notification.onclick = function() {
        window.focus();
        setSelectedCat(catId);
        notification.close();
      };
    }
  };

  const requestNotificationPermission = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const catsNeedingReminders = Object.entries(cats).filter(([id, cat]) =>
    !cat.memorialized && needsReminder(cat) && cat.location === 'Outside'
  );
  const activeCats = Object.entries(cats).filter(([, cat]) => !cat.memorialized);
  const memorialCats = Object.entries(cats).filter(([, cat]) => cat.memorialized);

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
          <div>
            <h1 className="text-2xl font-bold text-amber-900">🐾 Cat Tracker</h1>
            <p className="text-xs text-amber-600">{householdName}</p>
          </div>
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

        {/* Reminder Alerts */}
        {catsNeedingReminders.map(([id, cat]) => (
          <div key={id} className="mb-4 p-4 bg-orange-100 border-2 border-orange-400 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{getCatEmoji(cat)}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Is {cat.name} still outside?</h3>
                <p className="text-sm text-orange-700">
                  {cat.name} has been outside for {Math.floor((new Date() - new Date(cat.updatedAt)) / 60000)} minutes
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateCatLocation(id, 'Outside')}
                className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
              >
                ✓ Still Outside
              </button>
              <button
                onClick={() => setSelectedCat(selectedCat === id ? null : id)}
                className="flex-1 py-2 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
              >
                Update Location
              </button>
            </div>
          </div>
        ))}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-amber-200">
            <h2 className="font-semibold text-amber-900 mb-3">Settings</h2>

            {/* Invite Code */}
            <div className="mb-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-700 mb-1">Invite code (share with family)</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-amber-900 tracking-widest">{inviteCode}</span>
                <button
                  onClick={copyInviteCode}
                  className="text-xs px-2 py-1 bg-amber-200 rounded hover:bg-amber-300 transition-colors"
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Manage Locations */}
            <h3 className="text-sm font-medium text-amber-800 mb-2">Manage Locations</h3>

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

            <div className="flex flex-wrap gap-2 mb-4">
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

            {/* Manage Cats */}
            <div className="border-t border-amber-200 pt-4 mt-4">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Manage Cats</h3>

              <div className="space-y-2 mb-3">
                {Object.entries(cats).map(([id, cat]) => (
                  <div key={id} className="flex flex-wrap gap-2 items-center">
                    <select
                      value={getCatEmoji(cat)}
                      onChange={(e) => updateCatDetails(id, { emoji: e.target.value })}
                      className="w-14 px-2 py-2 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-label={`Emoji for ${cat.name}`}
                    >
                      {EMOJI_OPTIONS.map(emoji => (
                        <option key={emoji} value={emoji}>{emoji}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      defaultValue={cat.name}
                      onBlur={(e) => updateCatDetails(id, { name: e.target.value.trim() })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="flex-1 min-w-32 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      aria-label={`Name for ${cat.name}`}
                    />
                    <button
                      onClick={() => toggleCatMemorial(id, cat)}
                      className="px-3 py-2 text-sm text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      {cat.memorialized ? 'Restore' : 'Memorialize'}
                    </button>
                    <button
                      onClick={() => removeCat(id, cat.name)}
                      className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <select
                  value={newCatEmoji}
                  onChange={(e) => setNewCatEmoji(e.target.value)}
                  className="w-14 px-2 py-2 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  aria-label="Emoji for new cat"
                >
                  {EMOJI_OPTIONS.map(emoji => (
                    <option key={emoji} value={emoji}>{emoji}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCat()}
                  placeholder="Add cat..."
                  className="flex-1 min-w-0 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={addCat}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Account */}
            <div className="border-t border-amber-200 pt-3 mt-3">
              <p className="text-xs text-amber-600 mb-2">
                Signed in as {user.displayName || user.email}
              </p>
              <button
                onClick={handleSignOut}
                className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Cat Cards */}
        <div className="space-y-4">
          {activeCats.map(([id, cat]) => (
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
                    <span className="text-3xl">{getCatEmoji(cat)}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-amber-900">{cat.name}</h2>
                      <p className="text-sm text-amber-600">
                        {formatTime(cat.updatedAt)}
                        {cat.updatedBy && <span className="text-amber-400"> · {cat.updatedBy}</span>}
                      </p>
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

        {memorialCats.length > 0 && (
          <div className="mt-6 border-t border-amber-200 pt-5">
            <p className="text-center text-xs uppercase tracking-wide text-amber-500 mb-3">
              Always with us
            </p>
            <div className="space-y-3">
              {memorialCats.map(([id, cat]) => (
                <div
                  key={id}
                  className="bg-amber-100/60 border border-amber-200 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl opacity-80">{getCatEmoji(cat)}</span>
                    <div>
                      <h2 className="text-base font-semibold text-amber-900">{cat.name} (Z&quot;l)</h2>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-amber-600 text-xs mt-6">
          {activeCats.length > 0 ? 'Tap a cat to update their location' : 'Open settings to add a cat'}
        </p>
      </div>
    </div>
  );
}
