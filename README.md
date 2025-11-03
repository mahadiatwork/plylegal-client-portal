# Ply Legal - Client Portal

A comprehensive legal immigration case management portal with multi-step intake wizards, Firebase authentication, and bidirectional Zoho CRM synchronization.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Authentication System](#authentication-system)
- [Bidirectional Sync System](#bidirectional-sync-system)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Questionnaire System](#questionnaire-system)
- [File Structure](#file-structure)
- [Development Setup](#development-setup)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
Ply Legal Client Portal streamlines the immigration application process by providing:
- **Multi-step intake wizards** for different visa types
- **Mobile-first responsive design** for accessibility
- **Automated data sync** between client portal and CRM
- **Secure authentication** with password management
- **Real-time data validation** and progress tracking

### Key Features
- ✅ Firebase Authentication with forced password change on first login
- ✅ Bidirectional sync between Firebase and Zoho CRM
- ✅ Protection Visa questionnaire (18 pages)
- ✅ Temporary Work Visa questionnaire (18 pages)
- ✅ User profile management with dependencies tracking
- ✅ Application workspace with 8-tab interface
- ✅ Timestamp-based conflict resolution
- ✅ Webhook-based real-time synchronization

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: Valtio
- **Form Handling**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS with custom theme
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Authentication**: Firebase Auth
- **Database**: Firestore (Firebase)
- **CRM Integration**: Zoho CRM API v7
- **HTTP Client**: Axios

### External Services
- **Firebase**: Authentication, Firestore database, Admin SDK
- **Zoho CRM**: Contact management, workflow automation
- **Replit**: Hosting and deployment platform

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT PORTAL                             │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Next.js     │  │   Valtio     │  │  React Hook Form    │  │
│  │  App Router   │  │ State Store  │  │   + Zod Schema      │  │
│  └───────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js Routes)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  /api/auth   │  │ /api/profile │  │  /api/admin        │   │
│  │  /verify-zoho│  │  /sync-zoho  │  │  /create-user      │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/webhooks/zoho-contact-update                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   Firebase Services      │   │    Zoho CRM API v7       │
│  ┌──────────────────┐   │   │  ┌──────────────────┐   │
│  │  Authentication  │   │   │  │    Contacts      │   │
│  │  (Auth SDK)      │   │   │  │    Workflows     │   │
│  └──────────────────┘   │   │  └──────────────────┘   │
│  ┌──────────────────┐   │   │  ┌──────────────────┐   │
│  │    Firestore     │◄──┼───┼─►│   Webhooks       │   │
│  │   (Database)     │   │   │  │  (Bidirectional) │   │
│  └──────────────────┘   │   │  └──────────────────┘   │
└──────────────────────────┘   └──────────────────────────┘
```

### Frontend Architecture

**Next.js App Router Structure:**
```
app/layout.js (Root Layout)
└── Providers (Client Component)
    ├── QueryClientProvider (TanStack Query)
    ├── ThemeProvider (Dark/Light mode)
    └── AuthGuard (Authentication check)
        └── Page Routes
            ├── /login - Firebase authentication
            ├── /change-password - Forced password change
            ├── /profile - User profile with dependencies
            ├── /applications - Application list
            └── /intake/[visaType]/* - Questionnaire pages
                ├── /intake/partner/* - Partner visa pages
                ├── /intake/protection/* - Protection visa pages
                └── /intake/temporary-work/* - Temporary work visa pages
```

**Client Component Providers (`app/providers.jsx`):**
```javascript
export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ply-theme">
        <AuthGuard>
          {children}
        </AuthGuard>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

**State Management (Valtio Proxy Stores):**
```javascript
// src/stores/authStore.js
authStore = proxy({
  user: null,                    // Firebase Auth user
  userProfile: null,             // Firestore profile doc
  isAuthenticated: false,
  
  // Methods
  async login(credentials),
  async logout(),
  async checkSession(),
  async updateProfile(data)
})

// src/stores/applicationsStore.js
applicationsStore = proxy({
  applications: [],              // User's applications
  currentApplication: null,
  loading: false,
  
  // Methods
  async loadApplications(userId),
  async createApplication(data),
  async updateApplication(id, data)
})
```

**Database Adapter Pattern:**
The application uses an adapter pattern (`src/lib/adapters/`) to support multiple backends:
- **Firebase Adapter** (production) - Firestore + Firebase Auth
- **LocalStorage Adapter** (development/demo) - Browser storage

Adapter is selected via `getAdapter()` based on environment configuration.

### Backend Architecture

**API Routes Structure:**
```
app/api/
├── auth/
│   └── check/route.js          # Verify authentication status
├── profile/
│   └── sync-zoho/route.js      # Sync Firebase → Zoho
├── admin/
│   └── create-user/route.js    # Zoho → Firebase user creation
└── webhooks/
    └── zoho-contact-update/route.js  # Zoho → Firebase sync
```

---

## Authentication System

### User Creation Flow (Zoho → Firebase)

```
┌──────────────┐
│  Zoho CRM    │
│  (Admin)     │
└──────┬───────┘
       │ 1. Contact Created
       ▼
┌──────────────────────────────────────────┐
│  Zoho Workflow Trigger                   │
│  POST /api/admin/create-user             │
│  Headers: Authorization: Bearer SECRET   │
└──────┬───────────────────────────────────┘
       │ 2. Create Firebase User
       ▼
┌──────────────────────────────────────────┐
│  Firebase Admin SDK                      │
│  - createUser(email, tempPassword)       │
│  - Store profile in Firestore            │
│  - Set needsPasswordChange: true         │
└──────┬───────────────────────────────────┘
       │ 3. Send Email (Zoho Workflow)
       ▼
┌──────────────────────────────────────────┐
│  User Receives Email                     │
│  - Login credentials                     │
│  - Temporary password                    │
└──────┬───────────────────────────────────┘
       │ 4. First Login
       ▼
┌──────────────────────────────────────────┐
│  AuthGuard Middleware                    │
│  - Checks needsPasswordChange flag       │
│  - Redirects to /change-password         │
└──────┬───────────────────────────────────┘
       │ 5. Change Password
       ▼
┌──────────────────────────────────────────┐
│  /change-password Page                   │
│  - Updates Firebase Auth password        │
│  - Clears needsPasswordChange flag       │
│  - Redirects to /applications            │
└──────────────────────────────────────────┘
```

### Authentication Components

**AuthGuard (src/components/AuthGuard.jsx)**
```javascript
// Priority order:
1. Loading state → Show spinner
2. Not authenticated → Redirect to /login
3. needsPasswordChange === true → Redirect to /change-password
4. Authenticated → Render children
```

**Password Change Flow:**
```javascript
// User submits new password
→ Validate: new password !== current password
→ updatePassword(auth.currentUser, newPassword)
→ Update Firestore: { needsPasswordChange: false }
→ Reload user profile
→ Redirect to /applications
```

---

## Bidirectional Sync System

### Overview
The sync system maintains data consistency between Firebase (client portal) and Zoho CRM (admin system) using webhooks and timestamp-based conflict resolution.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE (Source of Truth for Users)      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  User Profile Document                                │  │
│  │  - firstName, lastName, email, phone                  │  │
│  │  - streetAddress, suburb, state, postcode, country    │  │
│  │  - dependencies: []                                   │  │
│  │  - zohoContactId: string                              │  │
│  │  - syncSource: 'user' | 'zoho'                        │  │
│  │  - updatedAt: ISO timestamp                           │  │
│  │  - zohoSyncedAt: ISO timestamp                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ▲                │
                           │                │
        ┌──────────────────┘                └─────────────────┐
        │                                                      │
        │ Zoho→Firebase                       Firebase→Zoho   │
        │ (Webhook)                           (API Call)      │
        │                                                      │
┌───────┴──────────────────────────────────────────────────┬──▼──┐
│                    ZOHO CRM (Admin System)               │     │
│  ┌──────────────────────────────────────────────────┐   │     │
│  │  Contact Record                                   │   │     │
│  │  - First_Name, Last_Name, Email, Phone            │   │     │
│  │  - Mailing_Street, City, State, Zip, Country      │   │     │
│  │  - Description (dependencies as formatted text)   │   │     │
│  │  - Last_Firebase_Sync: ISO timestamp              │◄──┘     │
│  └──────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

### Sync Direction 1: Firebase → Zoho

**Trigger:** User saves profile in client portal

**Endpoint:** `POST /api/profile/sync-zoho`

**Flow:**
```javascript
1. User submits profile form
   ↓
2. Save to Firestore (authStore.updateProfile)
   {
     firstName, lastName, phone, address,
     dependencies: [],
     updatedAt: new Date().toISOString(),
     syncSource: 'user'
   }
   ↓
3. Call /api/profile/sync-zoho
   ↓
4. Check syncSource flag
   if (syncSource === 'zoho') {
     // Skip to prevent infinite loop
     return { skipped: true }
   }
   ↓
5. Search Zoho for existing contact by email
   zohoClient.findContactByEmail(email)
   ↓
6. Prepare contact data
   {
     First_Name, Last_Name, Email, Phone,
     Mailing_Street, Mailing_City, Mailing_State,
     Mailing_Zip, Mailing_Country,
     Description: "Dependencies:\n1. John Doe...",
     Last_Firebase_Sync: new Date().toISOString()
   }
   ↓
7. Create or Update in Zoho
   if (existingContact) {
     zohoClient.updateRecord('Contacts', id, data)
   } else {
     zohoClient.createRecord('Contacts', data)
   }
```

**Loop Prevention:**
- `syncSource` flag set to 'zoho' when update comes from Zoho webhook
- Firebase → Zoho sync skips if `syncSource === 'zoho'`

### Sync Direction 2: Zoho → Firebase

**Trigger:** Admin updates contact in Zoho CRM

**Endpoint:** `POST /api/webhooks/zoho-contact-update`

**Authentication:** `Authorization: Bearer ZOHO_WEBHOOK_SECRET`

**Flow:**
```javascript
1. Admin updates contact in Zoho CRM
   ↓
2. Zoho workflow fires webhook
   POST /api/webhooks/zoho-contact-update
   Headers: { Authorization: "Bearer SECRET" }
   Body: {
     contactId, email, firstName, lastName,
     phone, address fields,
     dependencies: "formatted text",
     lastFirebaseSync: "2025-11-03T10:00:00Z"  // ← CRITICAL
   }
   ↓
3. Validate webhook secret
   if (authHeader !== `Bearer ${ZOHO_WEBHOOK_SECRET}`) {
     return 401 Unauthorized
   }
   ↓
4. Find user by zohoContactId
   usersRef.where('zohoContactId', '==', contactId).get()
   ↓
5. CONFLICT RESOLUTION CHECK
   const zohoKnowsAbout = new Date(lastFirebaseSync)
   const firebaseLastUpdated = new Date(currentData.updatedAt)
   
   if (firebaseLastUpdated > zohoKnowsAbout) {
     // Firebase has local changes since Zoho last synced
     // Reject this update to preserve Firebase data
     return { skipped: true, reason: 'Conflict detected' }
   }
   ↓
6. Parse dependencies from formatted text
   "1. John Doe - Spouse - DOB: 1990-01-15..."
   → Extract into array of objects
   ↓
7. Update Firestore
   userRef.set({
     firstName, lastName, phone, address,
     dependencies: parsedArray,
     zohoContactId: contactId,
     syncSource: 'zoho',  // ← Prevents sync back to Zoho
     zohoSyncedAt: new Date().toISOString(),
     updatedAt: new Date().toISOString()
   }, { merge: true })
```

### Conflict Resolution Strategy

**Last-Write-Wins using Timestamps**

The system uses two critical timestamps:
1. **`Last_Firebase_Sync`** (in Zoho) - When Firebase last pushed data to Zoho
2. **`updatedAt`** (in Firebase) - When Firebase data was last modified

**Decision Logic:**
```javascript
// When Zoho webhook arrives with update:
const zohoKnowsAbout = lastFirebaseSync  // What Zoho knows
const firebaseActual = updatedAt          // What Firebase has

if (firebaseActual > zohoKnowsAbout) {
  // Firebase has changes that Zoho hasn't seen yet
  // REJECT Zoho update to preserve local changes
  return { skipped: true }
} else {
  // Zoho has the latest data
  // ACCEPT Zoho update and refresh zohoSyncedAt
  update(data)
}
```

**Example Scenario:**
```
10:00 AM - User creates profile in Firebase
10:01 AM - Firebase syncs to Zoho (Last_Firebase_Sync = 10:01)
10:05 AM - User edits phone in Firebase (updatedAt = 10:05)
10:10 AM - Admin edits address in Zoho
10:11 AM - Zoho webhook fires with lastFirebaseSync = 10:01

Decision:
  firebaseActual (10:05) > zohoKnowsAbout (10:01)
  → REJECT: Firebase has local changes at 10:05
  → Admin sees error: "Conflict - Firebase has newer data"

Resolution:
  Admin needs to sync from Firebase first to see latest data
  Then make changes in Zoho
```

### Security

**Webhook Authentication:**
```javascript
// All webhook endpoints require shared secret
const authHeader = request.headers.get('Authorization')
const expectedSecret = process.env.ZOHO_WEBHOOK_SECRET

if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Required Secrets:**
- `ZOHO_WEBHOOK_SECRET` - Shared secret for webhook validation
- Must be configured in both Replit and Zoho workflow

---

## Data Models

### User Profile (Firestore: `users/{userId}`)

```javascript
{
  // Personal Information
  email: string,              // Firebase Auth email
  firstName: string,
  lastName: string,
  fullName: string,           // Computed: firstName + lastName
  phone: string,
  mobile: string,
  
  // Address
  streetAddress: string,
  suburb: string,
  state: string,
  postcode: string,
  country: string,
  
  // Dependencies (family members)
  dependencies: [
    {
      firstName: string,
      lastName: string,
      relationship: string,    // "Spouse", "Child", etc.
      dateOfBirth: string,     // ISO date
      citizenship: string
    }
  ],
  
  // Authentication Metadata
  needsPasswordChange: boolean,  // Force password change on first login
  
  // Sync Metadata
  zohoContactId: string,         // Link to Zoho CRM Contact
  syncSource: 'user' | 'zoho',   // Where last update came from
  updatedAt: string,             // ISO timestamp
  zohoSyncedAt: string,          // When last synced from Zoho
  
  // Timestamps
  createdAt: string,             // ISO timestamp
}
```

### Application (Firestore: `applications/{appId}`)

```javascript
{
  // Core Fields
  id: string,                    // Auto-generated
  userId: string,                // Foreign key to users collection
  visaType: string,              // "partner" | "protection" | "temporary-work"
  status: string,                // "draft" | "pending" | "under_review" | "approved" | "rejected"
  
  // Questionnaire Data (nested by visa type and page)
  // Example for Partner Visa:
  partner_main_applicant_details: { name, dob, gender, ... },
  partner_main_applicant_other: { otherNames: [], ... },
  partner_main_applicant_identity: { passport, citizenship, ... },
  // ... (all partner visa pages)
  
  // Example for Protection Visa:
  protection_main_applicant_details: { ... },
  protection_main_applicant_employment: { currentJob, history: [], ... },
  // ... (all protection visa pages)
  
  // Example for Temporary Work Visa:
  temporary_work_main_applicant_details: { ... },
  temporary_work_all_applicants_health: { conditions: [], insurance, ... },
  // ... (all temporary work visa pages)
  
  // Timestamps
  createdAt: string,
  updatedAt: string,
  submittedAt: string | null,
}
```

### Zoho CRM Contact

```javascript
{
  // Standard Zoho Fields
  id: string,                    // Zoho Contact ID
  First_Name: string,
  Last_Name: string,
  Email: string,
  Phone: string,
  Mobile: string,
  
  // Mailing Address
  Mailing_Street: string,
  Mailing_City: string,
  Mailing_State: string,
  Mailing_Zip: string,
  Mailing_Country: string,
  
  // Custom Fields
  Description: string,           // Dependencies as formatted text
  Last_Firebase_Sync: string,    // ISO timestamp - CRITICAL for conflict resolution
  
  // Zoho Metadata
  Created_Time: string,
  Modified_Time: string,
  Owner: { id, name },
}
```

---

## API Endpoints

### Authentication & Verification

#### `POST /api/auth/verify-zoho`
**Purpose:** Verify if email exists in Zoho CRM before allowing login

**Authentication:** None (public endpoint)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "zohoContact": {
    "id": "1234567890123456789",
    "Email": "user@example.com",
    "First_Name": "John",
    "Last_Name": "Doe"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "Access denied: Email not found in client database",
  "errorCode": "NOT_IN_ZOHO"
}
```

**Logic:**
1. Extract email from request body
2. Query Zoho CRM for contact by email
3. Return contact if found, error if not
4. Used during login to verify user is authorized

---

#### `POST /api/admin/create-user`
**Purpose:** Create Firebase user from Zoho workflow

**Authentication:** `Authorization: Bearer ZOHO_WEBHOOK_SECRET`

**Request:**
```json
{
  "email": "user@example.com",
  "tempPassword": "TempPass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+61400000000",
  "mobile": "+61400000000",
  "mailingStreet": "123 Main St",
  "mailingCity": "Sydney",
  "mailingState": "NSW",
  "mailingZip": "2000",
  "mailingCountry": "Australia",
  "zohoContactId": "1234567890123456789"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "firebaseUserId123",
  "message": "User created successfully"
}
```

**Logic:**
1. Validate shared secret
2. Check if user exists by email
3. Create Firebase Auth user with temp password
4. Create Firestore profile with `needsPasswordChange: true`
5. Link to Zoho contact via `zohoContactId`

---

### Profile Management

#### `POST /api/profile/sync-zoho`
**Purpose:** Sync Firebase profile to Zoho CRM

**Authentication:** Firebase Auth (client-side)

**Request:**
```json
{
  "userId": "firebaseUserId",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+61400000000",
  "streetAddress": "123 Main St",
  "suburb": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "Australia",
  "dependencies": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "relationship": "Spouse",
      "dateOfBirth": "1990-01-15",
      "citizenship": "Australia"
    }
  ],
  "syncSource": "user"
}
```

**Response:**
```json
{
  "success": true,
  "action": "updated",
  "contactId": "1234567890123456789",
  "message": "Contact updated successfully in Zoho CRM"
}
```

**Logic:**
1. Check `syncSource` - skip if from Zoho (loop prevention)
2. Search Zoho for contact by email
3. Format dependencies as text
4. Create or update Zoho contact
5. Set `Last_Firebase_Sync` timestamp

---

### Webhooks

#### `POST /api/webhooks/zoho-contact-update`
**Purpose:** Sync Zoho contact changes to Firebase

**Authentication:** `Authorization: Bearer ZOHO_WEBHOOK_SECRET`

**Request:**
```json
{
  "contactId": "1234567890123456789",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+61400000000",
  "mobile": "+61400000000",
  "mailingStreet": "123 Main St",
  "mailingCity": "Sydney",
  "mailingState": "NSW",
  "mailingZip": "2000",
  "mailingCountry": "Australia",
  "dependencies": "1. Jane Doe - Spouse - DOB: 1990-01-15 - Citizenship: Australia",
  "lastFirebaseSync": "2025-11-03T10:00:00Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User profile synced from Zoho to Firebase"
}
```

**Response (Conflict):**
```json
{
  "success": true,
  "skipped": true,
  "reason": "Firebase has newer data - conflict detected",
  "firebaseTimestamp": "2025-11-03T10:05:00Z",
  "zohoTimestamp": "2025-11-03T10:00:00Z"
}
```

**Logic:**
1. Validate webhook secret
2. Find user by `zohoContactId`
3. **Conflict check:** Compare `lastFirebaseSync` vs `updatedAt`
4. Parse dependencies from formatted text
5. Update Firestore with `syncSource: 'zoho'`
6. Update `zohoSyncedAt` timestamp

---

## Questionnaire System

### Visa Types

The application supports multiple visa types, each with its own multi-page questionnaire:

1. **Partner Visa** - 13+ pages
2. **Protection Visa** - 18 pages
3. **Temporary Work Visa (482)** - 18 pages

### Route Configuration

**File:** `src/lib/routes.js`

The application uses hierarchical route objects with `href` and `title` properties:

```javascript
export const TEMPORARY_WORK_VISA_ROUTES = [
  { href: "/intake/temporary-work/start", title: "Getting Started" },
  {
    href: "/intake/temporary-work/main-applicant/details",
    title: "Main Applicant",
    subpages: [
      { href: "/intake/temporary-work/main-applicant/details", title: "Details" },
      { href: "/intake/temporary-work/main-applicant/other", title: "Other" },
      { href: "/intake/temporary-work/main-applicant/identity", title: "Identity" },
      { href: "/intake/temporary-work/main-applicant/employment", title: "Employment" },
      { href: "/intake/temporary-work/main-applicant/education", title: "Education" },
      { href: "/intake/temporary-work/main-applicant/skills", title: "Skills" },
      { href: "/intake/temporary-work/main-applicant/language", title: "Language" },
    ],
  },
  {
    href: "/intake/temporary-work/spouse-partner/details",
    title: "Spouse/Partner",
    subpages: [
      { href: "/intake/temporary-work/spouse-partner/details", title: "Details" },
      { href: "/intake/temporary-work/spouse-partner/other-details", title: "Other Details" },
    ],
  },
  { href: "/intake/temporary-work/children", title: "Children" },
  { href: "/intake/temporary-work/relationships", title: "Relationships" },
  {
    href: "/intake/temporary-work/all-applicants/addresses",
    title: "All Applicants",
    subpages: [
      { href: "/intake/temporary-work/all-applicants/addresses", title: "Addresses" },
      { href: "/intake/temporary-work/all-applicants/contact-details", title: "Contact Details" },
      { href: "/intake/temporary-work/all-applicants/visas", title: "Visas" },
      { href: "/intake/temporary-work/all-applicants/travel-history", title: "Travel History" },
      { href: "/intake/temporary-work/all-applicants/health", title: "Health" },
      { href: "/intake/temporary-work/all-applicants/character", title: "Character" },
    ],
  },
  { href: "/intake/temporary-work/submit", title: "Submit" },
];

// Protection and Partner visa routes follow the same structure
export const PROTECTION_VISA_ROUTES = [ /* Similar structure */ ];
export const PARTNER_VISA_ROUTES = [ /* Similar structure */ ];
```

**Helper Functions:**
```javascript
// Get routes for a specific visa type
getIntakeRoutes(visaType) // Returns route array for 'partner', 'protection', or 'temporary-work'

// Navigation helpers
getNextRoute(currentHref, visaType, applicationId)
getPreviousRoute(currentHref, visaType, applicationId)

// Progress tracking
calculateProgress(currentHref, visaType) // Returns 0-100
```

### Page Structure

Each questionnaire page follows this structure:

**File:** `app/intake/[visaType]/[section]/[page]/page.js`

Example paths:
- `/intake/partner/main-applicant/details/page.js`
- `/intake/protection/all-applicants/health/page.js`
- `/intake/temporary-work/children/page.js`

```javascript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import QuestionnaireLayout from "@/components/QuestionnaireLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { getNextRoute, getPreviousRoute } from "@/lib/routes";

export default function PageName() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    // Field definitions
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load data from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      const docRef = doc(db, "applications", params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          field1: data.visa_type_section_field1 || "",
          // ...
        });
      }
    };
    loadData();
  }, [params.id]);

  // Save data to Firebase
  const handleSave = async () => {
    setIsSaving(true);
    const docRef = doc(db, "applications", params.id);
    await setDoc(docRef, {
      visa_type_section_field1: formData.field1,
      // ...
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    setIsSaving(false);
  };

  // Navigation
  const handleNext = async () => {
    await handleSave();
    const nextRoute = getNextRoute(currentVisaType, currentPath);
    router.push(`/applications/${params.id}/${nextRoute.path}`);
  };

  const handlePrevious = () => {
    const prevRoute = getPreviousRoute(currentVisaType, currentPath);
    router.push(`/applications/${params.id}/${prevRoute.path}`);
  };

  return (
    <QuestionnaireLayout
      title="Page Title"
      description="Page description"
      onNext={handleNext}
      onPrevious={handlePrevious}
      showPrevious={true}
      isLoading={isSaving}
    >
      <Card className="p-6">
        {/* Form fields */}
      </Card>
    </QuestionnaireLayout>
  );
}
```

### Data Persistence

**Storage Pattern:**
- Each page saves to a specific key in the application document
- Key format: `{visaType}_{section}_{field}`
- Example: `temporary_work_main_applicant_details`

**Save Timing:**
- Auto-save on "Next" button click
- Manual save available via "Save Draft" button
- All saves use Firebase `setDoc` with `{ merge: true }`

### Repeater Tables

Complex sections use repeater tables for dynamic arrays:

**Component:** `src/components/RepeaterTable.jsx`

**Usage:**
```javascript
<RepeaterTable
  data={formData.employmentHistory}
  onChange={(newData) => handleChange('employmentHistory', newData)}
  columns={[
    { key: 'employer', label: 'Employer', type: 'text' },
    { key: 'position', label: 'Position', type: 'text' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
  ]}
  addButtonText="Add Employment"
/>
```

---

## File Structure

```
ply-legal-client-portal/
│
├── app/                          # Next.js App Router
│   ├── layout.js                 # Root layout with providers
│   ├── page.js                   # Home/landing page
│   │
│   ├── login/
│   │   └── page.js               # Login page (Firebase Auth)
│   │
│   ├── change-password/
│   │   └── page.js               # Forced password change
│   │
│   ├── profile/
│   │   └── page.js               # User profile with dependencies
│   │
│   ├── applications/
│   │   ├── page.js               # Application list
│   │   └── [id]/
│   │       ├── page.js           # Application workspace (8 tabs)
│   │       ├── start/
│   │       │   └── page.js       # Visa type selection
│   │       ├── temporary-work/   # Temporary Work Visa pages
│   │       │   ├── main-applicant/
│   │       │   │   ├── details/
│   │       │   │   ├── other/
│   │       │   │   ├── identity/
│   │       │   │   ├── employment/
│   │       │   │   ├── education/
│   │       │   │   ├── skills/
│   │       │   │   └── language/
│   │       │   ├── spouse/
│   │       │   │   ├── details/
│   │       │   │   └── other-details/
│   │       │   ├── children/
│   │       │   ├── relationships/
│   │       │   └── all-applicants/
│   │       │       ├── addresses/
│   │       │       ├── contact-details/
│   │       │       ├── visas/
│   │       │       ├── travel-history/
│   │       │       ├── health/
│   │       │       └── character/
│   │       ├── protection/        # Protection Visa pages (same structure)
│   │       └── submit/
│   │           └── page.js        # Final submission
│   │
│   └── api/                       # API Routes
│       ├── auth/
│       │   └── check/route.js
│       ├── profile/
│       │   └── sync-zoho/route.js
│       ├── admin/
│       │   └── create-user/route.js
│       └── webhooks/
│           └── zoho-contact-update/route.js
│
├── src/
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── AppSidebar.jsx
│   │   ├── AppHeader.jsx
│   │   ├── AuthGuard.jsx
│   │   ├── QuestionnaireLayout.jsx
│   │   └── RepeaterTable.jsx
│   │
│   ├── stores/                   # Valtio state stores
│   │   ├── authStore.js
│   │   └── applicationStore.js
│   │
│   ├── lib/                      # Utilities
│   │   ├── firebase.js           # Firebase client config
│   │   ├── firebase-admin.js     # Firebase Admin SDK
│   │   ├── zohoClient.js         # Zoho CRM API client
│   │   └── routes.js             # Questionnaire routes
│   │
│   └── hooks/                    # Custom React hooks
│       └── use-toast.js
│
├── public/                       # Static assets
│
├── .env.local                    # Environment variables
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── package.json
└── README.md                     # This file
```

---

## Development Setup

### Prerequisites
- Node.js 18+ installed
- Firebase project created
- Zoho CRM account with API access
- Replit account (for deployment)

### Step 1: Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd ply-legal-client-portal

# Install dependencies
npm install
```

### Step 2: Firebase Setup

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Authentication (Email/Password provider)
   - Enable Firestore Database

2. **Get Firebase Credentials:**
   
   **Client SDK (Public):**
   - Project Settings → General → Your apps → Web app
   - Copy configuration object
   
   **Admin SDK (Private):**
   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download JSON file

3. **Configure Firestore Rules:**
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
       }
     }
   }
   ```

### Step 3: Zoho CRM Setup

1. **Create Zoho Function for Access Token:**
   - Go to Zoho CRM → Setup → Developer Space → Functions
   - Create new function that returns access token
   - Deploy and get function URL

2. **Create Custom Field in Contacts:**
   - Setup → Customization → Modules → Contacts → Fields
   - Add custom field: `Last_Firebase_Sync` (DateTime)

3. **Configure Webhooks** (see Deployment section)

### Step 4: Environment Variables

Create `.env.local` file:

```bash
# Firebase Client SDK (Public - prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Private - JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Zoho CRM
ZOHO_ACCESS_TOKEN_URL=https://your-zoho-function-url
ZOHO_WEBHOOK_SECRET=your_random_secret_string_here

