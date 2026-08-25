import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>PhysioDesk — Privacy Policy</Text>
        <Text style={styles.date}>Last Updated: 25 August 2026</Text>
        
        <Text style={styles.subheading}>1. Introduction</Text>
        <Text style={styles.paragraph}>PhysioDesk ("PhysioDesk", "we", "us", or "our") is a physiotherapy clinic management application developed and operated by Jaimeen Patel.</Text>
        <Text style={styles.paragraph}>This Privacy Policy explains how PhysioDesk collects, uses, stores, protects, and deletes information when you use the PhysioDesk mobile application and related services.</Text>
        <Text style={styles.paragraph}>PhysioDesk is intended for use in India.</Text>
        <Text style={styles.paragraph}>By creating an account or using PhysioDesk, you acknowledge that you have read and understood this Privacy Policy.</Text>

        <Text style={styles.subheading}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>Depending on how you use PhysioDesk, we may collect and process the following information.</Text>
        
        <Text style={styles.boldParagraph}>2.1 Account Information</Text>
        <Text style={styles.paragraph}>When you create an account, we may collect: Name, Email address, Authentication information, Profile information, Account creation date and account-related information required to provide authentication and account management.</Text>
        <Text style={styles.paragraph}>Passwords are handled through Supabase Authentication and are not stored by PhysioDesk as plain-text passwords.</Text>
        
        <Text style={styles.boldParagraph}>2.2 Patient Information</Text>
        <Text style={styles.paragraph}>PhysioDesk allows doctors and other authorized users to create and manage patient records.</Text>
        <Text style={styles.paragraph}>Patient information entered into the application may include: Patient name, Date of birth or age, Gender, Phone number, Email address, Address, Medical history, Symptoms, Diagnosis, Treatment information, Exercise or therapy information, Consultation notes, Attendance information, Other information entered by the doctor for healthcare and clinic-management purposes.</Text>
        <Text style={styles.paragraph}>Some of this information may constitute health or sensitive personal information. PhysioDesk does not independently collect this information from patients. It is entered by the user as part of clinic-management functionality.</Text>

        <Text style={styles.boldParagraph}>2.3 Documents and Media</Text>
        <Text style={styles.paragraph}>PhysioDesk allows users to upload and manage patient-related documents and media, including: X-rays, MRI reports, Prescriptions, Medical reports, Images, Other supported patient-related files.</Text>
        <Text style={styles.paragraph}>Uploaded files are stored using Supabase Storage.</Text>
        <Text style={styles.paragraph}>Users are responsible for ensuring that they have the appropriate authorization and lawful basis to upload and manage patient information and medical documents.</Text>

        <Text style={styles.boldParagraph}>2.4 Payment Information</Text>
        <Text style={styles.paragraph}>PhysioDesk provides payment record-keeping functionality.</Text>
        <Text style={styles.paragraph}>Users may record: Patient associated with a payment, Amount, Payment date, Payment status, Payment method, Payment notes.</Text>
        <Text style={styles.paragraph}>PhysioDesk does not currently process online payments.</Text>
        <Text style={styles.paragraph}>The payment-management functionality does not require users to provide: Credit/debit card numbers, CVV numbers, UPI PINs, Online banking passwords, Payment gateway credentials.</Text>

        <Text style={styles.subheading}>3. How We Use Information</Text>
        <Text style={styles.paragraph}>We use information to provide and operate PhysioDesk, including to: Create and authenticate user accounts, Provide password-reset functionality, Manage patient records, Manage consultation records, Manage diagnosis and treatment records, Manage attendance, Manage payment records, Store and retrieve documents and media, Provide account-management functionality, Maintain and secure the Service, Respond to support requests, Diagnose technical problems, Prevent unauthorized access and misuse, Maintain the reliability and functionality of the application.</Text>
        <Text style={styles.paragraph}>We do not use patient information for advertising or targeted advertising.</Text>

        <Text style={styles.subheading}>4. Third-Party Service Provider</Text>
        <Text style={styles.paragraph}>PhysioDesk uses Supabase as its backend service provider.</Text>
        <Text style={styles.paragraph}>Supabase may process information on our behalf for purposes including: User authentication, Database storage, File/media storage, Backend services, Secure communication between the application and backend.</Text>
        <Text style={styles.paragraph}>Supabase is currently the only third-party service provider used by PhysioDesk for the backend processing described in this Privacy Policy.</Text>
        <Text style={styles.paragraph}>We do not sell patient information or user information to third parties.</Text>
        <Text style={styles.paragraph}>We do not share patient information with advertisers or data brokers.</Text>
        <Text style={styles.paragraph}>Information may be disclosed where required by applicable law, legal process, court order, or valid governmental request.</Text>

        <Text style={styles.subheading}>5. Security</Text>
        <Text style={styles.paragraph}>PhysioDesk uses security mechanisms including: Authentication, Row Level Security (RLS), Database access policies, Storage access policies, Encrypted network communication.</Text>
        <Text style={styles.paragraph}>We take reasonable measures to protect information from unauthorized access, alteration, disclosure, or destruction.</Text>
        <Text style={styles.paragraph}>However, no internet-based service can guarantee absolute security.</Text>
        <Text style={styles.paragraph}>Users are responsible for maintaining the confidentiality of their account credentials and device.</Text>

        <Text style={styles.subheading}>6. Data Minimization</Text>
        <Text style={styles.paragraph}>PhysioDesk is designed to collect information necessary for its intended clinic-management functionality.</Text>
        <Text style={styles.paragraph}>We do not intentionally collect unrelated information such as: Contacts, SMS messages, Call history, Location, Health data from device health platforms, Advertising identifiers for targeted advertising unless a future feature requires such information and this Privacy Policy is updated accordingly.</Text>

        <Text style={styles.subheading}>7. Camera, Photos, Files, and Media Permissions</Text>
        <Text style={styles.paragraph}>If the application requests access to the camera, photos, files, or device media, that access is used to support functionality such as uploading profile images or patient documents/media.</Text>
        <Text style={styles.paragraph}>We do not use camera or file access for advertising or unrelated purposes.</Text>
        <Text style={styles.paragraph}>Users can control these permissions through their device settings.</Text>

        <Text style={styles.subheading}>8. Data Sharing</Text>
        <Text style={styles.paragraph}>We do not sell, rent, or trade personal information.</Text>
        <Text style={styles.paragraph}>We do not share patient information with: Advertisers, Marketing companies, Data brokers, Social media companies for advertising or marketing purposes.</Text>
        <Text style={styles.paragraph}>Supabase is used as the backend service provider necessary to operate the Service.</Text>
        <Text style={styles.paragraph}>Information may also be disclosed where required by applicable law or valid legal process.</Text>

        <Text style={styles.subheading}>9. Data Retention</Text>
        <Text style={styles.paragraph}>PhysioDesk does not currently apply an automatic inactivity-based deletion period.</Text>
        <Text style={styles.paragraph}>Data is generally retained until the doctor deletes the relevant information or the account is deleted.</Text>
        <Text style={styles.paragraph}>This may include: Account information, Patient records, Consultation records, Diagnosis information, Treatment records, Attendance records, Payment records, Uploaded documents/media.</Text>
        <Text style={styles.paragraph}>Information may be retained where necessary to comply with applicable legal obligations.</Text>
        <Text style={styles.paragraph}>Doctors are responsible for determining how long they are legally required to retain patient records under applicable professional, healthcare, tax, or other obligations.</Text>

        <Text style={styles.subheading}>10. Account Deletion</Text>
        <Text style={styles.paragraph}>PhysioDesk provides an account deletion option within the application.</Text>
        <Text style={styles.paragraph}>When a doctor requests account deletion, the account and associated data are intended to be deleted, including associated: Patient records, Consultation records, Diagnosis and treatment information, Attendance records, Payment records, Uploaded documents/media.</Text>
        <Text style={styles.paragraph}>This is subject to applicable legal retention requirements.</Text>
        <Text style={styles.paragraph}>Account deletion may be permanent and irreversible.</Text>
        <Text style={styles.paragraph}>Users should retain any information they are legally required to maintain before deleting their account.</Text>

        <Text style={styles.subheading}>11. Privacy Rights and Requests</Text>
        <Text style={styles.paragraph}>Depending on applicable Indian law, users may have rights relating to: Access to personal information, Correction of inaccurate information, Erasure/deletion where applicable, Withdrawal of consent where applicable, Grievance handling.</Text>
        <Text style={styles.paragraph}>To make a privacy-related request, contact:</Text>
        <Text style={styles.paragraph}>Jaimeen Patel</Text>
        <Text style={styles.paragraph}>Email: jaimeenpatel2017@gmail.com</Text>
        <Text style={styles.paragraph}>We may need to verify your identity before processing certain requests.</Text>

        <Text style={styles.subheading}>12. Children's Privacy</Text>
        <Text style={styles.paragraph}>PhysioDesk is designed as a professional clinic-management application for doctors and healthcare professionals.</Text>
        <Text style={styles.paragraph}>The application is not intended for children to create their own accounts.</Text>
        <Text style={styles.paragraph}>Doctors may enter information about pediatric patients where necessary for legitimate healthcare and clinic-management purposes and where the doctor has appropriate authority to do so.</Text>

        <Text style={styles.subheading}>13. International Data Processing</Text>
        <Text style={styles.paragraph}>PhysioDesk is intended for users in India.</Text>
        <Text style={styles.paragraph}>Because PhysioDesk uses Supabase infrastructure, information may be processed or stored using infrastructure located outside India depending on the configuration and services used by the Supabase project.</Text>
        <Text style={styles.paragraph}>Users should not assume that all information is physically stored within India unless the applicable infrastructure configuration specifically provides this.</Text>

        <Text style={styles.subheading}>14. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>We may update this Privacy Policy when: New features are introduced, Data practices change, Security practices change, Legal requirements change, Third-party services change.</Text>
        <Text style={styles.paragraph}>When material changes are made, we may provide appropriate notice through the application or other reasonable means.</Text>
        <Text style={styles.paragraph}>The "Last Updated" date at the beginning of this policy will indicate when the policy was most recently revised.</Text>

        <Text style={styles.subheading}>15. Medical Disclaimer</Text>
        <Text style={styles.paragraph}>PhysioDesk is a clinic-management and record-keeping application.</Text>
        <Text style={styles.paragraph}>PhysioDesk does not independently diagnose medical conditions, prescribe treatment, or replace the professional judgment of a qualified healthcare professional.</Text>
        <Text style={styles.paragraph}>Information stored within PhysioDesk should be reviewed and interpreted by the responsible healthcare professional.</Text>
        <Text style={styles.paragraph}>PhysioDesk should not be relied upon as a substitute for professional medical advice, diagnosis, or treatment.</Text>

        <Text style={styles.subheading}>16. Contact Us</Text>
        <Text style={styles.paragraph}>If you have questions, concerns, or requests relating to privacy or your information, contact:</Text>
        <Text style={styles.paragraph}>Developer / Data Controller: Jaimeen Patel</Text>
        <Text style={styles.paragraph}>Email: jaimeenpatel2017@gmail.com</Text>
        <Text style={styles.paragraph}>Country: India</Text>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  heading: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  date: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  subheading: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  boldParagraph: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
});
