import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, Select, ApplicantBanner } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { LoadingScreen } from '../components/loading';
import { states } from '../utils/constants';
import { schemeAPI, api } from '../utils/apiService';
import { getSarvamLangCode } from '../utils/languageConfig';
import { mockDelayRange } from '../utils/mockDelay';
import { getActiveApplicant, buildSchemePrefill } from '../utils/citizenProfile';

const mockSchemes = [
  {
    id: 'PM-KISAN',
    name: 'PM-Kisan Samman Nidhi',
    nameHi: 'पीएम-किसान सम्मान निधि',
    nameTa: 'பிரதமர் கிசான் சம்மான் நிதி',
    ministry: 'Ministry of Agriculture',
    description: 'Income support of ₹6,000/year to farmer families with cultivable land.',
    descHi: 'खेती योग्य भूमि वाले किसान परिवारों को ₹6,000/वर्ष की आय सहायता।',
    descTa: 'விவசாய நிலம் கொண்ட விவசாய குடும்பங்களுக்கு ₹6,000/ஆண்டு வருமான உதவி.',
    eligibility: ['Small/marginal farmer', 'Indian citizen', 'Has cultivable land'],
    benefit: '₹6,000 per year (in 3 installments)',
    match: 95,
    category: 'Agriculture',
    status: 'Active',
  },
  {
    id: 'PMAY',
    name: 'Pradhan Mantri Awas Yojana',
    nameHi: 'प्रधानमंत्री आवास योजना',
    nameTa: 'பிரதமர் வீட்டுவசதி திட்டம்',
    ministry: 'Ministry of Housing & Urban Affairs',
    description: 'Affordable housing for economically weaker sections and LIG households.',
    descHi: 'आर्थिक रूप से कमजोर वर्गों और LIG परिवारों के लिए सस्ती आवास।',
    descTa: 'பொருளாதாரத்தில் நலிந்த பிரிவினர் மற்றும் LIG குடும்பங்களுக்கு மலிவான வீட்டுவசதி.',
    eligibility: ['Annual income < ₹6 lakh', 'No pucca house', 'First-time beneficiary'],
    benefit: 'Subsidy up to ₹2.67 lakh',
    match: 88,
    category: 'Housing',
    status: 'Active',
  },
  {
    id: 'AYUSHMAN',
    name: 'Ayushman Bharat - PMJAY',
    nameHi: 'आयुष्मान भारत - PMJAY',
    nameTa: 'ஆயுஷ்மான் பாரத் - PMJAY',
    ministry: 'Ministry of Health & Family Welfare',
    description: 'Health insurance cover of ₹5 lakh per family per year for secondary & tertiary hospitalization.',
    descHi: 'माध्यमिक और तृतीयक अस्पताल में भर्ती के लिए प्रति परिवार प्रति वर्ष ₹5 लाख का स्वास्थ्य बीमा कवर।',
    descTa: 'இரண்டாம் நிலை மற்றும் மூன்றாம் நிலை மருத்துவமனையில் சேர்க்கைக்கு ஒரு குடும்பத்திற்கு ஆண்டுக்கு ₹5 லட்சம் சுகாதார காப்பீடு.',
    eligibility: ['BPL family or SECC listed', 'No other health insurance', 'Indian citizen'],
    benefit: '₹5,00,000 health cover per family',
    match: 82,
    category: 'Health',
    status: 'Active',
  },
  {
    id: 'DBT-PAHAL',
    name: 'PAHAL (DBTL) - LPG Subsidy',
    nameHi: 'पहल (DBTL) - एलपीजी सब्सिडी',
    nameTa: 'பஹல் (DBTL) - LPG மானியம்',
    ministry: 'Ministry of Petroleum & Natural Gas',
    description: 'Direct benefit transfer of LPG subsidy into bank accounts of consumers.',
    descHi: 'उपभोक्ताओं के बैंक खातों में एलपीजी सब्सिडी का प्रत्यक्ष लाभ हस्तांतरण।',
    descTa: 'நுகர்வோர் வங்கிக் கணக்குகளில் LPG மானியத்தை நேரடி நன்மை பரிமாற்றம்.',
    eligibility: ['Has LPG connection', 'Bank account linked to Aadhaar', 'Indian citizen'],
    benefit: 'LPG subsidy via DBT',
    match: 76,
    category: 'Energy',
    status: 'Active',
  },
  {
    id: 'PM-SVANidhi',
    name: 'PM SVANidhi - Street Vendor Loans',
    nameHi: 'पीएम स्वनिधि - स्ट्रीट वेंडर ऋण',
    nameTa: 'பிரதமர் ஸ்வநிதி - தெரு வியாபாரிகள் கடன்',
    ministry: 'Ministry of Housing & Urban Affairs',
    description: 'Micro-credit facility for street vendors with working capital loan up to ₹50,000.',
    descHi: 'स्ट्रीट वेंडरों के लिए ₹50,000 तक कार्यशील पूंजी ऋण के साथ सूक्ष्म-ऋण सुविधा।',
    descTa: 'தெரு வியாபாரிகளுக்கு ₹50,000 வரை செயல்பாட்டு மூலதன கடனுடன் நுண்-கடன் வசதி.',
    eligibility: ['Registered street vendor', 'Valid identity proof', 'Working in urban area'],
    benefit: 'Loan up to ₹50,000',
    match: 70,
    category: 'Livelihood',
    status: 'Active',
  },
  {
    id: 'SUKANYA',
    name: 'Sukanya Samriddhi Yojana',
    nameHi: 'सुकन्या समृद्धि योजना',
    nameTa: 'சுகன்யா சம்ரிதி யோஜனா',
    ministry: 'Ministry of Finance',
    description: 'Savings scheme for girl child offering high interest rate with tax benefits.',
    descHi: 'बालिकाओं के लिए उच्च ब्याज दर और कर लाभ के साथ बचत योजना।',
    descTa: 'அதிக வட்டி விகிதம் மற்றும் வரிச் சலுகைகளுடன் பெண் குழந்தைக்கான சேமிப்புத் திட்டம்.',
    eligibility: ['Girl child below 10 years', 'Indian resident', 'Only 2 accounts per family'],
    benefit: '7.6% interest rate, tax-free maturity',
    match: 65,
    category: 'Women & Child',
    status: 'Active',
  },
  {
    id: 'MGNREGA',
    name: 'MGNREGA - Rural Employment',
    nameHi: 'मनरेगा - ग्रामीण रोजगार',
    nameTa: 'மகாத்மா காந்தி ஊரக வேலை உறுதி',
    ministry: 'Ministry of Rural Development',
    description: 'Guarantees 100 days of wage employment per year to rural households.',
    descHi: 'ग्रामीण परिवारों को प्रति वर्ष 100 दिन मजदूरी रोजगार की गारंटी।',
    descTa: 'ஊரக குடும்பங்களுக்கு ஆண்டுக்கு 100 நாட்கள் ஊதிய வேலைவாய்ப்பு உறுதி.',
    eligibility: ['Rural household', 'Adult willing to do unskilled manual work', 'Indian citizen'],
    benefit: '100 days guaranteed employment per year',
    match: 80,
    category: 'Employment',
    status: 'Active',
  },
  {
    id: 'PM-UJJWALA',
    name: 'PM Ujjwala Yojana',
    nameHi: 'प्रधानमंत्री उज्ज्वला योजना',
    nameTa: 'பிரதமர் உஜ்வலா திட்டம்',
    ministry: 'Ministry of Petroleum & Natural Gas',
    description: 'Free LPG connections to women from BPL households for clean cooking fuel.',
    descHi: 'BPL परिवारों की महिलाओं को मुफ्त एलपीजी कनेक्शन।',
    descTa: 'BPL குடும்பங்களின் பெண்களுக்கு இலவச LPG இணைப்பு.',
    eligibility: ['BPL household', 'Woman applicant', 'No existing LPG connection'],
    benefit: 'Free LPG connection + first refill',
    match: 78,
    category: 'Energy',
    status: 'Active',
  },
  {
    id: 'JAN-DHAN',
    name: 'PM Jan Dhan Yojana',
    nameHi: 'प्रधानमंत्री जन धन योजना',
    nameTa: 'பிரதமர் ஜன் தன் திட்டம்',
    ministry: 'Ministry of Finance',
    description: 'Zero-balance bank account with RuPay debit card, insurance cover and overdraft facility.',
    descHi: 'शून्य-शेष बैंक खाता, RuPay डेबिट कार्ड, बीमा कवर और ओवरड्राफ्ट सुविधा।',
    descTa: 'பூஜ்ஜிய இருப்பு வங்கிக் கணக்கு, RuPay டெபிட் கார்டு, காப்பீடு மற்றும் மேல்வரைப்பற்று வசதி.',
    eligibility: ['Indian citizen', 'No existing bank account', 'Age 10+ years'],
    benefit: 'Zero-balance account + ₹2 lakh accident insurance',
    match: 90,
    category: 'Financial Inclusion',
    status: 'Active',
  },
  {
    id: 'PM-MUDRA',
    name: 'PM MUDRA Yojana',
    nameHi: 'प्रधानमंत्री मुद्रा योजना',
    nameTa: 'பிரதமர் முத்ரா திட்டம்',
    ministry: 'Ministry of Finance',
    description: 'Collateral-free loans up to ₹10 lakh for micro/small enterprises.',
    descHi: 'सूक्ष्म/लघु उद्यमों के लिए ₹10 लाख तक बिना गारंटी के ऋण।',
    descTa: 'நுண்/சிறு நிறுவனங்களுக்கு ₹10 லட்சம் வரை ஈட்டுறுதியில்லா கடன்.',
    eligibility: ['Non-farm small business', 'Indian citizen', 'Valid business plan'],
    benefit: 'Loans: Shishu (₹50K), Kishore (₹5L), Tarun (₹10L)',
    match: 72,
    category: 'Business',
    status: 'Active',
  },
  {
    id: 'ATAL-PENSION',
    name: 'Atal Pension Yojana',
    nameHi: 'अटल पेंशन योजना',
    nameTa: 'அடல் ஓய்வூதியத் திட்டம்',
    ministry: 'Ministry of Finance',
    description: 'Guaranteed pension of ₹1,000 to ₹5,000/month after age 60 for unorganized sector workers.',
    descHi: '60 वर्ष की आयु के बाद असंगठित क्षेत्र के कामगारों को ₹1,000 से ₹5,000/माह गारंटीकृत पेंशन।',
    descTa: '60 வயதிற்குப் பிறகு அமைப்புசாரா துறை தொழிலாளர்களுக்கு ₹1,000 முதல் ₹5,000/மாதம் உத்தரவாத ஓய்வூதியம்.',
    eligibility: ['Age 18-40', 'Bank account with Aadhaar', 'Not income tax payer'],
    benefit: '₹1,000-₹5,000 monthly pension after 60',
    match: 74,
    category: 'Pension',
    status: 'Active',
  },
  {
    id: 'NSP',
    name: 'National Scholarship Portal',
    nameHi: 'राष्ट्रीय छात्रवृत्ति पोर्टल',
    nameTa: 'தேசிய உதவித்தொகை போர்டல்',
    ministry: 'Ministry of Education',
    description: 'Central & state scholarships for students from Class 1 to PhD level.',
    descHi: 'कक्षा 1 से PhD स्तर तक के छात्रों के लिए केंद्रीय और राज्य छात्रवृत्तियां।',
    descTa: 'வகுப்பு 1 முதல் PhD வரை மாணவர்களுக்கான மத்திய & மாநில உதவித்தொகைகள்.',
    eligibility: ['Enrolled student', 'Income criteria vary by scheme', 'Indian citizen'],
    benefit: '₹500 to ₹75,000/year depending on level',
    match: 85,
    category: 'Education',
    status: 'Active',
  },
  {
    id: 'PM-VISHWAKARMA',
    name: 'PM Vishwakarma Yojana',
    nameHi: 'प्रधानमंत्री विश्वकर्मा योजना',
    nameTa: 'பிரதமர் விஸ்வகர்மா திட்டம்',
    ministry: 'Ministry of MSME',
    description: 'Support for traditional artisans and craftspeople — training, toolkit, and credit.',
    descHi: 'पारंपरिक कारीगरों के लिए प्रशिक्षण, टूलकिट और ऋण सहायता।',
    descTa: 'பாரம்பரிய கைவினைஞர்களுக்கு பயிற்சி, கருவித்தொகுப்பு மற்றும் கடன் உதவி.',
    eligibility: ['Traditional artisan/craftsperson', 'Working with hands/tools', 'Indian citizen'],
    benefit: '₹15,000 toolkit + ₹3 lakh loan at 5%',
    match: 71,
    category: 'Livelihood',
    status: 'Active',
  },
  {
    id: 'PMSBY',
    name: 'PM Suraksha Bima Yojana',
    nameHi: 'प्रधानमंत्री सुरक्षा बीमा योजना',
    nameTa: 'பிரதமர் சுரக்ஷா பீமா திட்டம்',
    ministry: 'Ministry of Finance',
    description: 'Accident insurance cover of ₹2 lakh at just ₹20/year premium.',
    descHi: 'केवल ₹20/वर्ष प्रीमियम पर ₹2 लाख का दुर्घटना बीमा कवर।',
    descTa: 'வெறும் ₹20/ஆண்டு பிரீமியத்தில் ₹2 லட்சம் விபத்துக் காப்பீடு.',
    eligibility: ['Age 18-70', 'Bank account', 'Indian citizen'],
    benefit: '₹2 lakh accidental death/disability cover',
    match: 88,
    category: 'Insurance',
    status: 'Active',
  },
  {
    id: 'PMJJBY',
    name: 'PM Jeevan Jyoti Bima Yojana',
    nameHi: 'प्रधानमंत्री जीवन ज्योति बीमा योजना',
    nameTa: 'பிரதமர் ஜீவன் ஜோதி பீமா திட்டம்',
    ministry: 'Ministry of Finance',
    description: 'Life insurance cover of ₹2 lakh at ₹436/year premium.',
    descHi: '₹436/वर्ष प्रीमियम पर ₹2 लाख का जीवन बीमा कवर।',
    descTa: '₹436/ஆண்டு பிரீமியத்தில் ₹2 லட்சம் ஆயுள் காப்பீடு.',
    eligibility: ['Age 18-50', 'Bank account with auto-debit', 'Indian citizen'],
    benefit: '₹2 lakh life cover for any cause of death',
    match: 86,
    category: 'Insurance',
    status: 'Active',
  },
  {
    id: 'SWACHH-BHARAT',
    name: 'Swachh Bharat Mission',
    nameHi: 'स्वच्छ भारत मिशन',
    nameTa: 'ஸ்வச்ச் பாரத் இயக்கம்',
    ministry: 'Ministry of Jal Shakti',
    description: 'Financial assistance of ₹12,000 for building individual household toilets.',
    descHi: 'व्यक्तिगत घरेलू शौचालय बनाने के लिए ₹12,000 की वित्तीय सहायता।',
    descTa: 'தனிநபர் கழிவறை கட்ட ₹12,000 நிதி உதவி.',
    eligibility: ['BPL household', 'No existing toilet', 'Indian citizen'],
    benefit: '₹12,000 for toilet construction',
    match: 69,
    category: 'Sanitation',
    status: 'Active',
  },
  {
    id: 'PM-MATRU',
    name: 'PM Matru Vandana Yojana',
    nameHi: 'प्रधानमंत्री मातृ वंदना योजना',
    nameTa: 'பிரதமர் மாத்ரு வந்தனா திட்டம்',
    ministry: 'Ministry of WCD',
    description: 'Cash incentive of ₹5,000 for pregnant and lactating women for first living child.',
    descHi: 'गर्भवती और स्तनपान कराने वाली महिलाओं को पहली जीवित संतान के लिए ₹5,000 नकद प्रोत्साहन।',
    descTa: 'கர்ப்பிணி மற்றும் பாலூட்டும் பெண்களுக்கு முதல் குழந்தைக்கு ₹5,000 பணப்பரிசு.',
    eligibility: ['Pregnant/lactating woman', 'First living child', 'Age 19+'],
    benefit: '₹5,000 in 3 installments',
    match: 79,
    category: 'Women & Child',
    status: 'Active',
  },
  {
    id: 'STANDUP-INDIA',
    name: 'Stand Up India',
    nameHi: 'स्टैंड अप इंडिया',
    nameTa: 'ஸ்டாண்ட் அப் இந்தியா',
    ministry: 'Ministry of Finance',
    description: 'Bank loans between ₹10 lakh and ₹1 crore for SC/ST and women entrepreneurs.',
    descHi: 'SC/ST और महिला उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक बैंक ऋण।',
    descTa: 'SC/ST மற்றும் பெண் தொழில்முனைவோருக்கு ₹10 லட்சம் முதல் ₹1 கோடி வரை வங்கிக் கடன்.',
    eligibility: ['SC/ST or woman entrepreneur', 'First-time venture', 'Age 18+'],
    benefit: 'Loan ₹10 lakh to ₹1 crore',
    match: 68,
    category: 'Business',
    status: 'Active',
  },
  {
    id: 'PM-FASAL',
    name: 'PM Fasal Bima Yojana',
    nameHi: 'प्रधानमंत्री फसल बीमा योजना',
    nameTa: 'பிரதமர் பயிர் காப்பீட்டுத் திட்டம்',
    ministry: 'Ministry of Agriculture',
    description: 'Crop insurance with very low premium for farmers against natural calamities.',
    descHi: 'प्राकृतिक आपदाओं से किसानों के लिए बहुत कम प्रीमियम पर फसल बीमा।',
    descTa: 'இயற்கை பேரிடர்களுக்கு எதிராக விவசாயிகளுக்கு மிகக் குறைந்த பிரீமியத்தில் பயிர் காப்பீடு.',
    eligibility: ['Farmer with notified crop', 'Loanee or non-loanee farmer', 'Indian citizen'],
    benefit: 'Crop loss compensation (premium: 1.5-5%)',
    match: 77,
    category: 'Agriculture',
    status: 'Active',
  },
  {
    id: 'DIGITAL-INDIA',
    name: 'Digital India Programme',
    nameHi: 'डिजिटल इंडिया कार्यक्रम',
    nameTa: 'டிஜிட்டல் இந்தியா திட்டம்',
    ministry: 'Ministry of Electronics & IT',
    description: 'Free digital literacy training and internet access for rural citizens.',
    descHi: 'ग्रामीण नागरिकों के लिए मुफ्त डिजिटल साक्षरता प्रशिक्षण और इंटरनेट पहुंच।',
    descTa: 'ஊரக குடிமக்களுக்கு இலவச டிஜிட்டல் எழுத்தறிவு பயிற்சி மற்றும் இணைய அணுகல்.',
    eligibility: ['Indian citizen', 'Residing in rural area', 'No prior digital training'],
    benefit: 'Free computer & internet training',
    match: 60,
    category: 'Education',
    status: 'Active',
  },
];

