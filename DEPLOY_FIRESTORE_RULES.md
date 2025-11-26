# Deploy Firestore Security Rules

## Quick Fix for "Missing or insufficient permissions" Error

The chat feature requires Firestore security rules to be deployed. Follow these steps:

### Option 1: Deploy via Firebase Console (Recommended)

1. **Open Firebase Console**: Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. **Select Your Project**: Choose the project matching your `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
3. **Navigate to Firestore**: Click on "Firestore Database" in the left sidebar
4. **Open Rules Tab**: Click on the "Rules" tab at the top
5. **Copy Rules**: Open `firestore.rules` in this project and copy all contents
6. **Paste Rules**: Paste the rules into the Firebase Console editor
7. **Publish**: Click "Publish" to deploy the rules
8. **Wait**: Rules may take a few seconds to propagate

### Option 2: Deploy via Firebase CLI

If you have Firebase CLI installed:

```bash
firebase deploy --only firestore:rules
```

### Verify Rules Are Deployed

After deploying, refresh your application. The "Missing or insufficient permissions" error should be resolved.

### Rules Summary

The rules allow:
- ✅ Users to read messages where `userId == request.auth.uid`
- ✅ Users to create messages where `userId` and `senderUid` match their auth.uid
- ✅ Users to update/delete their own messages
- ✅ Users to read messages they sent (by `senderUid`)

### Troubleshooting

If you still see permission errors:

1. **Check Authentication**: Make sure the user is logged in (`request.auth != null`)
2. **Verify User ID**: Ensure `userId` in messages matches `request.auth.uid`
3. **Check Rules Deployment**: Verify rules are published in Firebase Console
4. **Wait for Propagation**: Rules may take 10-30 seconds to propagate globally

### Need Help?

If issues persist, check:
- Firebase Console → Firestore → Rules → Rules Playground (test your rules)
- Browser console for detailed error messages
- Firebase Console → Firestore → Usage (check for denied requests)



