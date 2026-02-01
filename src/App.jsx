import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from './firebase';
import Login from './Login';
import HouseholdSetup from './HouseholdSetup';
import CatTracker from './CatTracker';

export default function App() {
  const [user, setUser] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Check if user has a household
        try {
          const userRef = ref(database, `users/${firebaseUser.uid}/householdId`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            setHouseholdId(snapshot.val());
          } else {
            setHouseholdId(null);
          }
        } catch (e) {
          console.error('Failed to load user household:', e);
          setHouseholdId(null);
        }
      } else {
        setHouseholdId(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-800 text-xl">Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Login />;
  }

  // Logged in but no household
  if (!householdId) {
    return (
      <HouseholdSetup
        user={user}
        onComplete={(id) => setHouseholdId(id)}
      />
    );
  }

  // Logged in with household
  return <CatTracker user={user} householdId={householdId} />;
}
