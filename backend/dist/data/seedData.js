"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISTRICT_COORDS = exports.TN_DISTRICTS = void 0;
exports.buildSeedData = buildSeedData;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.TN_DISTRICTS = [
    'Tirunelveli',
    'Chennai',
    'Coimbatore',
    'Madurai',
    'Tiruchirappalli',
    'Salem',
    'Erode',
    'Vellore',
    'Thanjavur',
    'Thoothukudi',
    'Kanyakumari',
    'Dindigul',
    'Tiruppur',
    'Cuddalore',
    'Kanchipuram',
];
exports.DISTRICT_COORDS = {
    Tirunelveli: { lat: 8.7139, lng: 77.7567, code: 'TIR' },
    Chennai: { lat: 13.0827, lng: 80.2707, code: 'CHE' },
    Coimbatore: { lat: 11.0168, lng: 76.9558, code: 'CBE' },
    Madurai: { lat: 9.9252, lng: 78.1198, code: 'MDU' },
    Tiruchirappalli: { lat: 10.7905, lng: 78.7047, code: 'TPJ' },
    Salem: { lat: 11.6643, lng: 78.146, code: 'SLM' },
    Erode: { lat: 11.341, lng: 77.7172, code: 'ERD' },
    Vellore: { lat: 12.9165, lng: 79.1325, code: 'VEL' },
    Thanjavur: { lat: 10.787, lng: 79.1378, code: 'TNJ' },
    Thoothukudi: { lat: 8.7642, lng: 78.1348, code: 'TUT' },
    Kanyakumari: { lat: 8.0883, lng: 77.5385, code: 'KNY' },
    Dindigul: { lat: 10.3673, lng: 77.9803, code: 'DGL' },
    Tiruppur: { lat: 11.1085, lng: 77.3411, code: 'TPR' },
    Cuddalore: { lat: 11.748, lng: 79.7714, code: 'CUD' },
    Kanchipuram: { lat: 12.8342, lng: 79.7036, code: 'KCH' },
};
const CATEGORIES = [
    'ROAD_DAMAGE',
    'STREET_LIGHT',
    'ELECTRICAL_WIRE',
    'GARBAGE_WASTE',
    'STORM_WATER_DRAIN',
    'PUBLIC_SPACE',
];
const STATUSES = [
    'SUBMITTED',
    'ACCEPTED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'REJECTED',
];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SAMPLE_DESCRIPTIONS = {
    ROAD_DAMAGE: [
        'Deep potholes on Main Bazaar Road causing heavy traffic congestion and two-wheeler accidents.',
        'Asphalt washed away after recent monsoon rains near Bus Stand junction.',
        'Dangerous sinkhole opening near Government High School gate.',
        'Cracked pavement and missing kerb stones along South Car Street.',
    ],
    STREET_LIGHT: [
        'Entire stretch of Street Lights not functioning for past 5 days, unsafe for women pedestrians.',
        'High mast light in Market Square flickering violently throughout night.',
        'Underground cable short circuit caused 6 poles to go dark near Railway Colony.',
        'Damaged lamp pole tilted hazardously over the road after tree branch fall.',
    ],
    ELECTRICAL_WIRE: [
        'Low hanging overhead high tension wire touching bus roof near vegetable market.',
        'Sparks flying from municipal junction transformer during morning hours.',
        'Open exposed fuse box on public road within reach of schoolchildren.',
        'Loose wire sagging into rainwater pool near bus stop.',
    ],
    GARBAGE_WASTE: [
        'Overflowing municipal garbage bin blocking pedestrian walkway for over a week.',
        'Illegal construction debris dumping along river bank area.',
        'Plastic and poultry waste dumped near residential apartment complex.',
        'Commercial bio-waste dumped near water body leading to severe foul smell.',
    ],
    STORM_WATER_DRAIN: [
        'Storm water drainage completely clogged with silt, overflowing during mild rain.',
        'Broken drain slab with iron rebars exposed, posing fatal risk to two-wheelers.',
        'Foul-smelling sewage backing up into roadside channel near residential block.',
        'Missing manhole cover over 8-feet deep storm water conduit.',
    ],
    PUBLIC_SPACE: [
        'Broken benches and damaged children swing sets at Corporation Park.',
        'Encroachment of pedestrian footpath by illegal commercial hoardings.',
        'Damaged public water distribution tap leading to huge freshwater wastage.',
        'Public bus shelter roof collapsed and requires urgent structural restoration.',
    ],
};
const SAMPLE_PHOTO_PAIRS = {
    ROAD_DAMAGE: {
        before: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        after: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    },
    STREET_LIGHT: {
        before: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80',
        after: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
    },
    ELECTRICAL_WIRE: {
        before: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        after: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    },
    GARBAGE_WASTE: {
        before: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
        after: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
    },
    STORM_WATER_DRAIN: {
        before: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80',
        after: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
    },
    PUBLIC_SPACE: {
        before: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&auto=format&fit=crop&q=80',
        after: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
    },
};
function buildSeedData() {
    // 1. Controller (Single Authority Account: nowfal@gmail.com / Admin@123)
    const controllerPasswordHash = bcryptjs_1.default.hashSync('Admin@123', 8);
    const admins = [
        {
            id: 'usr-controller-001',
            username: 'nowfal',
            name: 'Nowfal (State Civic Controller)',
            email: 'nowfal@gmail.com',
            phone: '+919840111000',
            password: controllerPasswordHash,
            role: 'ADMIN',
            location: 'Chennai',
            designation: 'State Chief Controller General',
            department: 'Municipal Administration & Civic Control',
            avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            fraudScore: 0,
            isBanned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];
    return {
        users: admins,
        complaints: [],
        stats: {
            adminsCount: 1,
            officersCount: 0,
            citizensCount: 0,
            complaintsCount: 0,
            photosCount: 0,
            fraudFlagsCount: 0,
        },
    };
}
