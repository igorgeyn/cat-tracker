# Cat Tracker

A simple, real-time shared cat location tracker for tracking Pepper and Nori around the house. Built with React, Vite, Tailwind CSS, and Firebase Realtime Database.

## Features

- Real-time location updates synced across all devices
- Mobile-first responsive design
- Works great as a home screen bookmark on iOS/Android
- Simple location management
- Track multiple cats
- See when each cat's location was last updated

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

You'll need to create a Firebase project and configure it for this app.

#### Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "cat-tracker")

#### Enable Realtime Database

1. In your Firebase project, go to "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose a location (use the default for best performance)
4. Start in **test mode** for now (we'll secure it later)

#### Get Your Firebase Configuration

1. In the Firebase Console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Register your app with a nickname (e.g., "Cat Tracker Web")
6. Copy the `firebaseConfig` object

#### Update the Configuration File

Open `src/firebase.js` and replace the placeholder values with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Important:** The `databaseURL` is crucial for Realtime Database to work. Make sure it matches your database URL from the Firebase Console.

### 3. Firebase Security Rules (Recommended)

Since this is just for your household, you can use simple security rules. In the Firebase Console:

1. Go to "Realtime Database"
2. Click on the "Rules" tab
3. Replace the rules with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Note:** These rules allow anyone with your database URL to read/write. For a household app, this is fine. If you want more security, you can implement Firebase Authentication.

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project
# Set public directory to: dist
# Configure as single-page app: Yes
# Set up automatic builds: No

npm run build
firebase deploy
```

### Option 2: Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Vercel will auto-detect Vite and deploy

### Option 3: Netlify

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Import your GitHub repository
4. Build command: `npm run build`
5. Publish directory: `dist`

## Mobile Usage

### iOS (Safari)

1. Open the deployed app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)

1. Open the deployed app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"
4. Tap "Add"

## Data Structure

The Firebase Realtime Database uses this structure:

```json
{
  "cats": {
    "pepper": {
      "name": "Pepper",
      "location": "Living Room",
      "updatedAt": "2025-01-13T10:30:00.000Z",
      "updatedBy": null
    },
    "nori": {
      "name": "Nori",
      "location": "Bedroom",
      "updatedAt": "2025-01-13T10:25:00.000Z",
      "updatedBy": null
    }
  },
  "locations": [
    "Inside",
    "Outside",
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Unknown"
  ]
}
```

## Customization

### Adding More Cats

Edit `src/CatTracker.jsx` and modify the `DEFAULT_CATS` object:

```javascript
const DEFAULT_CATS = {
  pepper: { name: 'Pepper', location: 'Unknown', updatedAt: null, updatedBy: null },
  nori: { name: 'Nori', location: 'Unknown', updatedAt: null, updatedBy: null },
  fluffy: { name: 'Fluffy', location: 'Unknown', updatedAt: null, updatedBy: null }
};
```

### Changing Default Locations

Edit the `DEFAULT_LOCATIONS` array in `src/CatTracker.jsx`:

```javascript
const DEFAULT_LOCATIONS = ['Inside', 'Outside', 'Basement', 'Garage', 'Unknown'];
```

### Changing Colors

The app uses Tailwind's amber color palette. To change colors, search and replace in `src/CatTracker.jsx`:
- `amber-` → `blue-`, `green-`, `purple-`, etc.

## Firebase Information Needed

When you set up Firebase, you'll need these values from the Firebase Console:

1. **API Key** - Found in Project Settings → General → Web API Key
2. **Auth Domain** - Usually `YOUR_PROJECT_ID.firebaseapp.com`
3. **Database URL** - Found in Realtime Database section (e.g., `https://cat-tracker-xxxxx.firebaseio.com`)
4. **Project ID** - Your Firebase project identifier
5. **Storage Bucket** - Usually `YOUR_PROJECT_ID.appspot.com`
6. **Messaging Sender ID** - Found in Project Settings → Cloud Messaging
7. **App ID** - Generated when you add a web app to your project

## License

MIT - Feel free to use this for your own household cat tracking needs!
