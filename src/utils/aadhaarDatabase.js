/**
 * Aadhaar Database â€” Now connects to real backend API.
 * Falls back to local mock data if backend is unreachable.
 * All function signatures and return shapes remain identical.
 */

import { authAPI, otpAPI } from './apiService';

// Keep local mock for offline fallback
const aadhaarDB = {
  // Normal adult citizen â€” Tamil Nadu
  '999988887777': {
    uid: '999988887777',
    name: 'Rajesh Kumar',
    nameHi: 'à¤°à¤¾à¤œà¥‡à¤¶ à¤•à¥à¤®à¤¾à¤°',
    nameTa: 'à®°à®¾à®œà¯‡à®·à¯ à®•à¯à®®à®¾à®°à¯',
    dob: '1990-05-14',
    gender: 'Male',
    mobile: '9876543210',
    email: 'rajesh.kumar@mail.com',
    address: {
      house: '12/A, Gandhi Nagar',
      street: 'MG Road',
      landmark: 'Near Central Park',
      city: 'Chennai',
      cityId: 'CHN',
      district: 'Chennai',
      state: 'Tamil Nadu',
      stateId: 'TN',
      pincode: '600001',
      ward: 'T. Nagar',
      wardId: 'W1',
    },
    photo: null,
    disability: null,
    bloodGroup: 'O+',
    language: 'ta',
    category: 'General',
    occupation: 'Software Engineer',
    annualIncome: 800000,
  },

  // Elderly citizen â€” Delhi
  '111122223333': {
    uid: '111122223333',
    name: 'Kamala Devi',
    nameHi: 'à¤•à¤®à¤²à¤¾ à¤¦à¥‡à¤µà¥€',
    nameTa: 'à®•à®®à®²à®¾ à®¤à¯‡à®µà®¿',
    dob: '1952-11-20',
    gender: 'Female',
    mobile: '9123456780',
    email: null,
    address: {
      house: '45, Sadar Bazaar',
      street: 'Chandni Chowk',
      landmark: 'Opposite Red Fort',
      city: 'New Delhi',
      cityId: 'NDL',
      district: 'Central Delhi',
      state: 'Delhi',
      stateId: 'DL',
      pincode: '110006',
      ward: 'Karol Bagh',
      wardId: 'W2',
    },
    photo: null,
    disability: null,
    bloodGroup: 'B+',
    language: 'hi',
    category: 'OBC',
    occupation: 'Retired',
    annualIncome: 240000,
  },

  // Visually impaired citizen â€” Maharashtra
  '444455556666': {
    uid: '444455556666',
    name: 'Arun Patil',
    nameHi: 'à¤…à¤°à¥à¤£ à¤ªà¤¾à¤Ÿà¤¿à¤²',
    nameTa: 'à®…à®°à¯à®£à¯ à®ªà®¾à®Ÿà¯à®Ÿà®¿à®²à¯',
    dob: '1985-08-03',
    gender: 'Male',
    mobile: '9988776655',
    email: 'arun.patil@mail.com',
    address: {
      house: '78, Shivaji Park',
      street: 'Dadar West',
      landmark: 'Near Siddhivinayak Temple',
      city: 'Mumbai',
      cityId: 'MUM',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      stateId: 'MH',
      pincode: '400028',
      ward: 'Ward D - Grant Road',
      wardId: 'W4',
    },
    photo: null,
    disability: 'visual',  // triggers blind mode
    bloodGroup: 'A+',
    language: 'en',
    category: 'General',
    occupation: 'Teacher',
    annualIncome: 500000,
  },

  // Child (minor) â€” Karnataka
  '777788889999': {
    uid: '777788889999',
    name: 'Sneha Reddy',
    nameHi: 'à¤¸à¥à¤¨à¥‡à¤¹à¤¾ à¤°à¥‡à¤¡à¥à¤¡à¥€',
    nameTa: 'à®¸à¯à®©à¯‡à®¹à®¾ à®°à¯†à®Ÿà¯à®Ÿà®¿',
    dob: '2014-03-10',
    gender: 'Female',
    mobile: '9090909090',
    email: null,
    address: {
      house: '23, Jayanagar 4th Block',
      street: '11th Main Road',
      landmark: 'Near Cool Joint',
      city: 'Bengaluru',
      cityId: 'BLR',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      stateId: 'KA',
      pincode: '560041',
      ward: 'Jayanagar',
      wardId: 'W4',
    },
    photo: null,
    disability: null,
    bloodGroup: 'AB+',
    language: 'en',
    category: 'General',
    occupation: 'Student',
    annualIncome: 0,
  },

  // Physically impaired citizen â€” Gujarat
  '222233334444': {
    uid: '222233334444',
    name: 'Meera Shah',
    nameHi: 'à¤®à¥€à¤°à¤¾ à¤¶à¤¾à¤¹',
    nameTa: 'à®®à¯€à®°à®¾ à®·à®¾',
    dob: '1978-01-15',
    gender: 'Female',
    mobile: '9111222333',
    email: 'meera.shah@mail.com',
    address: {
      house: '12, CG Road',
      street: 'Navrangpura',
      landmark: 'Near Law Garden',
      city: 'Ahmedabad',
      cityId: 'AMD',
      district: 'Ahmedabad',
      state: 'Gujarat',
      stateId: 'GJ',
      pincode: '380009',
      ward: 'Ward 1 - Central',
      wardId: 'W1',
    },
    photo: null,
    disability: 'physical',
    bloodGroup: 'O-',
    language: 'en',
    category: 'General',
    occupation: 'Accountant',
    annualIncome: 600000,
  },

  // ── DEMO CITIZENS — real mobile numbers for hackathon demo ──────────────

  // Demo 1 — Assamese speaker (Guwahati)
  '866769213800': {
    uid: '866769213800',
    name: 'Priya Baruah',
    nameHi: 'प्रिया बरुआ',
    nameAs: 'প্ৰিয়া বৰুৱা',
    dob: '1995-03-12',
    gender: 'Female',
    mobile: '8667692138',
    email: 'priya.baruah@demo.in',
    address: {
      house: '14, Fancy Bazaar',
      street: 'GS Road',
      landmark: 'Near Sarusajai Stadium',
      city: 'Guwahati',
      cityId: 'GUW',
      district: 'Kamrup Metro',
      state: 'Assam',
      stateId: 'AS',
      pincode: '781001',
      ward: 'Ward 12',
      wardId: 'W12',
    },
    photo: null,
    disability: null,
    bloodGroup: 'B+',
    language: 'as',
    category: 'General',
    occupation: 'Teacher',
    annualIncome: 350000,
  },

  // Demo 2 — Hindi speaker (Dibrugarh)
  '739731161300': {
    uid: '739731161300',
    name: 'Rahul Das',
    nameHi: 'राहुल दास',
    nameAs: 'ৰাহুল দাস',
    dob: '1988-07-25',
    gender: 'Male',
    mobile: '7397311613',
    email: 'rahul.das@demo.in',
    address: {
      house: '7, Chowkidinghee Road',
      street: 'AT Road',
      landmark: 'Near DC Office',
      city: 'Dibrugarh',
      cityId: 'DBR',
      district: 'Dibrugarh',
      state: 'Assam',
      stateId: 'AS',
      pincode: '786001',
      ward: 'Ward 5',
      wardId: 'W5',
    },
    photo: null,
    disability: null,
    bloodGroup: 'O+',
    language: 'hi',
    category: 'OBC',
    occupation: 'Shopkeeper',
    annualIncome: 240000,
  },

  // Demo 3 — Bengali speaker (Silchar)
  '790480284900': {
    uid: '790480284900',
    name: 'Meena Gogoi',
    nameHi: 'मीना गोगोई',
    nameAs: 'মীনা গগৈ',
    dob: '1970-12-08',
    gender: 'Female',
    mobile: '7904802849',
    email: null,
    address: {
      house: '3, Tarapur Road',
      street: 'Park Road',
      landmark: 'Near Civil Hospital',
      city: 'Silchar',
      cityId: 'SLC',
      district: 'Cachar',
      state: 'Assam',
      stateId: 'AS',
      pincode: '788001',
      ward: 'Ward 8',
      wardId: 'W8',
    },
    photo: null,
    disability: null,
    bloodGroup: 'A+',
    language: 'bn',
    category: 'SC',
    occupation: 'Homemaker',
    annualIncome: 120000,
  },

  // Demo 4 — English speaker (Jorhat)
  '730503711700': {
    uid: '730503711700',
    name: 'Arun Barua',
    nameHi: 'अरुण बरुआ',
    nameAs: 'অৰুণ বৰুৱা',
    dob: '1982-09-30',
    gender: 'Male',
    mobile: '7305037117',
    email: 'arun.barua@demo.in',
    address: {
      house: '22, Gar Ali',
      street: 'MB Road',
      landmark: 'Near Town Club',
      city: 'Jorhat',
      cityId: 'JRH',
      district: 'Jorhat',
      state: 'Assam',
      stateId: 'AS',
      pincode: '785001',
      ward: 'Ward 3',
      wardId: 'W3',
    },
    photo: null,
    disability: null,
    bloodGroup: 'AB+',
    language: 'en',
    category: 'General',
    occupation: 'Farmer',
    annualIncome: 180000,
  },

  // Admin user
  '123412341234': {
    uid: '123412341234',
    name: 'Admin User',
    nameHi: 'à¤à¤¡à¤®à¤¿à¤¨ à¤¯à¥‚à¤œà¤¼à¤°',
    nameTa: 'à®¨à®¿à®°à¯à®µà®¾à®•à®¿',
    dob: '1980-06-01',
    gender: 'Male',
    mobile: '9000000001',
    email: 'admin@suvidha.gov.in',
    address: {
      house: '1, Rajpath',
      street: 'Central Secretariat',
      landmark: 'India Gate',
      city: 'New Delhi',
      cityId: 'NDL',
      district: 'New Delhi',
      state: 'Delhi',
      stateId: 'DL',
      pincode: '110001',
      ward: 'Connaught Place',
      wardId: 'W1',
    },
    photo: null,
    disability: null,
    bloodGroup: 'A+',
    language: 'en',
    category: 'General',
    occupation: 'Government Officer',
    annualIncome: 1200000,
    isAdmin: true,
  },
};

