"use strict";
/**
 * Cloud Function: computeMissingForms
 *
 * Computes a denormalized `missing_form_submissions` collection by
 * cross-referencing users (who should submit) with form submissions
 * (who actually submitted) for each open activity form window.
 *
 * Exposed as:
 *   1. Scheduled function — runs every 6 hours
 *   2. HTTP callable — for manual trigger from admin CMS
 *
 * Cost-optimized:
 *   - Only processes OPEN form windows
 *   - Batch writes (500 ops per batch)
 *   - Deletes stale docs for closed/expired windows
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMissingFormsHttp = exports.computeMissingFormsScheduled = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
const FORM_MAPPINGS = [
    { formType: "ICT", collection: "ict_form_data", roles: ["TEACHER"], responsibility: "ICT" },
    { formType: "Library", collection: "library_form_data", roles: ["TEACHER"], responsibility: "Library" },
    { formType: "Science Lab", collection: "science_lab_form_data", roles: ["TEACHER"], responsibility: "Science Lab" },
    { formType: "Self Defence", collection: "self_defense_form_data", roles: ["TEACHER"], responsibility: "Self Defence" },
    { formType: "Vocational Education", collection: "vocational_education_form_data", roles: ["TEACHER"], responsibility: "Vocational Education" },
    { formType: "KGBV", collection: "kgbv_form_data", roles: ["KGBV_WARDEN"] },
    { formType: "NSCBAV", collection: "nscbav_form_data", roles: ["NSCBAV_WARDEN"] },
    { formType: "IE School Visit", collection: "ie_school_visit_data", roles: ["IE_RESOURCE_PERSON"] },
    { formType: "IE Home Visit", collection: "ie_home_visit_data", roles: ["IE_RESOURCE_PERSON"] },
];
const FORM_TYPE_TO_ACTIVITY_NAME = {
    "ICT": "ICT",
    "Library": "Library",
    "Science Lab": "Science Lab",
    "Self Defence": "Self Defence",
    "Vocational Education": "Vocational Education",
    "KGBV": "KGBV",
    "NSCBAV": "NSCBAV",
    "IE School Visit": "IE",
    "IE Home Visit": "IE",
};
// ────────────────────── Helpers ──────────────────────
function toIso(value) {
    if (!value)
        return new Date().toISOString();
    if (typeof value === "string")
        return value;
    if (value instanceof Date)
        return value.toISOString();
    // Handle Firestore Timestamp (duck-typing — works with any firebase-admin version)
    if (typeof value === "object" && value !== null) {
        if ("toDate" in value && typeof value.toDate === "function") {
            return (value.toDate()).toISOString();
        }
        if ("seconds" in value) {
            return new Date((value.seconds ?? 0) * 1000).toISOString();
        }
    }
    return new Date().toISOString();
}
function formatDateRange(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${fmt(s)} — ${fmt(e)}`;
}
function daysRemaining(endDateStr) {
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
async function getActiveFormWindows() {
    const snap = await db.collection("activity_forms").where("status", "==", "Open").get();
    const windows = [];
    for (const doc of snap.docs) {
        const data = doc.data();
        const startingDate = data.starting_date ? toIso(data.starting_date) : null;
        const endingDate = data.ending_date ? toIso(data.ending_date) : null;
        if (!startingDate || !endingDate)
            continue;
        const now = new Date();
        const start = new Date(startingDate);
        start.setHours(0, 0, 0, 0);
        // Include if currently active OR overdue (past end but still Open)
        if (now >= start) {
            windows.push({ formName: data.name, startingDate, endingDate });
        }
    }
    return windows;
}
async function getDistrictNames() {
    const snap = await db.collection("districts").get();
    const map = new Map();
    snap.forEach((doc) => map.set(doc.id, doc.data().name || doc.id));
    return map;
}
async function getSchoolNames() {
    const snap = await db.collection("schools").get();
    const map = new Map();
    snap.forEach((doc) => {
        const d = doc.data();
        map.set(doc.id, { name: d.name || doc.id, district_id: d.district_id || "" });
    });
    return map;
}
async function computeNonSubmitters(mapping, window, districtNames, schoolNames) {
    const startDate = new Date(window.startingDate);
    startDate.setHours(0, 0, 0, 0);
    // Query submissions + users in parallel
    const [submissionSnap, usersSnap] = await Promise.all([
        db.collection(mapping.collection)
            .where("created_at", ">=", firestore_1.Timestamp.fromDate(startDate))
            .get(),
        db.collection("users")
            .where("role", mapping.roles.length === 1 ? "==" : "in", mapping.roles.length === 1 ? mapping.roles[0] : mapping.roles)
            .where("is_active", "==", true)
            .get(),
    ]);
    const submittedUserIds = new Set();
    submissionSnap.forEach((doc) => {
        const d = doc.data();
        if (d.submitted_by)
            submittedUserIds.add(d.submitted_by);
        if (d.user_id)
            submittedUserIds.add(d.user_id);
    });
    const days = daysRemaining(window.endingDate);
    const formWindow = formatDateRange(window.startingDate, window.endingDate);
    const status = days < 0 ? "Overdue" : "Not Submitted";
    const now = firestore_1.Timestamp.now();
    const records = [];
    usersSnap.forEach((doc) => {
        const d = doc.data();
        const userId = doc.id;
        if (submittedUserIds.has(userId))
            return;
        // Responsibility filter for teachers
        if (mapping.responsibility) {
            const responsibilities = d.responsibilities ?? [];
            if (!responsibilities.includes(mapping.responsibility))
                return;
        }
        const schoolId = d.school_id || "";
        const districtId = d.district_id || "";
        const schoolInfo = schoolNames.get(schoolId);
        const isTeacher = mapping.roles.includes("TEACHER");
        records.push({
            id: `${userId}_${mapping.formType}`,
            user_id: userId,
            user_name: d.name || "Unknown",
            role: d.role || "TEACHER",
            school_id: isTeacher ? schoolId : "",
            school_name: isTeacher ? (schoolInfo?.name || schoolId || "—") : "",
            district_id: districtId,
            district_name: districtNames.get(districtId) || districtId || "—",
            form_type: mapping.formType,
            form_window: formWindow,
            days_remaining: days,
            status,
            created_at: now,
        });
    });
    return records;
}
// ────────────────────── Batch Writer ──────────────────────
async function batchWrite(records) {
    const BATCH_SIZE = 500;
    let written = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = records.slice(i, i + BATCH_SIZE);
        for (const record of chunk) {
            const docRef = db.collection("missing_form_submissions").doc(record.id);
            batch.set(docRef, record);
        }
        await batch.commit();
        written += chunk.length;
    }
    return written;
}
async function deleteAllDocs(collectionName) {
    let deleted = 0;
    const BATCH_SIZE = 500;
    while (true) {
        const snap = await db.collection(collectionName).limit(BATCH_SIZE).get();
        if (snap.empty)
            break;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        deleted += snap.size;
    }
    return deleted;
}
// ────────────────────── Main Compute Function ──────────────────────
async function computeMissingFormsCore() {
    console.log("[computeMissingForms] Starting computation...");
    // 1. Get active form windows + reference data
    const [activeWindows, districtNames, schoolNames] = await Promise.all([
        getActiveFormWindows(),
        getDistrictNames(),
        getSchoolNames(),
    ]);
    console.log(`[computeMissingForms] Found ${activeWindows.length} active form windows`);
    if (activeWindows.length === 0) {
        // No active windows — clear the collection
        const deleted = await deleteAllDocs("missing_form_submissions");
        console.log(`[computeMissingForms] No active windows. Deleted ${deleted} stale docs.`);
        return { deleted, written: 0 };
    }
    // 2. Compute non-submitters for all mappings in parallel
    const tasks = [];
    for (const mapping of FORM_MAPPINGS) {
        const activityName = FORM_TYPE_TO_ACTIVITY_NAME[mapping.formType];
        const matchingWindow = activeWindows.find((w) => {
            if (activityName === "IE") {
                return w.formName === "IE" || w.formName === "IE Resource Person";
            }
            return w.formName === activityName;
        });
        if (!matchingWindow)
            continue;
        tasks.push(computeNonSubmitters(mapping, matchingWindow, districtNames, schoolNames));
    }
    const resultsArrays = await Promise.all(tasks);
    const allRecords = resultsArrays.flat();
    console.log(`[computeMissingForms] Computed ${allRecords.length} missing submission records`);
    // 3. Clear existing and write new
    const deleted = await deleteAllDocs("missing_form_submissions");
    const written = await batchWrite(allRecords);
    console.log(`[computeMissingForms] Done. Deleted ${deleted}, written ${written}.`);
    return { deleted, written };
}
// ────────────────────── Exported Functions ──────────────────────
/**
 * Scheduled: runs every 6 hours to recompute missing form submissions.
 */
exports.computeMissingFormsScheduled = (0, scheduler_1.onSchedule)({ schedule: "every 6 hours", timeoutSeconds: 300, memory: "512MiB" }, async () => {
    await computeMissingFormsCore();
});
/**
 * HTTP callable: manual trigger from admin CMS.
 * POST /computeMissingFormsHttp
 */
exports.computeMissingFormsHttp = (0, https_1.onRequest)({ timeoutSeconds: 300, memory: "512MiB", cors: true }, async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const result = await computeMissingFormsCore();
        res.status(200).json({
            success: true,
            message: `Recomputed missing forms: ${result.written} records written.`,
            ...result,
        });
    }
    catch (error) {
        console.error("[computeMissingFormsHttp] Error:", error);
        res.status(500).json({ error: "Failed to compute missing forms" });
    }
});
//# sourceMappingURL=index.js.map