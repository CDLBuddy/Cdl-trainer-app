// fix-everything.cjs
const admin = require('firebase-admin');

// === LOAD SERVICE ACCOUNT ===
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// === School ID Map for Legacy/Variants ===
const SCHOOL_IDS_MAP = {
  'CDL Buddy': 'cdlbuddy',
  cdlbuddy: 'cdlbuddy',
  'CDL BUDDY': 'cdlbuddy',
  school001: 'cdlbuddy',
  'Browning Mountain Training': 'browningmountaintraining',
  browningmountaintraining: 'browningmountaintraining',
  'BROWNING MOUNTAIN TRAINING': 'browningmountaintraining',
  school002: 'browningmountaintraining',
  all: 'all',
  // Add more as needed!
};

function schoolSlugify(name = '') {
  if (SCHOOL_IDS_MAP[name]) return SCHOOL_IDS_MAP[name];
  if (!name) return null;
  if (/^school[0-9]+$/i.test(name)) return null;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

async function getAllSchoolSlugs() {
  const schoolsSnap = await db.collection('schools').get();
  const slugs = new Set();
  schoolsSnap.forEach((doc) => {
    let slug = doc.id;
    const data = doc.data();
    // Prefer slugified name if available
    if (data.name) slug = schoolSlugify(data.name);
    slugs.add(slug);
  });
  return slugs;
}

const { FieldValue } = admin.firestore;

// ==== REQUIRED FIELDS PER COLLECTION ====
const REQUIRED_FIELDS = {
  users: {
    schoolId: null,
    assignedSchools: [],
    role: 'student',
    status: 'active',
    active: true,
    profileProgress: 0,
    permissions: [],
    assignedInstructor: '',
    assignedCompany: '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    assignedAt: FieldValue.serverTimestamp(),
    profileCompletedAt: null,
    lastUpdatedBy: '',
    locked: false,
    profilePicUrl: '',
    waiverSigned: false,
    waiverSignature: '',
    termsAcceptedAt: null,
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    paymentStatus: '',
    paymentProofUrl: '',
    // Add more custom business fields here as needed
  },
  userRoles: {
    schoolId: null,
    assignedSchools: [],
    role: 'student',
    status: 'active',
    active: true,
    permissions: [],
    schools: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    assignedAt: FieldValue.serverTimestamp(),
    profileProgress: 0,
    assignedInstructor: '',
    assignedCompany: '',
    profileCompletedAt: null,
    locked: false,
  },
  companies: {
    schoolId: null,
    name: '',
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    contact: '',
  },
  testResults: {
    schoolId: null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  eldtProgress: {
    schoolId: null,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  },
  checklists: {
    schoolId: null,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  },
};

// ==== MAIN FIELD FIXER FOR EACH COLLECTION ====
async function fixCollection(col, fieldMap, schoolSlugs) {
  const snap = await db.collection(col).get();
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    let updateObj = {};

    // ======= Patch missing fields ONLY (non-destructive) =======
    for (const [key, val] of Object.entries(fieldMap)) {
      if (!(key in data) || data[key] === undefined) updateObj[key] = val;

      // ---- Normalize schoolId ----
      if (key === 'schoolId') {
        let newId = data.schoolId;
        // Use mapping first
        if (typeof newId === 'string' && SCHOOL_IDS_MAP[newId]) {
          newId = SCHOOL_IDS_MAP[newId];
        }
        // Slugify if legacy
        if (typeof newId === 'string' && /^school[0-9]+$/i.test(newId)) {
          if (data.name) newId = schoolSlugify(data.name);
        }
        // Try from assignedSchools array if schoolId is missing
        if (
          !newId &&
          Array.isArray(data.assignedSchools) &&
          data.assignedSchools.length
        )
          newId = data.assignedSchools[0];
        // Fallback: null if not found in valid list
        if (newId && !schoolSlugs.has(newId) && newId !== 'all') {
          console.warn(`[${col}] Doc ${doc.id} has orphaned schoolId:`, newId);
          newId = null;
        }
        updateObj.schoolId = newId || val;
      }

      // ---- assignedSchools ----
      if (key === 'assignedSchools') {
        let arr = Array.isArray(data.assignedSchools)
          ? data.assignedSchools
          : [];
        if (data.schoolId && !arr.includes(data.schoolId))
          arr.push(data.schoolId);
        arr = arr.filter(Boolean).map(schoolSlugify);
        updateObj.assignedSchools = Array.from(new Set(arr));
      }
    }

    // Add missing timestamp fields only if not present
    ['createdAt', 'updatedAt', 'assignedAt'].forEach((ts) => {
      if (!data[ts]) updateObj[ts] = FieldValue.serverTimestamp();
    });

    // Add name normalization for companies
    if (col === 'companies' && data.name) {
      updateObj.schoolId = schoolSlugify(data.schoolId || data.name);
    }

    if (Object.keys(updateObj).length) {
      await db.collection(col).doc(doc.id).update(updateObj);
      updated++;
      console.log(`✅ Updated [${col}] ${doc.id}:`, updateObj);
    }
  }
  console.log(`[${col}] Scanned: ${snap.size}  Updated: ${updated}`);
}

// ==== MAIN RUNNER ====
(async function main() {
  const schoolSlugs = await getAllSchoolSlugs();

  for (const [col, fields] of Object.entries(REQUIRED_FIELDS)) {
    await fixCollection(col, fields, schoolSlugs);
  }

  // Audit for orphans
  console.log('\n=== Audit: Users with invalid schoolId ===');
  const userSnap = await db.collection('users').get();
  userSnap.forEach((doc) => {
    const data = doc.data();
    if (
      data.schoolId &&
      !schoolSlugs.has(data.schoolId) &&
      data.schoolId !== 'all'
    ) {
      console.warn(`[users] ${doc.id} has invalid schoolId:`, data.schoolId);
    }
  });

  console.log('\n=== DONE! ===');
  process.exit();
})();
