# Doctor Management App - AI Context & Project Documentation

This document contains all the necessary context, architectural decisions, and phase breakdowns for any AI agent working on this project.

## 1. Project Overview
A private Android application for a physiotherapist/doctor to manage patients, medical records, consultations, documents/media, appointments, and payment records.
- **Target Audience:** Personal clinic use (not for public distribution).
- **Core Constraints:** ₹0/month infrastructure cost using free tiers. No separate backend, microservices, AWS, Redis, Kafka, etc. No Play Store/App Store functionality or payment gateways.

## 2. Technology Stack
- **Framework:** React Native (v0.81.5) with Expo SDK 54
- **Navigation:** Expo Router (v6) - File-based routing
- **Language:** Strict TypeScript
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **State/Session:** `@react-native-async-storage/async-storage` for Supabase session persistence
- **Styling:** Custom design system using tokens in `src/constants/theme.ts` (Healthcare Teal palette)
- **Icons:** `@expo/vector-icons` (Ionicons)

## 3. Architecture & Key Decisions
- **Authentication Flow:** Uses Supabase Auth. The session is persisted via `AsyncStorage`. Route guarding is handled declaratively using `Stack.Protected` in the root layout (`src/app/_layout.tsx`), which blocks access to the `(tabs)` group if the user is not authenticated.
- **Row Level Security (RLS):** Every table has `doctor_id` referencing `profiles(id)`. RLS policies strictly enforce that a doctor can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where `doctor_id = auth.uid()`.
- **Database Migrations:** SQL files are maintained in `supabase/migrations/` and must be executed manually in the Supabase SQL editor.
- **Types:** Full TypeScript definitions matching the database schema are located in `src/types/index.ts`.

## 4. Database Schema Overview
9 core tables, all utilizing UUID primary keys, `created_at`, and `updated_at` (auto-managed via triggers):
1. `profiles` (extends `auth.users`, auto-created via trigger)
2. `patients`
3. `appointments`
4. `consultations`
5. `diagnoses`
6. `treatments`
7. `exercise_plans`
8. `documents` (metadata for files stored in Supabase Storage)
9. `payments`

## 5. Development Phases & Status

### Phase 1: Setup, Auth & Navigation (✅ COMPLETED)
- Initialized Expo SDK 54 project.
- Configured Supabase client & environment variables.
- Built authentication flow (Login, Forgot Password, Session Persistence).
- Set up root navigation guard (`Stack.Protected`) and 5-tab layout (Dashboard, Patients, Appointments, Payments, Profile).
- Built core UI components (`Button`, `Input`, `LoadingScreen`, `EmptyState`).

### Phase 2: Database Schema & RLS (✅ COMPLETED)
- Created raw SQL migrations (`supabase/migrations/`) for all 9 tables.
- Implemented Foreign Keys, Indexes, and RLS policies.
- Implemented PostgreSQL triggers for `updated_at` and profile auto-creation.
- Updated `src/types/index.ts` with all entity interfaces.

### Phase 3: Patient Management (✅ COMPLETED)
- **Goal:** CRUD operations for patients.
- **Features:** Patient list screen with search/filter, Add new patient form, Patient details view, Edit patient information.

### Phase 4: Appointments Management (✅ COMPLETED)
- **Goal:** Scheduling and tracking appointments.
- **Features:** Calendar/List view of appointments, Create new appointment, Update appointment status (scheduled, completed, cancelled, no_show).

### Phase 5: Medical Records Management (✅ COMPLETED)
- **Goal:** Clinical documentation.
- **Features:** Create/view consultations, add diagnoses, prescribe treatments, and create exercise plans for patients. Added `medicalService.ts` and consultation screens.

### Phase 6: Documents & Media (✅ COMPLETED)
- **Goal:** Secure file storage.
- **Features:** Uploading X-rays, MRIs, reports, and progress photos to Supabase Storage. Viewing/downloading files. Integrated `expo-image-picker` and `expo-document-picker`.

### Phase 7: Payment Management & Revenue (✅ COMPLETED)
- **Goal:** Financial tracking.
- **Features:** Record payments (cash/UPI/card), track pending vs paid status, simple revenue dashboard/statistics.

### Phase 8: Polish & Optimization (⏳ NOT STARTED)
- **Goal:** Production readiness.
- **Features:** Performance optimizations, final UI/UX polish, offline edge-case handling, and final testing.

---
**Note to AI Agents:** When picking up this project, always reference `src/types/index.ts` for the correct data models and rely on the UI components in `src/components/ui/` to maintain design consistency.
