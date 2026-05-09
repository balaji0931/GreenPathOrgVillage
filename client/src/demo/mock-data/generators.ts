/**
 * Mock data generators - single source of truth for ALL demo data.
 * Both the cache seeder AND the fetch interceptor use these functions.
 *
 * Design: Generators produce realistic Indian village data with believable
 * patterns - inconsistent coverage, weekend dips, varying ratings.
 *
 * IMPORTANT: Use the memoized getXxx() getters (bottom of file) instead of
 * calling generateXxx() directly. This ensures consistent object references
 * and avoids re-computing thousands of records.
 */

import { DEMO_VILLAGE_ID } from "@/lib/queryKeys";

// ─── Helpers ──────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seededRandom(seed: number): () => number {
  // Simple deterministic PRNG - same seed = same "random" data every time
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTimestamp(d: Date): string {
  return d.toISOString();
}

function getISTDate(daysAgo: number = 0): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setDate(ist.getDate() - daysAgo);
  ist.setHours(0, 0, 0, 0);
  return ist;
}

function getISTToday(): string {
  return formatDate(getISTDate(0));
}

// ─── Constants ────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Rajesh", "Sunita", "Mohan", "Lakshmi", "Ganesh", "Priya", "Sunil", "Anita",
  "Vijay", "Kamala", "Ramesh", "Savita", "Deepak", "Rekha", "Arun", "Meena",
  "Sanjay", "Geeta", "Prakash", "Kavita", "Manoj", "Asha", "Dinesh", "Nirmala",
  "Nitin", "Pooja", "Ashok", "Usha", "Rohit", "Shanti", "Mukesh", "Jaya",
  "Rahul", "Seema", "Sachin", "Kiran", "Yogesh", "Mala", "Ajay", "Lata",
  "Vinod", "Suman", "Hemant", "Pushpa", "Ravi", "Saroja", "Bharat", "Kamini",
  "Tushar", "Anjali",
];

const LAST_NAMES = [
  "Sharma", "Patil", "Devi", "Patel", "Yadav", "Kadam", "Singh", "Jadhav",
  "Kumar", "Bhosale", "Gupta", "More", "Deshmukh", "Pawar", "Joshi", "Kulkarni",
  "Shinde", "Gaikwad", "Chavan", "Sonawane", "Nikam", "Thorat", "Salunkhe",
  "Kale", "Mane",
];

const WARDS = ["Ward-1", "Ward-2", "Ward-3"];

const HOUSEHOLD_TYPES = [
  ...Array(70).fill("residential_small"),
  ...Array(15).fill("residential_large"),
  ...Array(10).fill("commercial_shop"),
  ...Array(3).fill("bulk_generator"),
  ...Array(2).fill("institutional"),
];

const WASTE_TYPES_OPTIONS = [
  ["wet", "dry"],
  ["wet", "dry"],
  ["wet", "dry"],
  ["wet"],
  ["wet"],
  ["dry"],
  ["mixed"],
  ["mixed"],
  ["sanitary"],
  ["wet", "dry", "sanitary"],
];

const MISSED_REASONS = [
  "House locked",
  "No waste today",
  "Refused service",
  "Unable to access",
  "Holiday",
];

// ─── Demo User Generators ────────────────────────────────────────────

export const DEMO_USERS = {
  manager: {
    userId: "DEMO-MGR-001",
    role: "manager",
    name: "Amit Deshmukh",
    villageId: DEMO_VILLAGE_ID,
    isFirstLogin: false,
  },
  collector: {
    userId: "DEMO-V001-C1",
    role: "collector",
    name: "Ramesh Kumar",
    villageId: DEMO_VILLAGE_ID,
    isFirstLogin: false,
  },
  generator: {
    userId: "DEMO-GEN-042",
    role: "generator",
    name: "Sunita Patil",
    villageId: DEMO_VILLAGE_ID,
    isFirstLogin: false,
  },
  fieldworker: {
    userId: "DEMO-V001-FW1",
    role: "fieldworker",
    name: "Anjali Bhosale",
    villageId: DEMO_VILLAGE_ID,
    isFirstLogin: false,
  },
  moderator: {
    userId: "DEMO-MOD-001",
    role: "moderator",
    name: "Priya Joshi",
    villageId: null,
    isFirstLogin: false,
  },
};

// ─── Village ──────────────────────────────────────────────────────────

export function generateVillage() {
  return {
    villageId: DEMO_VILLAGE_ID,
    name: "Sundernagar",
    state: "Maharashtra",
    district: "Ratnagiri",
    totalHouseholds: 100,
    wards: ["Ward-1", "Ward-2", "Ward-3"],
    locationServicesEnabled: true,
    notificationWindowStart: "06:30",
    notificationWindowEnd: "13:00",
    notificationRadiusMeters: 150,
    proximityAlertsEnabled: true,
    weightRequired: false,
    imageUploadRequired: true,
    collectorWasteLogEnabled: true,
    attendanceEnabled: true,
    paymentsEnabled: false,
    isPremium: true,
    vehicles: [
      { registrationNumber: "MH-12-AB-1234", name: "Green Tempo 1", collectorIds: [1, 2, 3] },
      { registrationNumber: "MH-12-CD-5678", name: "Green Tempo 2", collectorIds: [4, 5, 6] },
      { registrationNumber: "MH-12-EF-9012", name: "Green Tempo 3", collectorIds: [7, 8, 9] },
    ],
  };
}

// ─── Households ───────────────────────────────────────────────────────