const ageGroups = [
  { value: '', label: 'Select Age Group' },
  { value: '18-25', label: '18-25 years' },
  { value: '26-35', label: '26-35 years' },
  { value: '36-45', label: '36-45 years' },
  { value: '46-60', label: '46-60 years' },
  { value: '60+', label: '60+ years' },
];

const incomeRanges = [
  { value: '', label: 'Select Annual Income' },
  { value: 'below-1L', label: 'Below ₹1,00,000' },
  { value: '1L-3L', label: '₹1,00,000 - ₹3,00,000' },
  { value: '3L-6L', label: '₹3,00,000 - ₹6,00,000' },
  { value: '6L-10L', label: '₹6,00,000 - ₹10,00,000' },
  { value: 'above-10L', label: 'Above ₹10,00,000' },
];

const categoryOptions = [
  { value: '', label: 'Select Category' },
  { value: 'general', label: 'General' },
  { value: 'obc', label: 'OBC' },
  { value: 'sc', label: 'SC' },
  { value: 'st', label: 'ST' },
  { value: 'ews', label: 'EWS' },
];

const occupations = [
  { value: '', label: 'Select Occupation' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'student', label: 'Student' },
  { value: 'salaried', label: 'Salaried Employee' },
  { value: 'self-employed', label: 'Self Employed' },
  { value: 'daily-wage', label: 'Daily Wage Worker' },
  { value: 'street-vendor', label: 'Street Vendor' },
  { value: 'homemaker', label: 'Homemaker' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
];

// Category filter mapping: menu card id → scheme category strings to include
const categoryFilterMap = {
  agriculture: ['Agriculture'],
  housing: ['Housing', 'Sanitation'],
  health: ['Health', 'Insurance', 'Women & Child'],
  education: ['Education'],
  employment: ['Employment', 'Livelihood', 'Business', 'Financial Inclusion', 'Pension', 'Energy'],
};

const SchemeDiscovery = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState('menu'); // 'menu' | 'profile' | 'results'
  const [preCategory, setPreCategory] = useState(''); // menu card selected category
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    ageGroup: '',
    gender: '',
    state: '',
    income: '',
    category: '',
    occupation: '',
    ...buildSchemePrefill(getActiveApplicant()),
  });
  const [results, setResults] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [detailScheme, setDetailScheme] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [translatedSchemes, setTranslatedSchemes] = useState({});

  const lang = i18n.language;

  const menuCards = [
    {
      id: 'all',
      glyph: ic.shield,
      title: t('schemes.discoverSchemes', 'Discover My Schemes'),
      description: t('home.schemesAllDesc', 'AI-powered matching across all government schemes'),
    },
    {
      id: 'agriculture',
      glyph: ic.leaf,
      title: t('home.schemesAgriculture', 'Agriculture Schemes'),
      description: t('home.schemesAgricultureDesc', 'Farming support, crop insurance, soil health'),
    },
    {
      id: 'housing',
      glyph: ic.building,
      title: t('home.schemesHousing', 'Housing & Urban'),
      description: t('home.schemesHousingDesc', 'Affordable housing, sanitation, urban development'),
    },
    {
      id: 'health',
      glyph: ic.heart,
      title: t('home.schemesHealth', 'Health & Insurance'),
      description: t('home.schemesHealthDesc', 'Medical cover, life & accident insurance schemes'),
    },
    {
      id: 'education',
      glyph: ic.doc,
      title: t('home.schemesEducation', 'Education & Skills'),
      description: t('home.schemesEducationDesc', 'Scholarships, digital literacy, skill training'),
    },
    {
      id: 'employment',
      glyph: ic.rupee,
      title: t('home.schemesEmployment', 'Employment & Finance'),
      description: t('home.schemesEmploymentDesc', 'Jobs, loans, pensions, financial inclusion'),
    },
  ];

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleDiscover = async () => {
    setLoading(true);
    const minWait = mockDelayRange(2200, 2800);
    try {
      const data = await schemeAPI.discover(profile);
      if (data && data.schemes && data.schemes.length > 0) {
        const filtered = applyPreCategoryFilter(data.schemes);
        await minWait;
        setResults(filtered);
        setVisibleCount(10);
        setStep('results');
        setLoading(false);
        return;
      }
    } catch {
      // fall through to local matching
    }

    let matched = [...mockSchemes];

    if (profile.occupation === 'farmer') {
      matched = matched.map(s => s.id === 'PM-KISAN' ? { ...s, match: 98 } : s);
    }
    if (profile.income === 'below-1L' || profile.income === '1L-3L') {
      matched = matched.map(s => s.id === 'PMAY' ? { ...s, match: 94 } : s);
      matched = matched.map(s => s.id === 'AYUSHMAN' ? { ...s, match: 92 } : s);
    }
    if (profile.occupation === 'street-vendor') {
      matched = matched.map(s => s.id === 'PM-SVANidhi' ? { ...s, match: 96 } : s);
    }

    matched.sort((a, b) => b.match - a.match);
    const filtered = applyPreCategoryFilter(matched);
    await minWait;
    setResults(filtered);
    setVisibleCount(10);
    setStep('results');
    setLoading(false);
  };

  const applyPreCategoryFilter = (schemes) => {
    if (!preCategory || preCategory === 'all') return schemes;
    const allowedCategories = categoryFilterMap[preCategory] || [];
    return schemes.filter(s => s.category && allowedCategories.some(c => s.category.includes(c)));
  };

  const handleApply = (scheme) => {
    setSelectedScheme(scheme);
    setShowApplyModal(true);
  };

  const translateSchemeTexts = useCallback(async (schemes, targetLang) => {
    if (targetLang === 'en' || targetLang === 'hi' || targetLang === 'ta') return;
    const cacheKey = targetLang;
    if (translatedSchemes[cacheKey]) return;
    try {
      const textsToTranslate = [];
      schemes.forEach(s => {
        textsToTranslate.push(s.name);
        textsToTranslate.push(s.description);
      });
      const sarvamCode = getSarvamLangCode(targetLang);
      const response = await api.post('/api/sarvam/batch-translate', {
        texts: textsToTranslate,
        source_language_code: 'en-IN',
        target_language_code: sarvamCode,
      });
      const translated = response.translations || textsToTranslate;
      const cache = {};
      schemes.forEach((s, i) => {
        cache[s.id] = {
          name: translated[i * 2] || s.name,
          description: translated[i * 2 + 1] || s.description,
        };
      });
      setTranslatedSchemes(prev => ({ ...prev, [cacheKey]: cache }));
    } catch (err) {
      console.warn('Scheme translation failed:', err);
    }
  }, [translatedSchemes]);

  useEffect(() => {
    if (results.length > 0 && lang !== 'en' && lang !== 'hi' && lang !== 'ta') {
      translateSchemeTexts(results, lang);
    }
  }, [results, lang]);

  const getLocalName = (scheme) => {
    if (lang === 'hi' && scheme.nameHi) return scheme.nameHi;
    if (lang === 'ta' && scheme.nameTa) return scheme.nameTa;
    const cached = translatedSchemes[lang];
    if (cached && cached[scheme.id]) return cached[scheme.id].name;
    return scheme.name;
  };

  const getLocalDesc = (scheme) => {
    if (lang === 'hi' && scheme.descHi) return scheme.descHi;
    if (lang === 'ta' && scheme.descTa) return scheme.descTa;
    const cached = translatedSchemes[lang];
    if (cached && cached[scheme.id]) return cached[scheme.id].description;
    return scheme.description;
  };

  const filteredResults = searchQuery
    ? results.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.ministry.toLowerCase().includes(q) ||
          (s.nameHi && s.nameHi.includes(searchQuery)) ||
          (s.nameTa && s.nameTa.includes(searchQuery));
      })
    : results;

  const isProfileComplete = profile.ageGroup && profile.state && profile.income;

  if (loading) {
    return (
      <VK bg="color-mix(in oklab, var(--indigo-500) 5%, var(--surface-0))">
        <LoadingScreen
          heading={t('schemes.analyzing', 'Analysing your profile…')}
          variant="signal"
          size={76}
        />
      </VK>
    );
  }

  return (
    <VK bg="color-mix(in oklab, var(--indigo-500) 5%, var(--surface-0))">

      {/* ── MENU LANDING ── */}
      {step === 'menu' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
            <DD color="var(--indigo-700)" glyph={ic.shield} size={168} isz={92} />
            <div>
              <div className="label-tag" style={{ color: 'var(--indigo-700)', marginBottom: 14 }}>
                Schemes for you
              </div>
              <h1 className="h2">{t('schemes.title', 'Government Schemes')}</h1>
              <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
                {t('schemes.subtitle', 'AI-powered scheme discovery · Eligibility matching · Instant apply')}
              </p>
            </div>
          </div>

          {/* Service grid — 3 cols for kiosk */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            {menuCards.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setPreCategory(s.id);
                  setStep('profile');
                }}
                className="tile"
                style={{
                  minHeight: 260,
                  padding: 32,
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 20,
                  borderTop: '8px solid var(--indigo-700)',
                  touchAction: 'manipulation',
                }}
                aria-label={s.title}
              >
                <DD color="var(--indigo-700)" glyph={s.glyph} size={120} isz={64} />
                <div className="nm" style={{ fontSize: 26, lineHeight: 1.3 }}>{s.title}</div>
                <div className="sub" style={{ fontSize: 20, marginTop: 'auto' }}>{s.description}</div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-quiet"
            style={{ alignSelf: 'center' }}
            onClick={() => navigate('/home')}
          >
            <I d={ic.back} size={24} /> {t('home.backToOrgs', 'Back to Organizations')}
          </button>
        </>
      )}

      {/* ── PROFILE INPUT STEP ── */}
      {step === 'profile' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--indigo-700)" glyph={ic.shield} size={128} isz={72} />
            <h1 className="h2">{t('schemes.title', 'Government Schemes')}</h1>
          </div>

          <div className="card">
            <ApplicantBanner />
            <h2 className="h3" style={{ marginBottom: 12 }}>
              {t('schemes.enterProfile', 'Enter Your Profile')}
            </h2>
            <p className="body-l" style={{ color: 'var(--ink-500)', marginBottom: 36 }}>
              {t('schemes.profileHint', 'We use this to match the best schemes for you')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px' }}>
              <div>
                <label className="flab">{t('schemes.ageGroup', 'Age Group')}</label>
                <Select
                  value={profile.ageGroup}
                  onChange={(e) => handleProfileChange('ageGroup', e.target.value)}
                  options={ageGroups}
                />
              </div>
              <div>
                <label className="flab">{t('schemes.gender', 'Gender')}</label>
                <Select
                  value={profile.gender}
                  onChange={(e) => handleProfileChange('gender', e.target.value)}
                  placeholder={t('schemes.selectGender', 'Select Gender')}
                  options={[
                    { value: 'male', label: t('schemes.male', 'Male') },
                    { value: 'female', label: t('schemes.female', 'Female') },
                    { value: 'other', label: t('schemes.otherGender', 'Other') },
                  ]}
                />
              </div>
              <div>
                <label className="flab">{t('form.state', 'State')}</label>
                <Select
                  value={profile.state}
                  onChange={(e) => handleProfileChange('state', e.target.value)}
                  placeholder={t('form.selectState', 'Select State')}
                  options={states.map(s => ({ value: s.id, label: s.name }))}
                />
              </div>
              <div>
                <label className="flab">{t('schemes.income', 'Annual Income')}</label>
                <Select
                  value={profile.income}
                  onChange={(e) => handleProfileChange('income', e.target.value)}
                  options={incomeRanges}
                />
              </div>
              <div>
                <label className="flab">{t('schemes.category', 'Category')}</label>
                <Select
                  value={profile.category}
                  onChange={(e) => handleProfileChange('category', e.target.value)}
                  options={categoryOptions}
                />
              </div>
              <div>
                <label className="flab">{t('schemes.occupation', 'Occupation')}</label>
                <Select
                  value={profile.occupation}
                  onChange={(e) => handleProfileChange('occupation', e.target.value)}
                  options={occupations}
                />
              </div>
            </div>

            <button className="btn btn-pri btn-xl" style={{ width: '100%', marginTop: 44 }} disabled={!isProfileComplete} onClick={handleDiscover}>
              {t('schemes.discoverSchemes', 'Discover My Schemes')} <I d={ic.arrow} size={32} />
            </button>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button type="button" className="btn btn-quiet" onClick={() => setStep('menu')}>
                <I d={ic.back} size={24} /> {t('app.back', 'Back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS STEP ── */}
      {step === 'results' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--indigo-700)" glyph={ic.shield} size={128} isz={72} />
            <h1 className="h2">{t('schemes.title', 'Government Schemes')}</h1>
          </div>

          {/* Search bar */}
          <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 28 }}>
            <input
              className="field"
              style={{ flex: 1 }}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('schemes.searchSchemes', 'Search schemes…')}
            />
            <button className="btn btn-ghost" onClick={() => { setStep('profile'); setResults([]); setSearchQuery(''); }}>
              {t('schemes.refineSearch', 'Refine')}
            </button>
          </div>

          {/* Match summary */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28, background: 'color-mix(in oklab, var(--indigo-500) 8%, white)' }}>
            <div>
              <h3 className="h3" style={{ color: 'var(--indigo-700)' }}>
                {t('schemes.matchFound', { count: filteredResults.length })}
              </h3>
              <p className="meta" style={{ marginTop: 6 }}>
                {t('schemes.rankedByEligibility', 'Ranked by eligibility score')}
              </p>
            </div>
            <span className="badge b-info">{t('schemes.aiRecommended', 'AI Recommended')}</span>
          </div>

          {/* Scheme cards — tap to view full details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {filteredResults.slice(0, visibleCount).map((scheme, index) => (
              <button
                key={scheme.id}
                type="button"
                onClick={() => setDetailScheme(scheme)}
                className="tile"
                style={{
                  borderTop: `8px solid ${scheme.match >= 90 ? 'var(--ok)' : scheme.match >= 75 ? 'var(--warn)' : 'var(--indigo-500)'}`,
                  alignItems: 'stretch',
                  textAlign: 'left',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span className="badge b-info">#{index + 1}</span>
                      <span className={`badge ${scheme.match >= 90 ? 'b-ok' : scheme.match >= 75 ? 'b-warn' : 'b-info'}`}>
                        {scheme.match}% {t('schemes.matchLabel', 'match')}
                      </span>
                      <span className="badge">{scheme.category}</span>
                    </div>
                    <div className="nm" style={{ fontSize: 26 }}>{getLocalName(scheme)}</div>
                    <div className="meta" style={{ marginTop: 4 }}>{scheme.ministry}</div>
                  </div>
                  {scheme.match >= 90 && (
                    <span className="badge b-ok" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <I d={ic.star} size={20} /> {t('schemes.topMatch', 'Top Match')}
                    </span>
                  )}
                </div>

                <div
                  className="sub"
                  style={{
                    fontSize: 20, marginTop: 16, display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}
                >
                  {getLocalDesc(scheme)}
                </div>

                <div className="meta" style={{ marginTop: 16, color: 'var(--indigo-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('schemes.tapForDetails', 'Tap for eligibility, benefits & how to apply')} <I d={ic.arrow} size={18} />
                </div>
              </button>
            ))}
          </div>

          {(() => {
            const nextScheme = filteredResults[visibleCount];
            const hasMoreGoodMatches = nextScheme && nextScheme.match >= 70;
            return (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                {hasMoreGoodMatches ? (
                  <button
                    type="button"
                    className="btn btn-ghost"                    onClick={() => setVisibleCount(c => c + 10)}
                  >
                    {t('schemes.showMore', 'Show More')} <I d={ic.arrow} size={24} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-quiet"                    onClick={() => navigate('/home')}
                  >
                    <I d={ic.back} size={24} /> {t('home.backToOrgs', 'Back to Organizations')}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SCHEME DETAIL OVERLAY ── */}
      {detailScheme && (
        <div
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailScheme(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(15,23,42,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={getLocalName(detailScheme)}
            style={{
              position: 'relative',
              background: 'white', borderRadius: 24,
              width: '100%', maxWidth: 1120, maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setDetailScheme(null)}
              aria-label={t('app.close', 'Close')}
              style={{
                position: 'absolute', top: 20, right: 20, zIndex: 1,
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: 'var(--surface-2, #f1f5f9)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
            >
              <I d={ic.x} size={22} />
            </button>

            {/* Scrollable body — header scrolls with content so it never fights the close button for space */}
            <div style={{ padding: '44px 96px 40px 48px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <span className={`badge ${detailScheme.match >= 90 ? 'b-ok' : detailScheme.match >= 75 ? 'b-warn' : 'b-info'}`}>
                  {detailScheme.match}% {t('schemes.matchLabel', 'match')}
                </span>
                <span className="badge">{detailScheme.category}</span>
                {detailScheme.match >= 90 && (
                  <span className="badge b-ok" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <I d={ic.star} size={18} /> {t('schemes.topMatch', 'Top Match')}
                  </span>
                )}
              </div>

              <div className="nm" style={{ fontSize: 40, lineHeight: 1.25 }}>{getLocalName(detailScheme)}</div>
              <div className="meta" style={{ marginTop: 8, marginBottom: 24, fontSize: 22 }}>{detailScheme.ministry}</div>

              <div className="sub" style={{ fontSize: 28, lineHeight: 1.5 }}>{getLocalDesc(detailScheme)}</div>

              <div style={{ marginTop: 26 }}>
                <div className="meta" style={{ marginBottom: 12, fontWeight: 700 }}>{t('schemes.eligibilityCriteria', 'Eligibility')}:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {detailScheme.eligibility.map((crit, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 23, color: 'var(--ink-700)' }}>
                      <I d={ic.check} size={24} style={{ flexShrink: 0, marginTop: 2, color: 'var(--ok)' }} /> <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="meta" style={{ marginTop: 24, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 19 }}>
                <I d={ic.rupee} size={20} /> {t('schemes.benefit', 'Benefit')}: {detailScheme.benefit}
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="meta">{t('schemes.eligibilityScore', 'Eligibility Score')}</span>
                  <span className="meta" style={{ fontWeight: 700 }}>{detailScheme.match}%</span>
                </div>
                <div style={{ width: '100%', background: 'var(--line)', borderRadius: 999, height: 10 }}>
                  <div style={{
                    height: 10, borderRadius: 999, width: `${detailScheme.match}%`,
                    background: detailScheme.match >= 90 ? 'var(--ok)' : detailScheme.match >= 75 ? 'var(--warn)' : 'var(--indigo-500)',
                  }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, padding: '20px 36px 28px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
              <button
                className="btn btn-pri"
                style={{ flex: 1 }}
                onClick={() => { handleApply(detailScheme); setDetailScheme(null); }}
              >
                {t('schemes.applyNow', 'Apply Now')} <I d={ic.arrow} size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        type="success"
        title={t('schemes.applicationStarted', 'Application Started')}
        message={selectedScheme
          ? `${t('schemes.applicationMsg', 'You are applying for')} "${getLocalName(selectedScheme)}". ${t('schemes.documentsNeeded', 'Please keep your documents ready.')}`
          : ''
        }
        confirmText={t('schemes.proceedWithDocs', 'Proceed')}
        cancelText={t('app.cancel')}
        onConfirm={() => setShowApplyModal(false)}
        onCancel={() => setShowApplyModal(false)}
      />
    </VK>
  );
};

export default SchemeDiscovery;