/**
 * Calculate age from date of birth string
 */
export const calculateAge = (dob) => {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Determine accessibility profile from Aadhaar record
 */
export const detectAccessibilityProfile = (record) => {
  if (!record) return 'normal';
  
  const age = calculateAge(record.dob);

  // Visually impaired â†’ blind mode
  if (record.disability === 'visual') return 'blind';

  // Elderly: 60+
  if (age >= 60) return 'elderly';

  // Child: under 14
  if (age < 14) return 'child';

  // Physically impaired
  if (record.disability === 'physical') return 'physical';

  return 'normal';
};

/**
 * Lookup Aadhaar record by UID
 * Returns { success, data } or { success: false, error }
 */
export const lookupAadhaar = async (uid) => {
  const cleaned = uid.replace(/\s/g, '');
  try {
    const result = await authAPI.lookupAadhaar(cleaned);
    return result;
  } catch (err) {
    // Fallback to local mock if backend unreachable
    console.warn('[AUTH] Backend unreachable, using local fallback');
    await new Promise((resolve) => setTimeout(resolve, 500));
    const record = aadhaarDB[cleaned];
    if (record) {
      return { success: true, data: record };
    }
    return { success: false, error: err?.error || 'Aadhaar number not found in database.' };
  }
};

/**
 * Simulate biometric verification â€” now calls real backend
 */
export const verifyBiometric = async (uid, method = 'fingerprint') => {
  const cleaned = uid.replace(/\s/g, '');
  try {
    const result = await authAPI.verifyBiometric(cleaned, method);
    return result;
  } catch (err) {
    // Fallback to local mock
    console.warn('[AUTH] Backend unreachable, using local fallback');
    await new Promise((resolve) => setTimeout(resolve, 500));
    const record = aadhaarDB[cleaned];
    if (record) {
      if (method === 'iris' && record.disability === 'visual') {
        return { success: false, error: 'Iris scan exempt for visually impaired. Use fingerprint.' };
      }
      return { success: true, data: record };
    }
    return { success: false, error: err?.error || 'Biometric verification failed.' };
  }
};

/**
 * Send OTP â€” now calls real backend
 */
export const sendAadhaarOTP = async (uid, mobile) => {
  const cleaned = uid.replace(/\s/g, '');
  const normalizedMobile = String(mobile || '').replace(/\D/g, '');
  try {
    const result = await otpAPI.sendOtp({ uid: cleaned, mobile: normalizedMobile });
    return result;
  } catch (err) {
    return { success: false, error: err?.error || 'Unable to send OTP right now.' };
  }
};

/**
 * Verify OTP â€” now calls real backend
 */
export const verifyAadhaarOTP = async (uid, mobile, otp) => {
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return { success: false, error: 'Invalid OTP.' };
  }
  const cleaned = uid.replace(/\s/g, '');
  const normalizedMobile = String(mobile || '').replace(/\D/g, '');
  try {
    const result = await otpAPI.verifyOtp({ uid: cleaned, mobile: normalizedMobile, otp });
    return result;
  } catch (err) {
    return { success: false, error: err?.error || 'OTP verification failed.' };
  }
};

export default aadhaarDB;