export function generateHouseholds(count: number = 100) {
  const rand = seededRandom(42); // Deterministic - same data every time
  const households = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / 4) % LAST_NAMES.length];
    const ward = WARDS[i % 3];
    const isActive = i < 95; // 95 active, 5 inactive

    households.push({
      id: i + 1,
      uid: `${DEMO_VILLAGE_ID}-H${String(i + 1).padStart(3, "0")}`,
      villageId: DEMO_VILLAGE_ID,
      headName: `${firstName} ${lastName}`,
      phone: `98${String(76500000 + i * 7).padStart(8, "0")}`,
      houseNumber: `H-${i + 1}`,
      ward,
      familySize: Math.floor(rand() * 6) + 2, // 2-7
      address: `${i + 1}, ${ward === "Ward-1" ? "Rajiv Gandhi Nagar" : ward === "Ward-2" ? "Gandhi Chowk" : "Ambedkar Colony"}, Sundernagar`,
      status: isActive ? "active" : "inactive",
      householdType: HOUSEHOLD_TYPES[i % HOUSEHOLD_TYPES.length],
      qrPrinted: i < 90, // 90 printed, 10 not
      generatorUserId: isActive ? `DEMO-GEN-${String(i + 1).padStart(3, "0")}` : null,
      generatorPassword: null,
      latitude: 15.4000 + (rand() - 0.5) * 0.02, // Cluster around Sundernagar
      longitude: 73.9000 + (rand() - 0.5) * 0.02,
      createdAt: new Date(2025, 5, 15 + Math.floor(i / 10)).toISOString(),
    });
  }

  return households;
}

// ─── Collectors ───────────────────────────────────────────────────────

export function generateCollectors() {
  return [
    { id: 1, uid: `${DEMO_VILLAGE_ID}-C1`, villageId: DEMO_VILLAGE_ID, name: "Ramesh Kumar", phone: "9876543210", isActive: true, assignedVehicle: "MH-12-AB-1234", createdAt: "2025-06-01T00:00:00Z" },
    { id: 2, uid: `${DEMO_VILLAGE_ID}-C2`, villageId: DEMO_VILLAGE_ID, name: "Sunil Yadav", phone: "9876543211", isActive: true, assignedVehicle: "MH-12-AB-1234", createdAt: "2025-06-01T00:00:00Z" },
    { id: 3, uid: `${DEMO_VILLAGE_ID}-C3`, villageId: DEMO_VILLAGE_ID, name: "Priya Kadam", phone: "9876543212", isActive: true, assignedVehicle: "MH-12-AB-1234", createdAt: "2025-06-01T00:00:00Z" },
    { id: 4, uid: `${DEMO_VILLAGE_ID}-C4`, villageId: DEMO_VILLAGE_ID, name: "Ganesh Patil", phone: "9876543213", isActive: true, assignedVehicle: "MH-12-CD-5678", createdAt: "2025-07-15T00:00:00Z" },
    { id: 5, uid: `${DEMO_VILLAGE_ID}-C5`, villageId: DEMO_VILLAGE_ID, name: "Deepak Mane", phone: "9876543214", isActive: true, assignedVehicle: "MH-12-CD-5678", createdAt: "2025-07-15T00:00:00Z" },
    { id: 6, uid: `${DEMO_VILLAGE_ID}-C6`, villageId: DEMO_VILLAGE_ID, name: "Savita Gaikwad", phone: "9876543215", isActive: true, assignedVehicle: "MH-12-CD-5678", createdAt: "2025-07-15T00:00:00Z" },
    { id: 7, uid: `${DEMO_VILLAGE_ID}-C7`, villageId: DEMO_VILLAGE_ID, name: "Yogesh Nikam", phone: "9876543216", isActive: true, assignedVehicle: "MH-12-EF-9012", createdAt: "2025-08-01T00:00:00Z" },
    { id: 8, uid: `${DEMO_VILLAGE_ID}-C8`, villageId: DEMO_VILLAGE_ID, name: "Kavita Thorat", phone: "9876543217", isActive: true, assignedVehicle: "MH-12-EF-9012", createdAt: "2025-08-01T00:00:00Z" },
    { id: 9, uid: `${DEMO_VILLAGE_ID}-C9`, villageId: DEMO_VILLAGE_ID, name: "Hemant Salunkhe", phone: "9876543218", isActive: true, assignedVehicle: "MH-12-EF-9012", createdAt: "2025-08-01T00:00:00Z" },
  ];
}

// ─── Field Workers ────────────────────────────────────────────────────

export function generateFieldWorkers() {
  return [
    { id: 1, uid: `${DEMO_VILLAGE_ID}-FW1`, villageId: DEMO_VILLAGE_ID, name: "Anjali Bhosale", phone: "9876543220", status: "active", createdAt: "2025-06-01T00:00:00Z" },
    { id: 2, uid: `${DEMO_VILLAGE_ID}-FW2`, villageId: DEMO_VILLAGE_ID, name: "Vikram Jadhav", phone: "9876543221", status: "active", createdAt: "2025-06-10T00:00:00Z" },
    { id: 3, uid: `${DEMO_VILLAGE_ID}-FW3`, villageId: DEMO_VILLAGE_ID, name: "Meena Sonawane", phone: "9876543222", status: "active", createdAt: "2025-07-01T00:00:00Z" },
  ];
}

// ─── Waste Collections ────────────────────────────────────────────────