# Next.js (Optional)
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

**Generate Webhook Secret:**
```bash
# Use a random string generator
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Run Development Server

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

### Step 6: Test the System

1. **Create Test User in Zoho:**
   - Create contact in Zoho CRM
   - Trigger user creation workflow
   - Check Firebase Auth console for new user

2. **Test Login:**
   - Use credentials from Zoho email
   - Verify password change redirect
   - Change password successfully

3. **Test Profile Sync:**
   - Edit profile in client portal
   - Check Zoho CRM for updated contact
   - Edit contact in Zoho
   - Check Firebase for updated profile

---

## Deployment

### Replit Deployment

1. **Create Replit Project:**
   - Import from GitHub
   - Select Node.js template

2. **Configure Secrets:**
   - Go to Tools → Secrets
   - Add all environment variables from `.env.local`

3. **Configure Workflow:**
   - Command: `npm run dev`
   - Auto-restart: Enabled

4. **Deploy:**
   - Click "Run"
   - Note your Replit URL: `https://your-app.replit.app`

### Zoho Webhook Configuration

#### Webhook 1: User Creation

**Trigger:** Contact Created in Zoho CRM

**Configuration:**
```
URL: https://your-app.replit.app/api/admin/create-user
Method: POST
Headers:
  Authorization: Bearer YOUR_ZOHO_WEBHOOK_SECRET
  Content-Type: application/json

Body:
{
  "email": "${Contact.Email}",
  "tempPassword": "GeneratedPassword123!",
  "firstName": "${Contact.First_Name}",
  "lastName": "${Contact.Last_Name}",
  "phone": "${Contact.Phone}",
  "mobile": "${Contact.Mobile}",
  "mailingStreet": "${Contact.Mailing_Street}",
  "mailingCity": "${Contact.Mailing_City}",
  "mailingState": "${Contact.Mailing_State}",
  "mailingZip": "${Contact.Mailing_Zip}",
  "mailingCountry": "${Contact.Mailing_Country}",
  "zohoContactId": "${Contact.id}"
}

Follow-up Action:
  Send email to ${Contact.Email} with temporary password
```

