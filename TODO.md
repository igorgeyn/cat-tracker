# Cat Tracker - Future Improvements

## Aggregate Stats: Migrate to Cloud Functions (Priority)

Currently, anonymous aggregate stats (transition counts, outdoor session times, etc.) are
written directly from the client using Firebase Realtime Database `increment()` operations.
This works but has limitations:

- A malicious user could spam the counters
- The privacy guarantee depends on the client code not sending identifying info
- No server-side validation of the data being written

**Recommended upgrade:** Use Firebase Cloud Functions to handle stats aggregation server-side.
A Cloud Function would trigger on each `households/{id}/cats/{catId}` write, strip all
identifying information, and update the `aggregateStats` node. This provides:

1. Stronger privacy guarantee (stripping happens server-side, not client-side)
2. Protection against counter manipulation
3. Ability to do more complex aggregations (e.g., rolling averages)
4. A verifiable claim for a privacy policy

**Requirements:** Firebase Blaze plan (pay-as-you-go, but includes generous free tier that
should cover a small-to-medium app easily).

## Other Ideas

- PWA manifest + service worker for offline support and native app feel
- Custom app icon for home screen
- Push notifications via Firebase Cloud Messaging (works when app is closed)
- Landing page explaining the app for new users
- User-configurable reminder thresholds (currently hardcoded to 30 minutes)
- Activity history / timeline view per cat
- "Insights" panel showing fun stats derived from the household's own activity log