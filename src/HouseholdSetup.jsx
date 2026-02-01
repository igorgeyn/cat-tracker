import React, { useState } from 'react';
import { ref, set, get, push } from 'firebase/database';
import { database } from './firebase';

const EMOJI_OPTIONS = ['🐱', '🐈', '🐈‍⬛', '🐾', '😺', '😸', '🙀', '😻'];
const DEFAULT_LOCATIONS = ['Inside', 'Outside', 'Living Room', 'Bedroom', 'Kitchen', 'Unknown'];

export default function HouseholdSetup({ user, onComplete }) {
  const [step, setStep] = useState('choice'); // 'choice', 'create', 'join'
  const [householdName, setHouseholdName] = useState('');
  const [cats, setCats] = useState([{ name: '', emoji: '🐱' }]);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const addCat = () => {
    setCats([...cats, { name: '', emoji: '🐱' }]);
  };

  const removeCat = (index) => {
    if (cats.length <= 1) return;
    setCats(cats.filter((_, i) => i !== index));
  };

  const updateCat = (index, field, value) => {
    const updated = [...cats];
    updated[index] = { ...updated[index], [field]: value };
    setCats(updated);
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setError('Please enter a household name.');
      return;
    }

    const validCats = cats.filter(c => c.name.trim());
    if (validCats.length === 0) {
      setError('Please add at least one cat.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = generateInviteCode();
      const householdRef = push(ref(database, 'households'));
      const householdId = householdRef.key;

      const catsObj = {};
      validCats.forEach(cat => {
        const catKey = cat.name.trim().toLowerCase().replace(/\s+/g, '-');
        catsObj[catKey] = {
          name: cat.name.trim(),
          emoji: cat.emoji,
          location: 'Unknown',
          updatedAt: null,
          updatedBy: null
        };
      });

      await set(householdRef, {
        name: householdName.trim(),
        inviteCode: code,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        members: {
          [user.uid]: {
            name: user.displayName || user.email,
            joinedAt: new Date().toISOString()
          }
        },
        cats: catsObj,
        locations: DEFAULT_LOCATIONS
      });

      // Link user to household
      await set(ref(database, `users/${user.uid}/householdId`), householdId);

      // Store invite code mapping for lookups
      await set(ref(database, `inviteCodes/${code}`), householdId);

      onComplete(householdId);
    } catch (e) {
      console.error('Failed to create household:', e);
      setError('Failed to create household. Please try again.');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = inviteCode.trim().toUpperCase();
      const codeSnapshot = await get(ref(database, `inviteCodes/${code}`));

      if (!codeSnapshot.exists()) {
        setError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }

      const householdId = codeSnapshot.val();

      // Add user as a member
      await set(ref(database, `households/${householdId}/members/${user.uid}`), {
        name: user.displayName || user.email,
        joinedAt: new Date().toISOString()
      });

      // Link user to household
      await set(ref(database, `users/${user.uid}/householdId`), householdId);

      onComplete(householdId);
    } catch (e) {
      console.error('Failed to join household:', e);
      setError('Failed to join household. Please try again.');
    }
    setLoading(false);
  };

  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-6">
            <h1 className="text-4xl mb-2">🐾</h1>
            <h1 className="text-2xl font-bold text-amber-900 mb-1">Welcome!</h1>
            <p className="text-amber-700 text-sm">
              Hi {user.displayName?.split(' ')[0] || 'there'}! Create a new household or join an existing one.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setStep('create')}
              className="w-full p-4 bg-white rounded-xl shadow-sm border-2 border-amber-300 hover:border-amber-400 transition-colors text-left"
            >
              <h3 className="font-semibold text-amber-900">Create a Household</h3>
              <p className="text-sm text-amber-600 mt-1">Set up a new household and add your cats</p>
            </button>

            <button
              onClick={() => setStep('join')}
              className="w-full p-4 bg-white rounded-xl shadow-sm border border-amber-200 hover:border-amber-300 transition-colors text-left"
            >
              <h3 className="font-semibold text-amber-900">Join a Household</h3>
              <p className="text-sm text-amber-600 mt-1">Enter an invite code from a family member</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'join') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <button onClick={() => { setStep('choice'); setError(null); }} className="text-amber-700 mb-4 text-sm">&larr; Back</button>

          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
            <h2 className="text-xl font-bold text-amber-900 mb-4">Join a Household</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            <label className="block text-sm font-medium text-amber-800 mb-1">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="w-full px-3 py-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-center text-2xl tracking-widest font-mono"
            />

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full mt-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Household'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // step === 'create'
  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-sm mx-auto">
        <button onClick={() => { setStep('choice'); setError(null); }} className="text-amber-700 mb-4 text-sm">&larr; Back</button>

        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <h2 className="text-xl font-bold text-amber-900 mb-4">Create a Household</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <label className="block text-sm font-medium text-amber-800 mb-1">Household Name</label>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g. The Smith Home"
            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
          />

          <h3 className="text-sm font-medium text-amber-800 mb-2">Your Cats</h3>

          <div className="space-y-3 mb-3">
            {cats.map((cat, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="relative">
                  <select
                    value={cat.emoji}
                    onChange={(e) => updateCat(index, 'emoji', e.target.value)}
                    className="appearance-none w-12 h-10 text-xl text-center bg-amber-50 border border-amber-300 rounded-lg cursor-pointer"
                  >
                    {EMOJI_OPTIONS.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => updateCat(index, 'name', e.target.value)}
                  placeholder="Cat name"
                  className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {cats.length > 1 && (
                  <button
                    onClick={() => removeCat(index)}
                    className="text-amber-400 hover:text-red-500 px-2"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addCat}
            className="w-full py-2 border-2 border-dashed border-amber-300 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors text-sm mb-4"
          >
            + Add Another Cat
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Household'}
          </button>
        </div>
      </div>
    </div>
  );
}