export function generateCollections(days: number = 50, householdCount: number = 100) {
  const rand = seededRandom(123);
  const collectors = generateCollectors();
  const collections: any[] = [];
  let id = 1;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const date = getISTDate(dayOffset);
    const dayOfWeek = date.getDay(); // 0=Sun
    const isSunday = dayOfWeek === 0;

    // Realistic coverage: 70-85% weekdays, 40% Sundays
    const coverageRate = isSunday ? 0.4 : 0.7 + rand() * 0.15;

    for (let hIdx = 0; hIdx < householdCount; hIdx++) {
      if (hIdx >= 95) continue; // Inactive households don't get collected
      if (rand() > coverageRate) continue; // Skip based on coverage rate

      const collector = collectors[hIdx % collectors.length];
      const isMorning = rand() > 0.3; // 70% morning collections
      const hour = isMorning ? 6 + Math.floor(rand() * 4) : 14 + Math.floor(rand() * 3);
      const minute = Math.floor(rand() * 60);

      const collectionTime = new Date(date);
      collectionTime.setHours(hour, minute, 0, 0);

      // Status: 95% collected, 5% missed
      const isMissed = rand() < 0.05;

      // Rating distribution: shifts better for recent days (improvement trend)
      const recencyBonus = dayOffset < 14 ? 0.5 : 0;
      const ratingRoll = rand() + recencyBonus;
      const rating = isMissed
        ? null
        : ratingRoll > 0.85 ? 5
          : ratingRoll > 0.6 ? 4
            : ratingRoll > 0.35 ? 3
              : ratingRoll > 0.15 ? 2
                : 1;

      const wasteTypes = isMissed ? null : WASTE_TYPES_OPTIONS[Math.floor(rand() * WASTE_TYPES_OPTIONS.length)];

      collections.push({
        id: id++,
        householdId: hIdx + 1,
        collectorId: collector.id,
        collectionDate: formatTimestamp(collectionTime),
        segregationRating: rating,
        remarks: rating !== null && rating <= 2 ? pick(["Mixed waste found", "Needs improvement", "Wet and dry mixed"]) : null,
        photoUrl: null,
        voiceUrl: null,
        status: isMissed ? "missed" : "collected",
        missedReason: isMissed ? pick(MISSED_REASONS) : null,
        wasteTypes,
        weightKg: isMissed ? null : (0.5 + rand() * 2.5).toFixed(1),
        // Joined fields (as returned by the village collections API)
        householdUid: `${DEMO_VILLAGE_ID}-H${String(hIdx + 1).padStart(3, "0")}`,
        headName: `${FIRST_NAMES[hIdx % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(hIdx / 4) % LAST_NAMES.length]}`,
        houseNumber: `H-${hIdx + 1}`,
        collectorName: collector.name,
        collectorUid: collector.uid,
      });
    }
  }

  return collections;
}

// ─── Behaviour Stats ──────────────────────────────────────────────────

