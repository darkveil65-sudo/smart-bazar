/**
 * promote_to_admin.js
 * 
 * Run this script to promote a user account to the 'admin' role in Firestore.
 * 
 * Usage:
 *   node promote_to_admin.js <email>
 * 
 * Example:
 *   node promote_to_admin.js myemail@gmail.com
 * 
 * Requirements:
 *   - A serviceAccountKey.json file in the 'firebase/' folder.
 *     Download it from: Firebase Console → Project Settings → Service Accounts
 */

const admin = require('firebase-admin');
const path = require('path');

const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Please provide an email address.');
  console.error('   Usage: node promote_to_admin.js <email>');
  process.exit(1);
}

const serviceAccountPath = path.join(__dirname, 'firebase', 'serviceAccountKey.json');

if (!require('fs').existsSync(serviceAccountPath)) {
  console.error('❌ Error: firebase/serviceAccountKey.json not found.');
  console.error('   1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('   2. Click "Generate new private key"');
  console.error('   3. Save the downloaded file as: firebase/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();
const auth = admin.auth();

async function promoteToAdmin(emailToPromote) {
  console.log(`\n🔍 Looking up user: ${emailToPromote}`);
  
  try {
    // Look up the user by email via Firebase Auth
    const userRecord = await auth.getUserByEmail(emailToPromote);
    const uid = userRecord.uid;
    console.log(`✅ Found user: ${uid}`);

    // Update their role in Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create a new document if one doesn't exist
      await userRef.set({
        name: userRecord.displayName || emailToPromote.split('@')[0],
        email: emailToPromote,
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      console.log(`✅ Created new user document with role: 'admin'`);
    } else {
      const oldRole = userDoc.data().role;
      await userRef.update({ role: 'admin' });
      console.log(`✅ Updated role from '${oldRole}' → 'admin'`);
    }

    console.log(`\n🎉 Success! ${emailToPromote} is now an Admin.`);
    console.log(`   They can now log in at: http://localhost:3002`);
    
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ No user found with email: ${emailToPromote}`);
      console.error('   Make sure the user has signed up in the Customer app first.');
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

promoteToAdmin(email);
