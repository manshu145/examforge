/**
 * One-shot DB bootstrapper.
 *
 *   1. Apply RLS policies + triggers (`src/lib/db/rls.sql`).
 *   2. Seed reference data: exams, subjects, topics.
 *
 * Run with: `npm run db:seed`
 *
 * Idempotent - uses ON CONFLICT DO NOTHING and DROP/CREATE for policies.
 * Safe to run multiple times against any environment.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../src/lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n[seed] DATABASE_URL is not set. Add it to .env.local.\n");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql, { schema });

// --- Reference data --------------------------------------------------------
// Slugged IDs are stable across environments and human-readable in logs.

const EXAMS = [
  {
    id: "upsc",
    name: "UPSC Civil Services",
    shortName: "UPSC",
    description:
      "Prelims, Mains, and Interview prep with descriptive answer evaluation.",
  },
  {
    id: "neet",
    name: "NEET-UG",
    shortName: "NEET",
    description:
      "Adaptive Biology, Physics, and Chemistry mocks tuned to NEET difficulty.",
  },
  {
    id: "jee",
    name: "JEE Main + Advanced",
    shortName: "JEE",
    description:
      "Concept drills and PYQ trends for Physics, Chemistry, Mathematics.",
  },
  {
    id: "state_psc",
    name: "State PSCs",
    shortName: "State PSC",
    description:
      "BPSC, MPSC, UPPSC, and more - state-specific syllabus and current affairs.",
  },
];

const SUBJECTS = [
  // UPSC
  { id: "upsc_gs1", examId: "upsc", name: "General Studies I - History, Geography, Society", position: 1 },
  { id: "upsc_gs2", examId: "upsc", name: "General Studies II - Polity, Governance, IR", position: 2 },
  { id: "upsc_gs3", examId: "upsc", name: "General Studies III - Economy, Environment, Sci-Tech", position: 3 },
  { id: "upsc_gs4", examId: "upsc", name: "General Studies IV - Ethics", position: 4 },
  { id: "upsc_csat", examId: "upsc", name: "CSAT - Aptitude", position: 5 },
  // NEET
  { id: "neet_physics", examId: "neet", name: "Physics", position: 1 },
  { id: "neet_chemistry", examId: "neet", name: "Chemistry", position: 2 },
  { id: "neet_biology", examId: "neet", name: "Biology", position: 3 },
  // JEE
  { id: "jee_physics", examId: "jee", name: "Physics", position: 1 },
  { id: "jee_chemistry", examId: "jee", name: "Chemistry", position: 2 },
  { id: "jee_mathematics", examId: "jee", name: "Mathematics", position: 3 },
  // State PSC
  { id: "spsc_general_studies", examId: "state_psc", name: "General Studies (State)", position: 1 },
  { id: "spsc_aptitude", examId: "state_psc", name: "Aptitude & Reasoning", position: 2 },
];

/**
 * Topic seed list. Difficulty is a planning hint for adaptive mocks
 * (1 = foundational, 5 = advanced).
 */