export function generateBehaviourStats(householdCount: number = 100) {
  const rand = seededRandom(456);
  const stats = [];

  for (let i = 0; i < householdCount; i++) {
    if (i >= 95) continue; // Skip inactive

    // 60% good, 25% average, 15% needs attention
    const roll = rand();
    const isGood = roll > 0.4;
    const isAverage = roll > 0.15 && roll <= 0.4;

    stats.push({
      id: i + 1,
      villageId: DEMO_VILLAGE_ID,
      householdId: i + 1,
      ward: WARDS[i % 3],
      totalCollections: Math.floor(30 + rand() * 120),
      collectionsLast7: isGood ? Math.floor(5 + rand() * 2) : isAverage ? Math.floor(3 + rand() * 2) : Math.floor(rand() * 2),
      collectionsLast30: isGood ? Math.floor(22 + rand() * 6) : isAverage ? Math.floor(12 + rand() * 8) : Math.floor(rand() * 8),
      avgRatingLast10: isGood
        ? (4.0 + rand()).toFixed(1)
        : isAverage
          ? (3.0 + rand() * 0.9).toFixed(1)
          : (1.0 + rand() * 1.9).toFixed(1),
      mixedCountLast7: isGood ? 0 : isAverage ? Math.floor(rand() * 2) : Math.floor(1 + rand() * 4),
      lastCollectionDate: getISTDate(isGood ? 0 : isAverage ? Math.floor(1 + rand() * 2) : Math.floor(3 + rand() * 12)).toISOString(),
      daysSinceLastCollection: isGood ? 0 : isAverage ? Math.floor(1 + rand() * 2) : Math.floor(3 + rand() * 12),
      lastCollectionType: isGood ? "segregated" : rand() > 0.5 ? "segregated" : "mixed",
      // Joined household fields
      headName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / 4) % LAST_NAMES.length]}`,
      houseNumber: `H-${i + 1}`,
      householdUid: `${DEMO_VILLAGE_ID}-H${String(i + 1).padStart(3, "0")}`,
      updatedAt: new Date().toISOString(),
    });
  }

  return stats;
}

// ─── Manager Stats (KPIs) ─────────────────────────────────────────────

export function generateManagerStats() {
  const rand = seededRandom(789);
  return {
    totalHouseholds: 100,
    totalCollectors: 9,
    openIssues: 3,
    collectionsToday: Math.floor(65 + rand() * 20),
  };
}

// ─── Collector Stats ──────────────────────────────────────────────────

export function generateCollectorStats() {
  const rand = seededRandom(321);
  const collectors = generateCollectors();
  return collectors.map((c) => ({
    collectorId: c.id,
    collectorName: c.name,
    collectionsCompleted: 180 + Math.floor(rand() * 80),
    avgRating: (3.5 + rand() * 1.3).toFixed(1),
  }));
}

// ─── Daily Summary (Collections tab) ──────────────────────────────────
// Must match: { date, needsAttention, households }

export function generateDailySummary(dateStr?: string) {
  const rand = seededRandom(dateStr ? dateStr.split("-").reduce((a, b) => a + parseInt(b), 0) : 99);
  const allHouseholds = generateHouseholds();
  const collectors = generateCollectors();
  const date = dateStr || getISTToday();

  // Build per-household status for the day
  const households = allHouseholds
    .filter((h) => h.status === "active")
    .map((h) => {
      // ~75% households collected on any given day
      const wasCollected = rand() < 0.75;
      const rating = wasCollected ? Math.ceil(rand() * 5) : null;
      const collector = collectors[Math.floor(rand() * collectors.length)];
      const collectionHour = 6 + Math.floor(rand() * 8); // 6 AM to 2 PM
      const collectionMin = Math.floor(rand() * 60);

      return {
        id: h.id,
        uid: h.uid,
        headName: h.headName,
        houseNumber: h.houseNumber,
        ward: h.ward,
        phone: h.phone,
        latitude: h.latitude,
        longitude: h.longitude,
        collected: wasCollected,
        segregationRating: rating,
        collectorName: wasCollected ? collector.name : null,
        collectionPhotoUrl: null,
        collectionVoiceUrl: null,
        collectionTime: wasCollected
          ? new Date(2025, 0, 1, collectionHour, collectionMin).toLocaleTimeString()
          : null,
      };
    });

  // Needs attention = collected with rating <= 3
  const needsAttention = households
    .filter((h) => h.collected && h.segregationRating !== null && h.segregationRating <= 3)
    .map((h) => ({
      householdId: h.id,
      uid: h.uid,
      headName: h.headName,
      houseNumber: h.houseNumber,
      ward: h.ward,
      phone: h.phone,
      latitude: h.latitude,
      longitude: h.longitude,
      segregationRating: h.segregationRating || 0,
      photoUrl: null,
      voiceUrl: null,
      collectorName: h.collectorName || "",
    }));

  return {
    date,
    needsAttention,
    households,
  };
}

// ─── Premium Analytics (Reports tab) ──────────────────────────────────
// Must match: { kpis, pulses, wardPerformance, materialData, vehicleStats, collectionTimeline }

export function generatePremiumAnalytics(dateStr?: string) {
  const rand = seededRandom(dateStr ? dateStr.split("-").reduce((a, b) => a + parseInt(b), 0) * 7 : 77);
  const collectors = generateCollectors();
  const village = generateVillage();

  const collectedToday = Math.floor(70 + rand() * 20);
  const collectedYesterday = Math.floor(65 + rand() * 20);
  const totalHouseholds = 100;
  const segSum = collectedToday * (3.5 + rand() * 1.0);

  // KPIs
  const kpis = {
    totalHouseholds,
    collectedToday,
    collectedYesterday,
    nonCollectedToday: totalHouseholds - collectedToday,
    avgSegregationRating: collectedToday > 0 ? parseFloat((segSum / collectedToday).toFixed(2)) : 0,
  };

  // 7-day pulse
  const pulses = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const cc = Math.floor(60 + rand() * 30);
    return {
      day: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      collections: cc,
      rating: parseFloat((3.0 + rand() * 1.8).toFixed(1)),
    };
  });

  // Ward performance
  const wardPerformance = WARDS.map((wardName) => {
    const total = Math.floor(totalHouseholds / 3);
    const collected = Math.floor(total * (0.6 + rand() * 0.3));
    return { name: wardName, total, collected, nonCollected: total - collected };
  });

  // Material data (5 waste categories in kg)
  const materialData = {
    wet: parseFloat((40 + rand() * 30).toFixed(1)),
    dry: parseFloat((15 + rand() * 20).toFixed(1)),
    sanitary: parseFloat((2 + rand() * 5).toFixed(1)),
    specialCare: parseFloat((rand() * 3).toFixed(1)),
    mixed: parseFloat((5 + rand() * 10).toFixed(1)),
    isLogged: true,
    source: "manager" as const,
  };

  // Vehicle stats with sessions (must match DerivedSession shape)
  const vehicleStats = village.vehicles.map((v) => {
    const vCollectors = collectors.filter((c) => v.collectorIds.includes(c.id));
    const totalCount = Math.floor(30 + rand() * 15);
    const startMin = 30 + Math.floor(rand() * 30);
    const endHour = 13 + Math.floor(rand() * 2);
    const endMin = Math.floor(rand() * 60);

    // Build proper dates
    const today = new Date();
    const s1Start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, startMin, 0);
    const s1End = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30 + Math.floor(rand() * 30), 0);
    const s2Start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, Math.floor(rand() * 30), 0);
    const s2End = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin, 0);

    const s1Duration = s1End.getTime() - s1Start.getTime();
    const s1s2Break = s2Start.getTime() - s1End.getTime();
    const s2Duration = s2End.getTime() - s2Start.getTime();

    return {
      registrationNumber: v.registrationNumber,
      vehicleName: v.name,
      collectorNames: vCollectors.map((c) => c.name).join(", "),
      count: totalCount,
      startTime: s1Start.toISOString(),
      endTime: s2End.toISOString(),
      sessions: [
        {
          index: 1,
          startTime: s1Start.toISOString(),
          endTime: s1End.toISOString(),
          count: Math.floor(totalCount * 0.6),
          durationMs: s1Duration,
          breakBeforeMs: 0,
        },
        {
          index: 2,
          startTime: s2Start.toISOString(),
          endTime: s2End.toISOString(),
          count: Math.floor(totalCount * 0.4),
          durationMs: s2Duration,
          breakBeforeMs: s1s2Break,
        },
      ],
      totalWorkMs: s1Duration + s2Duration,
      totalBreakMs: s1s2Break,
    };
  });

  // Hourly collection timeline
  const vehicleNames = village.vehicles.map((v) => v.name);
  const vehicleColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];
  const hourly = [];
  for (let h = 5; h <= 18; h++) {
    const slot: any = {
      hour: `${h > 12 ? h - 12 : h}${h >= 12 ? "PM" : "AM"}`,
    };
    const isMorningPeak = h >= 7 && h <= 10;
    const isAfternoonPeak = h >= 14 && h <= 16;
    for (const vName of vehicleNames) {
      slot[vName] = isMorningPeak
        ? Math.floor(6 + rand() * 5)
        : isAfternoonPeak
          ? Math.floor(3 + rand() * 3)
          : Math.floor(rand() * 2);
    }
    hourly.push(slot);
  }

  const collectionTimeline = {
    vehicles: vehicleNames.map((name, i) => ({
      name,
      color: vehicleColors[i % vehicleColors.length],
    })),
    hourly,
  };

  return {
    kpis,
    pulses,
    wardPerformance,
    materialData,
    vehicleStats,
    collectionTimeline,
  };
}

// ─── Material Logs (Daily Waste, Compost, Sales) ──────────────────────

export function generateDailyWasteLogs() {
  return [
    {
      id: 1, villageId: DEMO_VILLAGE_ID, date: getISTDate(1).toISOString().split("T")[0],
      wetWasteKg: "45.5", dryWasteKg: "18.2", specialCareWasteKg: "1.5",
      sanitaryWasteKg: "3.8", mixedWasteKg: "7.0",
      notes: "Normal collection day. Slightly higher wet waste due to market leftovers.",
      createdAt: getISTDate(1).toISOString(), createdBy: "DEMO-MGR-001",
    },
    {
      id: 2, villageId: DEMO_VILLAGE_ID, date: getISTDate(2).toISOString().split("T")[0],
      wetWasteKg: "52.0", dryWasteKg: "22.5", specialCareWasteKg: "0.8",
      sanitaryWasteKg: "4.2", mixedWasteKg: "5.5",
      notes: "Good segregation observed across most wards.",
      createdAt: getISTDate(2).toISOString(), createdBy: "DEMO-MGR-001",
    },
    {
      id: 3, villageId: DEMO_VILLAGE_ID, date: getISTDate(3).toISOString().split("T")[0],
      wetWasteKg: "38.0", dryWasteKg: "15.0", specialCareWasteKg: "2.1",
      sanitaryWasteKg: "3.0", mixedWasteKg: "9.2",
      notes: "Higher mixed waste from Ward-3 - awareness drive needed.",
      createdAt: getISTDate(3).toISOString(), createdBy: "DEMO-MGR-001",
    },
    {
      id: 4, villageId: DEMO_VILLAGE_ID, date: getISTDate(5).toISOString().split("T")[0],
      wetWasteKg: "48.8", dryWasteKg: "20.0", specialCareWasteKg: "1.0",
      sanitaryWasteKg: "3.5", mixedWasteKg: "6.0",
      notes: "",
      createdAt: getISTDate(5).toISOString(), createdBy: "DEMO-MGR-001",
    },
  ];
}

export function generateCompostLogs() {
  return [
    {
      id: 1, villageId: DEMO_VILLAGE_ID, date: getISTDate(1).toISOString().split("T")[0],
      quantityKg: "12.5", compostStatus: "good" as const,
      photoUrl: "", notes: "Dark brown, earthy smell. Ready for distribution.",
      createdAt: getISTDate(1).toISOString(), createdBy: "DEMO-MGR-001",
    },
    {
      id: 2, villageId: DEMO_VILLAGE_ID, date: getISTDate(3).toISOString().split("T")[0],
      quantityKg: "8.0", compostStatus: "average" as const,
      photoUrl: "", notes: "Needs 2 more days of curing.",
      createdAt: getISTDate(3).toISOString(), createdBy: "DEMO-MGR-001",
    },
    {
      id: 3, villageId: DEMO_VILLAGE_ID, date: getISTDate(7).toISOString().split("T")[0],
      quantityKg: "15.0", compostStatus: "good" as const,
      photoUrl: "", notes: "Batch #5 completed. 15kg total output from last week's input.",
      createdAt: getISTDate(7).toISOString(), createdBy: "DEMO-MGR-001",
    },
  ];
}

export function generateDryWasteSales() {
  return [
    {
      id: 1, villageId: DEMO_VILLAGE_ID, saleDate: getISTDate(2).toISOString().split("T")[0],
      buyerName: "Mahesh Recyclers", buyerPhone: "9988776655",
      totalQuantityKg: "45.0", totalAmount: "1350",
      receiptPhotoUrl: "", notes: "Monthly pickup by regular buyer.",
      createdAt: getISTDate(2).toISOString(), createdBy: "DEMO-MGR-001",
      materials: [
        { id: 1, saleId: 1, materialType: "Plastic (PET Bottles)", quantityKg: "15.0", ratePerKg: "25", amount: "375" },
        { id: 2, saleId: 1, materialType: "Paper/Cardboard", quantityKg: "20.0", ratePerKg: "12", amount: "240" },
        { id: 3, saleId: 1, materialType: "Metal (Iron)", quantityKg: "10.0", ratePerKg: "73.5", amount: "735" },
      ],
    },
    {
      id: 2, villageId: DEMO_VILLAGE_ID, saleDate: getISTDate(8).toISOString().split("T")[0],
      buyerName: "Green Earth E-Waste", buyerPhone: "9876512345",
      totalQuantityKg: "8.0", totalAmount: "2400",
      receiptPhotoUrl: "", notes: "E-waste collection from special drive.",
      createdAt: getISTDate(8).toISOString(), createdBy: "DEMO-MGR-001",
      materials: [
        { id: 4, saleId: 2, materialType: "E-Waste", quantityKg: "8.0", ratePerKg: "300", amount: "2400" },
      ],
    },
  ];
}

export function generateCollectorWasteLogSummary() {
  return {
    wetWasteKg: 42.5,
    dryWasteKg: 17.0,
    specialCareWasteKg: 1.2,
    sanitaryWasteKg: 3.5,
    mixedWasteKg: 6.8,
    entryCount: 3,
  };
}

// ─── Announcements ────────────────────────────────────────────────────

export function generateAnnouncements() {
  return [
    {
      id: 1,
      message: "Diwali schedule update: No collection service on Oct 31 and Nov 1. Please store waste safely and we will resume on Nov 2.",
      targetAudience: "all",
      villageId: DEMO_VILLAGE_ID,
      createdBy: "DEMO-MGR-001",
      photoUrl: null,
      createdAt: getISTDate(2).toISOString(),
    },
    {
      id: 2,
      message: "New dry waste collection center opened at Gandhi Chowk! Drop off recyclables between 9 AM - 5 PM.",
      targetAudience: "all",
      villageId: DEMO_VILLAGE_ID,
      createdBy: "DEMO-MGR-001",
      photoUrl: null,
      createdAt: getISTDate(5).toISOString(),
    },
    {
      id: 3,
      message: "Segregation drive: Households with consistent 5★ ratings this month will receive free compost bags.",
      targetAudience: "generators",
      villageId: DEMO_VILLAGE_ID,
      createdBy: "DEMO-MGR-001",
      photoUrl: null,
      createdAt: getISTDate(8).toISOString(),
    },
    {
      id: 4,
      message: "Heavy rain alert: Please keep waste indoors and ensure bins are covered. Collection may be delayed by 1 hour.",
      targetAudience: "all",
      villageId: DEMO_VILLAGE_ID,
      createdBy: "DEMO-MGR-001",
      photoUrl: null,
      createdAt: getISTDate(12).toISOString(),
    },
    {
      id: 5,
      message: "Monthly performance report for September is now available in the Reports tab.",
      targetAudience: "managers",
      villageId: DEMO_VILLAGE_ID,
      createdBy: "DEMO-MGR-001",
      photoUrl: null,
      createdAt: getISTDate(15).toISOString(),
    },
  ];
}

// ─── Issues ───────────────────────────────────────────────────────────

export function generateIssues() {
  return [
    {
      id: 1,
      title: "Missed collection on MG Road for 3 consecutive days",
      description: "Houses H-15 to H-20 on MG Road have not been serviced since Monday. Residents are complaining about smell.",
      category: "missed_collection",
      status: "open",
      reportedBy: "DEMO-GEN-015",
      villageId: DEMO_VILLAGE_ID,
      photoUrl: null,
      managerReply: null,
      managerProofPhotoUrl: null,
      createdAt: getISTDate(1).toISOString(),
      updatedAt: getISTDate(1).toISOString(),
    },
    {
      id: 2,
      title: "Stray dogs tearing garbage bags in Ward-2",
      description: "Multiple households in Gandhi Chowk area are affected. Bins need lids or the bags need to be collected earlier.",
      category: "sanitation",
      status: "in_progress",
      reportedBy: "DEMO-GEN-042",
      villageId: DEMO_VILLAGE_ID,
      photoUrl: null,
      managerReply: "We are ordering bin covers for Ward-2. Expected delivery by next week.",
      managerProofPhotoUrl: null,
      createdAt: getISTDate(5).toISOString(),
      updatedAt: getISTDate(3).toISOString(),
    },
    {
      id: 3,
      title: "Broken compost bin at community center",
      description: "The large compost bin near the community center has a crack and is leaking. Needs replacement.",
      category: "infrastructure",
      status: "resolved",
      reportedBy: "DEMO-V001-C2",
      villageId: DEMO_VILLAGE_ID,
      photoUrl: null,
      managerReply: "New bin installed on March 20. Old one removed.",
      managerProofPhotoUrl: null,
      createdAt: getISTDate(20).toISOString(),
      updatedAt: getISTDate(10).toISOString(),
    },
    {
      id: 4,
      title: "Collection truck too loud at 6 AM",
      description: "The Green Tempo 1 vehicle is very noisy early morning. Can collection start at 7 AM instead?",
      category: "complaint",
      status: "open",
      reportedBy: "DEMO-GEN-008",
      villageId: DEMO_VILLAGE_ID,
      photoUrl: null,
      managerReply: null,
      managerProofPhotoUrl: null,
      createdAt: getISTDate(3).toISOString(),
      updatedAt: getISTDate(3).toISOString(),
    },
  ];
}

// ─── Feedback ─────────────────────────────────────────────────────────

export function generateFeedback() {
  return [
    { id: 1, fromHouseholdId: 5, toCollectorId: 1, rating: 5, remarks: "Very punctual and polite!", createdAt: getISTDate(1).toISOString() },
    { id: 2, fromHouseholdId: 12, toCollectorId: 1, rating: 4, remarks: "Good service", createdAt: getISTDate(2).toISOString() },
    { id: 3, fromHouseholdId: 25, toCollectorId: 2, rating: 3, remarks: "Sometimes late", createdAt: getISTDate(3).toISOString() },
    { id: 4, fromHouseholdId: 42, toCollectorId: 3, rating: 5, remarks: "Excellent! Always on time.", createdAt: getISTDate(1).toISOString() },
    { id: 5, fromHouseholdId: 60, toCollectorId: 3, rating: 4, remarks: null, createdAt: getISTDate(5).toISOString() },
    { id: 6, fromHouseholdId: 78, toCollectorId: 4, rating: 2, remarks: "Missed my house twice this week", createdAt: getISTDate(2).toISOString() },
    { id: 7, fromHouseholdId: 33, toCollectorId: 2, rating: 5, remarks: "Very respectful", createdAt: getISTDate(7).toISOString() },
    { id: 8, fromHouseholdId: 91, toCollectorId: 4, rating: 4, remarks: "Good overall", createdAt: getISTDate(4).toISOString() },
  ];
}

// ─── QR Codes (individual records, grouped by batchId in UI) ──────────

export function generateQRCodes() {
  // Single batch with 9 QR codes - one per collector
  const codes = [];
  for (let i = 1; i <= 9; i++) {
    codes.push({
      id: i,
      batchId: "BATCH-DEMO-001",
      villageId: DEMO_VILLAGE_ID,
      qrCode: `${DEMO_VILLAGE_ID}-QR-${String(i).padStart(3, "0")}`,
      status: i <= 7 ? "mapped" : "unmapped",
      householdId: i <= 7 ? i : null,
      createdAt: "2025-06-15T00:00:00Z",
    });
  }
  return codes;
}

// ─── Attendance ───────────────────────────────────────────────────────

export function generateAttendanceCenters() {
  return [
    {
      id: 1,
      name: "Gram Panchayat Office",
      villageId: DEMO_VILLAGE_ID,
      latitude: 15.4005,
      longitude: 73.9010,
      radiusMeters: 100,
      isActive: true,
    },
  ];
}

export function generateAttendanceDaily(workerType?: string) {
  const collectors = generateCollectors();
  const fieldWorkers = generateFieldWorkers();

  // Helpers & segregators (different staff from collectors)
  const helpers = [
    { uid: `${DEMO_VILLAGE_ID}-HLP1`, name: "Ravi Kale", workType: "helper" },
    { uid: `${DEMO_VILLAGE_ID}-HLP2`, name: "Pushpa Chavan", workType: "helper" },
  ];
  const segregators = [
    { uid: `${DEMO_VILLAGE_ID}-SEG1`, name: "Suman Deshmukh", workType: "segregator" },
    { uid: `${DEMO_VILLAGE_ID}-SEG2`, name: "Lata Pawar", workType: "segregator" },
    { uid: `${DEMO_VILLAGE_ID}-SEG3`, name: "Jaya Shinde", workType: "segregator" },
  ];

  // Helper: generate a realistic shift for a present worker
  const today = new Date();
  const makeShift = (startHour: number, durationHours: number) => {
    const start = new Date(today);
    start.setHours(startHour, Math.floor(Math.random() * 30), 0, 0);
    const end = new Date(start.getTime() + durationHours * 3600000);
    return {
      id: Math.floor(Math.random() * 10000),
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      centerName: "Gram Panchayat Office",
    };
  };

  const addShifts = (attendance: string) => {
    if (attendance === "present") return [makeShift(6, 5)];
    if (attendance === "half_day") return [makeShift(7, 3)];
    return []; // absent = no shifts
  };

  // Build workers based on type filter
  let workers: any[] = [];

  if (!workerType || workerType === "collector") {
    workers = [
      ...workers,
      ...collectors.map((c, i) => {
        const attendance = i < 7 ? "present" : i < 8 ? "half_day" : "absent";
        return {
          workerId: c.uid,
          workerName: c.name,
          workType: "collector",
          attendance,
          shifts: addShifts(attendance),
        };
      }),
    ];
  }
  if (!workerType || workerType === "helper") {
    workers = [
      ...workers,
      ...helpers.map((h, i) => {
        const attendance = i === 0 ? "present" : "absent";
        return {
          workerId: h.uid,
          workerName: h.name,
          workType: "helper",
          attendance,
          shifts: addShifts(attendance),
        };
      }),
    ];
  }
  if (!workerType || workerType === "segregator") {
    workers = [
      ...workers,
      ...segregators.map((s, i) => {
        const attendance = i < 2 ? "present" : "half_day";
        return {
          workerId: s.uid,
          workerName: s.name,
          workType: "segregator",
          attendance,
          shifts: addShifts(attendance),
        };
      }),
    ];
  }
  if (!workerType || workerType === "fieldworker") {
    workers = [
      ...workers,
      ...fieldWorkers.map((fw, i) => {
        const attendance = i < 2 ? "present" : "absent";
        return {
          workerId: fw.uid,
          workerName: fw.name,
          workType: "fieldworker",
          attendance,
          shifts: addShifts(attendance),
        };
      }),
    ];
  }

  return { workers };
}

// ─── Staff ────────────────────────────────────────────────────────────

export function generateStaff(type?: string) {
  const collectors = generateCollectors().map((c) => ({ ...c, type: "collector" }));
  // Offset fieldworker IDs to avoid duplicate key warnings
  const fieldWorkers = generateFieldWorkers().map((fw) => ({ ...fw, id: 100 + fw.id, type: "fieldworker" }));
  const all = [...collectors, ...fieldWorkers];

  if (type === "collector") return collectors;
  if (type === "fieldworker") return fieldWorkers;
  return all;
}

// ─── Audit Logs (Activity Log) ────────────────────────────────────────

export function generateAuditLogs() {
  return [
    { id: 1, action: "household_created", entityType: "household", entityId: "H-095", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Added household H-095 (Rajesh Gaikwad)", createdAt: getISTDate(0).toISOString() },
    { id: 2, action: "collection_completed", entityType: "collection", entityId: "COL-890", userId: "DEMO-V001-C1", userName: "Ramesh Kumar", details: "Collected waste from 28 households", createdAt: getISTDate(0).toISOString() },
    { id: 3, action: "announcement_sent", entityType: "announcement", entityId: "ANN-12", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Sent announcement to all residents", createdAt: getISTDate(1).toISOString() },
    { id: 4, action: "issue_resolved", entityType: "issue", entityId: "ISS-3", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Replaced broken bin at Ward-2 bus stop", createdAt: getISTDate(1).toISOString() },
    { id: 5, action: "qr_batch_generated", entityType: "qr", entityId: "BATCH-DEMO-001", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Generated batch of 9 QR codes", createdAt: getISTDate(2).toISOString() },
    { id: 6, action: "attendance_marked", entityType: "attendance", entityId: "ATT-45", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Marked attendance for 9 collectors", createdAt: getISTDate(2).toISOString() },
    { id: 7, action: "collector_added", entityType: "collector", entityId: "C9", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Added collector Hemant Salunkhe to Green Tempo 3", createdAt: getISTDate(3).toISOString() },
    { id: 8, action: "waste_log_created", entityType: "waste_log", entityId: "WL-4", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Logged daily waste: 48.8kg wet, 20.0kg dry", createdAt: getISTDate(5).toISOString() },
    { id: 9, action: "vehicle_assigned", entityType: "vehicle", entityId: "MH-12-EF-9012", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Assigned Green Tempo 3 to 3 collectors", createdAt: getISTDate(7).toISOString() },
    { id: 10, action: "compost_sale", entityType: "sale", entityId: "SALE-2", userId: "DEMO-MGR-001", userName: "Amit Deshmukh", details: "Sold 8kg e-waste to Green Earth E-Waste (₹2,400)", createdAt: getISTDate(8).toISOString() },
  ];
}

// ─── Household Types (for fieldworker) ────────────────────────────────

export function generateHouseholdTypes() {
  return [
    { type: "residential_small", label: "Residential (Small)", count: 70 },
    { type: "residential_large", label: "Residential (Large)", count: 15 },
    { type: "commercial_shop", label: "Commercial Shop", count: 10 },
    { type: "bulk_generator", label: "Bulk Generator", count: 3 },
    { type: "institutional", label: "Institutional", count: 2 },
  ];
}

// ─── Moderator Data ───────────────────────────────────────────────────

export function generateModeratorVillages() {
  return [
    {
      id: 1, villageId: DEMO_VILLAGE_ID, name: "Sundernagar",
      unitType: "village",
      totalHouseholds: 100, totalCollectors: 9, openIssues: 3,
      managerPhone: "9876500001",
    },
    {
      id: 2, villageId: "DEMO-V002", name: "Chandanpur",
      unitType: "village",
      totalHouseholds: 75, totalCollectors: 6, openIssues: 1,
      managerPhone: "9876500002",
    },
    {
      id: 3, villageId: "DEMO-V003", name: "Lakshminagar",
      unitType: "village",
      totalHouseholds: 60, totalCollectors: 4, openIssues: 0,
      managerPhone: "9876500003",
    },
  ];
}

export function generateModeratorOverviewStats(dateStr?: string) {
  const seed = dateStr ? dateStr.split("-").reduce((a, b) => a + parseInt(b), 0) * 3 : 555;
  const rand = seededRandom(seed);
  const villages = generateModeratorVillages();

  const villageStats = villages.map(v => {
    const collected = Math.floor(v.totalHouseholds * (0.6 + rand() * 0.3));
    return {
      villageId: v.villageId,
      name: v.name,
      totalHouseholds: v.totalHouseholds,
      collectionsToday: collected,
      collectionRate: Math.round((collected / v.totalHouseholds) * 100),
      avgRating: parseFloat((3.0 + rand() * 1.8).toFixed(1)),
      openIssues: v.openIssues,
    };
  });

  villageStats.sort((a, b) => a.collectionRate - b.collectionRate);

  const totalHouseholds = villageStats.reduce((s, v) => s + v.totalHouseholds, 0);
  const collectionsToday = villageStats.reduce((s, v) => s + v.collectionsToday, 0);
  const totalRating = villageStats.reduce((s, v) => s + v.avgRating * v.collectionsToday, 0);

  return {
    aggregate: {
      totalVillages: villages.length,
      totalHouseholds,
      collectionsToday,
      notCollectedToday: totalHouseholds - collectionsToday,
      avgRating: collectionsToday > 0 ? parseFloat((totalRating / collectionsToday).toFixed(1)) : 0,
      openIssues: villageStats.reduce((s, v) => s + v.openIssues, 0),
    },
    villages: villageStats,
  };
}

export function generateModeratorManagers() {
  return [
    { userId: "DEMO-MGR-001", name: "Amit Deshmukh", phone: "9876500001", villageName: "Sundernagar", villageId: DEMO_VILLAGE_ID },
    { userId: "DEMO-MGR-002", name: "Neha Kulkarni", phone: "9876500002", villageName: "Chandanpur", villageId: "DEMO-V002" },
    { userId: "DEMO-MGR-003", name: "Ravi Pawar", phone: "9876500003", villageName: "Lakshminagar", villageId: "DEMO-V003" },
  ];
}

export function generateModeratorIssues() {
  const baseIssues = generateIssues();
  return [
    ...baseIssues,
    {
      id: 5,
      title: "Irregular collection schedule in Ward-1",
      description: "Households report that waste collection happens at different times each day, making it hard to keep waste ready.",
      category: "missed_collection",
      status: "open",
      reportedBy: "GEN-V002-015",
      villageId: "DEMO-V002",
      photoUrl: null,
      managerReply: null,
      managerProofPhotoUrl: null,
      createdAt: getISTDate(2).toISOString(),
      updatedAt: getISTDate(2).toISOString(),
    },
    {
      id: 6,
      title: "Compost pit overflow at community garden",
      description: "The compost pit at Lakshminagar community garden is full and needs expansion or emptying.",
      category: "infrastructure",
      status: "in_progress",
      reportedBy: "GEN-V003-008",
      villageId: "DEMO-V003",
      photoUrl: null,
      managerReply: "Expansion work started. Expected completion by next week.",
      managerProofPhotoUrl: null,
      createdAt: getISTDate(4).toISOString(),
      updatedAt: getISTDate(1).toISOString(),
    },
  ];
}

// ─── Memoized Getters ─────────────────────────────────────────────────
// Use these instead of calling generateXxx() directly.
// Ensures consistent object references + avoids re-computation.

let _households: ReturnType<typeof generateHouseholds> | null = null;
let _collections: ReturnType<typeof generateCollections> | null = null;
let _behaviourStats: ReturnType<typeof generateBehaviourStats> | null = null;
let _collectors: ReturnType<typeof generateCollectors> | null = null;
let _collectorStats: ReturnType<typeof generateCollectorStats> | null = null;
let _fieldWorkers: ReturnType<typeof generateFieldWorkers> | null = null;
let _village: ReturnType<typeof generateVillage> | null = null;
let _managerStats: ReturnType<typeof generateManagerStats> | null = null;
let _announcements: ReturnType<typeof generateAnnouncements> | null = null;
let _issues: ReturnType<typeof generateIssues> | null = null;
let _feedback: ReturnType<typeof generateFeedback> | null = null;
let _qrCodes: ReturnType<typeof generateQRCodes> | null = null;
let _attendanceCenters: ReturnType<typeof generateAttendanceCenters> | null = null;
let _householdTypes: ReturnType<typeof generateHouseholdTypes> | null = null;
let _moderatorVillages: ReturnType<typeof generateModeratorVillages> | null = null;
let _moderatorManagers: ReturnType<typeof generateModeratorManagers> | null = null;
let _moderatorIssues: ReturnType<typeof generateModeratorIssues> | null = null;

export function getHouseholds() { return _households ??= generateHouseholds(); }
export function getCollections() { return _collections ??= generateCollections(); }
export function getBehaviourStats() { return _behaviourStats ??= generateBehaviourStats(); }
export function getCollectors() { return _collectors ??= generateCollectors(); }
export function getCollectorStats() { return _collectorStats ??= generateCollectorStats(); }
export function getFieldWorkers() { return _fieldWorkers ??= generateFieldWorkers(); }
export function getVillage() { return _village ??= generateVillage(); }
export function getManagerStats() { return _managerStats ??= generateManagerStats(); }
export function getAnnouncements() { return _announcements ??= generateAnnouncements(); }
export function getIssues() { return _issues ??= generateIssues(); }
export function getFeedback() { return _feedback ??= generateFeedback(); }
export function getQRCodes() { return _qrCodes ??= generateQRCodes(); }
export function getAttendanceCenters() { return _attendanceCenters ??= generateAttendanceCenters(); }
export function getHouseholdTypes() { return _householdTypes ??= generateHouseholdTypes(); }
export function getModeratorVillages() { return _moderatorVillages ??= generateModeratorVillages(); }
export function getModeratorManagers() { return _moderatorManagers ??= generateModeratorManagers(); }
export function getModeratorIssues() { return _moderatorIssues ??= generateModeratorIssues(); }

/** Reset all cached data - called on demo reset */
export function clearMemoizedData() {
  _households = _collections = _behaviourStats = _collectors = null;
  _collectorStats = _fieldWorkers = _village = _managerStats = null;
  _announcements = _issues = _feedback = _qrCodes = null;
  _attendanceCenters = _householdTypes = null;
  _moderatorVillages = _moderatorManagers = _moderatorIssues = null;
}