#### Webhook 2: Contact Update

**Trigger:** Contact Updated in Zoho CRM  
**Fields to Monitor:** First_Name, Last_Name, Phone, Mobile, Mailing_Street, Mailing_City, Mailing_State, Mailing_Zip, Mailing_Country, Description

**Configuration:**
```
URL: https://your-app.replit.app/api/webhooks/zoho-contact-update
Method: POST
Headers:
  Authorization: Bearer YOUR_ZOHO_WEBHOOK_SECRET
  Content-Type: application/json

Body:
{
  "contactId": "${Contact.id}",
  "email": "${Contact.Email}",
  "firstName": "${Contact.First_Name}",
  "lastName": "${Contact.Last_Name}",
  "phone": "${Contact.Phone}",
  "mobile": "${Contact.Mobile}",
  "mailingStreet": "${Contact.Mailing_Street}",
  "mailingCity": "${Contact.Mailing_City}",
  "mailingState": "${Contact.Mailing_State}",
  "mailingZip": "${Contact.Mailing_Zip}",
  "mailingCountry": "${Contact.Mailing_Country}",
  "dependencies": "${Contact.Description}",
  "lastFirebaseSync": "${Contact.Last_Firebase_Sync}"
}
```

### Production Checklist

- [ ] All environment variables configured in Replit Secrets
- [ ] Firebase Firestore rules deployed
- [ ] Zoho CRM custom field `Last_Firebase_Sync` created
- [ ] Zoho webhook #1 (user creation) configured and tested
- [ ] Zoho webhook #2 (contact update) configured and tested
- [ ] Webhook secret matches in both Replit and Zoho
- [ ] Test user creation flow end-to-end
- [ ] Test bidirectional sync (Firebase → Zoho → Firebase)
- [ ] Test conflict resolution scenario
- [ ] Verify email notifications from Zoho