const TOPICS: Array<{
  id: string;
  subjectId: string;
  name: string;
  description?: string;
  difficulty: number;
}> = [
  // UPSC GS1
  { id: "upsc_gs1_ancient_history", subjectId: "upsc_gs1", name: "Ancient Indian History", difficulty: 2 },
  { id: "upsc_gs1_medieval_history", subjectId: "upsc_gs1", name: "Medieval Indian History", difficulty: 3 },
  { id: "upsc_gs1_modern_history", subjectId: "upsc_gs1", name: "Modern Indian History (1857-1947)", difficulty: 3 },
  { id: "upsc_gs1_world_history", subjectId: "upsc_gs1", name: "World History (Industrial to WWII)", difficulty: 4 },
  { id: "upsc_gs1_indian_society", subjectId: "upsc_gs1", name: "Indian Society & Diversity", difficulty: 3 },
  { id: "upsc_gs1_physical_geography", subjectId: "upsc_gs1", name: "Physical Geography", difficulty: 3 },
  { id: "upsc_gs1_indian_geography", subjectId: "upsc_gs1", name: "Geography of India", difficulty: 3 },

  // UPSC GS2
  { id: "upsc_gs2_constitution", subjectId: "upsc_gs2", name: "Indian Constitution", difficulty: 4 },
  { id: "upsc_gs2_parliament", subjectId: "upsc_gs2", name: "Parliament & State Legislatures", difficulty: 3 },
  { id: "upsc_gs2_judiciary", subjectId: "upsc_gs2", name: "Judiciary & Judicial Review", difficulty: 4 },
  { id: "upsc_gs2_governance", subjectId: "upsc_gs2", name: "Governance & Welfare Schemes", difficulty: 3 },
  { id: "upsc_gs2_international_relations", subjectId: "upsc_gs2", name: "International Relations", difficulty: 4 },

  // UPSC GS3
  { id: "upsc_gs3_indian_economy", subjectId: "upsc_gs3", name: "Indian Economy", difficulty: 4 },
  { id: "upsc_gs3_agriculture", subjectId: "upsc_gs3", name: "Agriculture & Food Security", difficulty: 3 },
  { id: "upsc_gs3_environment", subjectId: "upsc_gs3", name: "Environment & Biodiversity", difficulty: 3 },
  { id: "upsc_gs3_science_tech", subjectId: "upsc_gs3", name: "Science & Technology", difficulty: 3 },
  { id: "upsc_gs3_internal_security", subjectId: "upsc_gs3", name: "Internal Security", difficulty: 4 },

  // UPSC GS4
  { id: "upsc_gs4_ethics_foundations", subjectId: "upsc_gs4", name: "Ethics - Foundations & Theories", difficulty: 4 },
  { id: "upsc_gs4_case_studies", subjectId: "upsc_gs4", name: "Case Studies in Public Administration", difficulty: 5 },

  // UPSC CSAT
  { id: "upsc_csat_quant", subjectId: "upsc_csat", name: "Quantitative Aptitude", difficulty: 3 },
  { id: "upsc_csat_reasoning", subjectId: "upsc_csat", name: "Logical Reasoning", difficulty: 3 },
  { id: "upsc_csat_comprehension", subjectId: "upsc_csat", name: "Reading Comprehension", difficulty: 2 },

  // NEET - Physics
  { id: "neet_physics_mechanics", subjectId: "neet_physics", name: "Mechanics", difficulty: 3 },
  { id: "neet_physics_thermodynamics", subjectId: "neet_physics", name: "Thermodynamics", difficulty: 3 },
  { id: "neet_physics_optics", subjectId: "neet_physics", name: "Optics & Wave Optics", difficulty: 4 },
  { id: "neet_physics_electrostatics", subjectId: "neet_physics", name: "Electrostatics & Current Electricity", difficulty: 4 },
  { id: "neet_physics_magnetism", subjectId: "neet_physics", name: "Magnetism & EMI", difficulty: 4 },
  { id: "neet_physics_modern", subjectId: "neet_physics", name: "Modern Physics (Atoms, Nuclei, Dual Nature)", difficulty: 4 },

  // NEET - Chemistry
  { id: "neet_chem_physical", subjectId: "neet_chemistry", name: "Physical Chemistry", difficulty: 3 },
  { id: "neet_chem_inorganic", subjectId: "neet_chemistry", name: "Inorganic Chemistry", difficulty: 3 },
  { id: "neet_chem_organic", subjectId: "neet_chemistry", name: "Organic Chemistry", difficulty: 4 },

  // NEET - Biology
  { id: "neet_bio_cell", subjectId: "neet_biology", name: "Cell Biology & Cell Cycle", difficulty: 2 },
  { id: "neet_bio_genetics", subjectId: "neet_biology", name: "Genetics & Evolution", difficulty: 3 },
  { id: "neet_bio_human_physiology", subjectId: "neet_biology", name: "Human Physiology", difficulty: 4 },
  { id: "neet_bio_plant_physiology", subjectId: "neet_biology", name: "Plant Physiology", difficulty: 3 },
  { id: "neet_bio_ecology", subjectId: "neet_biology", name: "Ecology & Environment", difficulty: 2 },
  { id: "neet_bio_biotechnology", subjectId: "neet_biology", name: "Biotechnology & Reproduction", difficulty: 3 },

  // JEE - Physics
  { id: "jee_physics_kinematics", subjectId: "jee_physics", name: "Kinematics & Dynamics", difficulty: 3 },
  { id: "jee_physics_rotation", subjectId: "jee_physics", name: "Rotational Mechanics", difficulty: 4 },
  { id: "jee_physics_thermo", subjectId: "jee_physics", name: "Heat & Thermodynamics", difficulty: 4 },
  { id: "jee_physics_em", subjectId: "jee_physics", name: "Electromagnetism", difficulty: 4 },
  { id: "jee_physics_optics", subjectId: "jee_physics", name: "Optics & Modern Physics", difficulty: 4 },

  // JEE - Chemistry
  { id: "jee_chem_physical", subjectId: "jee_chemistry", name: "Physical Chemistry", difficulty: 4 },
  { id: "jee_chem_inorganic", subjectId: "jee_chemistry", name: "Inorganic Chemistry", difficulty: 3 },
  { id: "jee_chem_organic", subjectId: "jee_chemistry", name: "Organic Chemistry", difficulty: 4 },

  // JEE - Mathematics
  { id: "jee_math_algebra", subjectId: "jee_mathematics", name: "Algebra", difficulty: 3 },
  { id: "jee_math_calculus", subjectId: "jee_mathematics", name: "Calculus", difficulty: 4 },
  { id: "jee_math_coordinate_geom", subjectId: "jee_mathematics", name: "Coordinate Geometry", difficulty: 4 },
  { id: "jee_math_trigonometry", subjectId: "jee_mathematics", name: "Trigonometry", difficulty: 3 },
  { id: "jee_math_vectors", subjectId: "jee_mathematics", name: "Vectors & 3D Geometry", difficulty: 4 },
  { id: "jee_math_probability", subjectId: "jee_mathematics", name: "Probability & Statistics", difficulty: 3 },

  // State PSC
  { id: "spsc_gs_history", subjectId: "spsc_general_studies", name: "History (National + State)", difficulty: 3 },
  { id: "spsc_gs_geography", subjectId: "spsc_general_studies", name: "Geography (India + State)", difficulty: 3 },
  { id: "spsc_gs_polity", subjectId: "spsc_general_studies", name: "Polity & Governance", difficulty: 3 },
  { id: "spsc_gs_economy", subjectId: "spsc_general_studies", name: "Economy & Current Affairs", difficulty: 3 },
  { id: "spsc_aptitude_quant", subjectId: "spsc_aptitude", name: "Quantitative Aptitude", difficulty: 3 },
  { id: "spsc_aptitude_reasoning", subjectId: "spsc_aptitude", name: "Logical Reasoning", difficulty: 3 },
];

// --- Run -------------------------------------------------------------------

async function applyRls() {
  const path = join(process.cwd(), "src/lib/db/rls.sql");
  const ddl = readFileSync(path, "utf8");
  console.log(`[seed] applying RLS from ${path} (${ddl.length} bytes)...`);
  await sql.unsafe(ddl);
  console.log(`[seed] RLS applied.`);
}

async function seedReferenceData() {
  console.log(`[seed] inserting ${EXAMS.length} exams...`);
  await db.insert(schema.exams).values(EXAMS).onConflictDoNothing();

  console.log(`[seed] inserting ${SUBJECTS.length} subjects...`);
  await db.insert(schema.subjects).values(SUBJECTS).onConflictDoNothing();

  console.log(`[seed] inserting ${TOPICS.length} topics...`);
  await db.insert(schema.topics).values(TOPICS).onConflictDoNothing();
}

async function main() {
  try {
    await applyRls();
    await seedReferenceData();
    console.log(`\n[seed] done.`);
  } catch (err) {
    console.error(`\n[seed] failed:`, err);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
