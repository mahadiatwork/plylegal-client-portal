/**
 * One-time backfill script — sets publicReviewAccess: true on every document
 * in the Firestore `applications` collection.
 *
 * HOW TO RUN
 * ----------
 * 1. Download a Firebase service-account key:
 *    Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 * 2. Save the downloaded JSON to the repo root as `serviceAccount.json`
 *    (it is already listed in .gitignore — DO NOT commit it)
 * 3. Run:
 *    node scripts/backfill-public-review-access.js
 * 4. After a successful run, delete BOTH this file and serviceAccount.json.
 *
 * The script also warns about any application documents that are missing a
 * `zohoId` field. Those documents can be re-synced from Zoho via the normal
 * login flow (no manual fix needed, just informational).
 */

'use strict';

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '..', 'serviceAccount.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error('❌ Could not load serviceAccount.json from the repo root.');
  console.error('   Expected path:', serviceAccountPath);
  console.error('   Download a service-account key from Firebase Console and place it there.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  console.log('🔍 Fetching all documents in the applications collection...');
  let snap;
  try {
    snap = await db.collection('applications').get();
  } catch (e) {
    console.error('❌ Failed to query applications collection:', e.message);
    process.exit(1);
  }

  console.log(`📋 Found ${snap.size} application(s)`);

  let ok = 0;
  let fail = 0;
  let missingZoho = 0;

  for (const docSnap of snap.docs) {
    try {
      await docSnap.ref.update({ publicReviewAccess: true });
      ok++;

      if (!docSnap.get('zohoId')) {
        missingZoho++;
        console.warn(`  ⚠️  (warn) ${docSnap.id} has no zohoId — re-sync from Zoho via login to fix`);
      }

      console.log(`  ✅ Updated ${ok}/${snap.size}: ${docSnap.id}`);
    } catch (e) {
      fail++;
      console.error(`  ❌ Failed ${docSnap.id}: ${e.message}`);
    }
  }

  console.log('');
  console.log(`Done. ok=${ok}  fail=${fail}  missingZoho=${missingZoho}`);

  if (fail > 0) {
    console.error('⚠️  Some documents failed to update. Re-run the script to retry.');
    process.exit(1);
  }

  process.exit(0);
})();