---

## Troubleshooting

### Zoho Sync Not Working

**Symptoms:** Profile updates in Firebase don't appear in Zoho

**Diagnosis:**
```bash
# Check server logs in Replit
# Look for errors in /api/profile/sync-zoho

# Common issues:
1. Invalid Zoho access token
2. Wrong Zoho API region (.com.au vs .com)
3. Field name mismatch in Zoho CRM
4. Rate limiting
```

**Solutions:**
1. **Test Access Token:**
   ```javascript
   // Add to /api/profile/sync-zoho
   const token = await zohoClient.getAccessToken()
   console.log('Token:', token)
   ```

2. **Verify Zoho Region:**
   - Check `src/lib/zohoClient.js`
   - Update `baseURL` if needed:
     - Australia: `https://www.zohoapis.com.au/crm/v7`
     - US: `https://www.zohoapis.com/crm/v7`
     - EU: `https://www.zohoapis.eu/crm/v7`

3. **Test Zoho API Manually:**
   ```bash
   curl -X GET "https://www.zohoapis.com.au/crm/v7/Contacts/search?criteria=(Email:equals:test@example.com)" \
     -H "Authorization: Zoho-oauthtoken YOUR_TOKEN"
   ```

### Firebase → Zoho Sync Fails

**Check these:**
1. Is `syncSource` set correctly? (should be 'user', not 'zoho')
2. Does user have `zohoContactId` in profile?
3. Are dependencies formatted correctly?
4. Check Zoho API response in logs

