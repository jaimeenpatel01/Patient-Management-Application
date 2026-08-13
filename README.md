# Doctor Management Application

Welcome to the **Doctor Management Application**, a comprehensive and modern platform designed for healthcare professionals to effortlessly manage their clinic, patients, appointments, and payments. Built with React Native (Expo) and Supabase, this application provides a seamless mobile experience for both iOS and Android.

## 🌟 Key Features & Functionality

This application comes fully loaded with features tailored specifically to a doctor's daily operational needs. 

### 1. Authentication
* **Sign Up / Sign In:** Secure email and password authentication powered by Supabase.
* **Forgot Password:** Easy recovery flow for forgotten credentials.
* **Protected Routes:** Ensure that sensitive clinic data is only accessible to authenticated medical professionals.

### 2. Interactive Dashboard
The Dashboard serves as the central hub of your clinic's operations, providing immediate insights and actionable metrics.
* **Overview Metrics:** Instantly see your total appointments, total unique patients, collected revenue (₹), and pending balances (₹).
* **Payment Summary:** A dedicated section that tracks your patient inflow vs. revenue generated and what is still outstanding.
* **Quick Actions:** Easily jump to "Add Patient", "Add Appointment", or "Add Payment" with a single tap.

### 3. Data Filters
The dashboard and statistical modules come with built-in time filters that calculate your clinic's performance on the fly without lag.

* **Daily Filter:** Displays data specifically for the current day. Perfect for seeing today's scheduled appointments and today's expected revenue.
* **Weekly Filter:** Displays data for the trailing 7 days. Useful for tracking short-term trends, weekly patient volume, and end-of-week financial reconciliation.
* **Monthly Filter:** Displays data for the trailing 30 days. Gives a bird's-eye view of your clinic's broader financial health, patient retention, and overall growth.

### 4. Patient Management (Patients Tab)
* Maintain a complete directory of all your patients.
* View patient histories, contact information, and medical records.
* Easily add new patients into your system.

### 5. Scheduling (Appointments Tab)
* A dedicated tab for viewing and managing your calendar.
* Schedule new appointments and assign them to specific patients.
* See upcoming visits and organize your daily agenda efficiently.

### 6. Billing & Finances (Payments Tab)
* Track every transaction made within your clinic.
* Mark payments as `paid`, `pending`, or `partially_paid`.
* Keep a clear record of outstanding balances to follow up on.

### 7. User Profile (Profile Tab)
* View your current account details (Email, Role, Display Name).
* Manage your app settings and session safely.

---

## 🚀 Getting Started

### Prerequisites
* Node.js and npm installed on your machine.
* Expo CLI or Expo Go app installed on your mobile device.
* A Supabase project set up for the backend.

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   Ensure your `.env` file is properly configured with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the Application**
   ```bash
   npx expo start
   ```

4. **Run on Device / Emulator**
   * Press `i` to open in iOS Simulator.
   * Press `a` to open in Android Emulator.
   * Scan the QR code with your phone's camera (using Expo Go) to run on a physical device.

---

## 🛠 Tech Stack
* **Frontend:** React Native, Expo, Expo Router
* **Backend & Auth:** Supabase (PostgreSQL)
* **Icons:** Ionicons
* **Styling:** Custom StyleSheet system with a defined Theme context (Colors, Typography, Spacing).

## 📄 License
This project is licensed under the MIT License.
