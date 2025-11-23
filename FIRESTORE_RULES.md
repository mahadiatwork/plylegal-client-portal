# Firestore Security Rules

This document contains the Firestore security rules that should be deployed to your Firebase project. These rules ensure that users can only access their own data.

## Important Notes

- **Admin SDK Bypasses Rules**: Server-side API routes using Firebase Admin SDK bypass these security rules. This is intentional and appropriate for trusted server-side code.
- **Client-Side Enforcement**: These rules are enforced for all client-side Firebase SDK operations.
- **Authentication Required**: All rules require the user to be authenticated (`request.auth != null`).

## Security Rules

Copy and paste these rules into your Firebase Console under Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own applications
    match /applications/{appId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      
      // Allow creating new applications if userId matches authenticated user
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Subcollections under applications (questionnaire data, uploads, etc.)
    match /applications/{appId}/{document=**} {
      // First check that the parent application belongs to the user
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/applications/$(appId)).data.userId == request.auth.uid;
    }
    
    // User preferences and settings
    match /users/{userId}/preferences/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User drafts (if stored separately)
    match /users/{userId}/drafts/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Zoho data subcollection (server-side only, but allow user to read their own)
    match /users/{userId}/zoho/{document=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      // Write operations should be server-side only (Admin SDK)
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Rule Explanations

### User Profiles (`/users/{userId}`)
- Users can only read and write their own profile document
- The rule checks that `request.auth.uid` matches the `userId` in the document path

### Applications (`/applications/{appId}`)
- Users can only read and write applications where `resource.data.userId` matches their authenticated user ID
- For creating new applications, the rule checks that `request.resource.data.userId` matches the authenticated user
- This ensures users cannot access or modify other users' applications

### Application Subcollections (`/applications/{appId}/{document=**}`)
- Subcollections like `data/questionnaire`, `data/uploads`, etc. are protected
- The rule uses `get()` to fetch the parent application document and verify ownership
- This ensures all nested data under an application is protected

### User Subcollections
- Preferences, drafts, and Zoho data subcollections are protected
- Users can only access their own subcollections

## Deployment Instructions

1. **Open Firebase Console**: Go to [Firebase Console](https://console.firebase.google.com/)
2. **Select Your Project**: Choose the project matching `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
3. **Navigate to Firestore**: Click on "Firestore Database" in the left sidebar
4. **Open Rules Tab**: Click on the "Rules" tab at the top
5. **Paste Rules**: Copy the rules from above and paste them into the editor
6. **Publish**: Click "Publish" to deploy the rules

## Testing Rules

You can test these rules using the Firebase Console Rules Playground:

1. Go to Firestore → Rules → Rules Playground
2. Test scenarios:
   - User reading their own profile: Should succeed
   - User reading another user's profile: Should fail
   - User creating an application with their userId: Should succeed
   - User creating an application with another userId: Should fail
   - User reading their own applications: Should succeed
   - User reading another user's applications: Should fail

## Troubleshooting

### "Missing or insufficient permissions" Error

If you see this error:

1. **Check Authentication**: Ensure the user is properly authenticated
   - Verify `request.auth != null` in the rules
   - Check that Firebase Auth is initialized on the client

2. **Check User ID Match**: Ensure the `userId` in the data matches `request.auth.uid`
   - For applications: `resource.data.userId == request.auth.uid`
   - For user profiles: `request.auth.uid == userId` (from path)

3. **Check Rules Deployment**: Verify rules are published in Firebase Console
   - Rules may take a few seconds to propagate

4. **Server-Side Operations**: If using Admin SDK in API routes, rules are bypassed
   - This is expected behavior
   - Use Admin SDK for server-side operations that need to bypass rules

### Common Issues

- **Rules not updating**: Clear browser cache and wait a few seconds
- **Permission denied on create**: Ensure `request.resource.data.userId` is set correctly
- **Permission denied on subcollections**: Check that parent document ownership is verified

## Security Best Practices

1. **Always validate on server**: Client-side rules can be bypassed, so always validate on the server
2. **Use Admin SDK for API routes**: Server-side API routes should use Admin SDK to bypass rules
3. **Minimize public access**: Only allow public access when absolutely necessary
4. **Test thoroughly**: Use the Rules Playground to test edge cases
5. **Monitor access**: Review Firebase logs for unauthorized access attempts

## Related Files

- `src/lib/firebase-admin.js` - Admin SDK configuration (bypasses rules)
- `src/lib/adapters/firebase.js` - Client-side Firebase adapter (enforces rules)
- `src/lib/firebase-admin-helpers.js` - Server-side helper functions using Admin SDK