### Zoho → Firebase Sync Fails

**Common causes:**
1. **Missing `lastFirebaseSync` in webhook payload**
   - Update Zoho webhook to include `${Contact.Last_Firebase_Sync}`

2. **Webhook secret mismatch**
   - Verify `ZOHO_WEBHOOK_SECRET` in Replit matches Zoho header

3. **User not found**
   - Ensure `zohoContactId` is saved when user is created

### Password Change Not Working

**Check:**
1. `needsPasswordChange` flag in Firestore
2. AuthGuard redirect logic
3. Firebase Auth errors in console

### Dependencies Not Syncing

**Format Check:**
```javascript
// Firebase format (array):
dependencies: [
  {
    firstName: "John",
    lastName: "Doe",
    relationship: "Spouse",
    dateOfBirth: "1990-01-15",
    citizenship: "Australia"
  }
]

// Zoho format (formatted text):
Description: "Dependencies:\n1. John Doe - Spouse - DOB: 1990-01-15 - Citizenship: Australia"
```

**Parsing Issues:**
- Check regex in `/api/webhooks/zoho-contact-update`
- Verify exact format in Zoho Description field

---

## Support & Contribution

### Getting Help
- Check Replit logs for errors
- Review Firebase Console for auth/database issues
- Test Zoho webhooks in Zoho CRM → Setup → Webhooks → History

### Key Contact Points
- Firebase: Authentication, Firestore database
- Zoho CRM: Contact management, webhooks
- Replit: Hosting, deployment, secrets management

---

## License

Proprietary - Ply Legal

---

**Last Updated:** November 3, 2025  
**Version:** 1.0.0  
**Maintained by:** Development Team
