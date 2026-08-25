import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function TermsOfServiceScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Terms & Conditions' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>PhysioDesk — Terms & Conditions</Text>
        <Text style={styles.date}>Last Updated: 25 August 2026</Text>
        
        <Text style={styles.subheading}>1. Introduction</Text>
        <Text style={styles.paragraph}>Welcome to PhysioDesk, a physiotherapy clinic management application developed and operated by Jaimeen Patel.</Text>
        <Text style={styles.paragraph}>These Terms & Conditions ("Terms") govern your access to and use of the PhysioDesk mobile application and related services ("Service").</Text>
        <Text style={styles.paragraph}>By creating an account or using PhysioDesk, you agree to these Terms.</Text>
        <Text style={styles.paragraph}>If you do not agree with these Terms, please do not use the Service.</Text>

        <Text style={styles.subheading}>2. About PhysioDesk</Text>
        <Text style={styles.paragraph}>PhysioDesk is a clinic-management and record-keeping application designed to help physiotherapists and healthcare professionals manage clinic operations.</Text>
        <Text style={styles.paragraph}>The Service may allow users to: Create and manage patient records, Record patient medical information, Record diagnoses and treatment information, Create and manage consultation records, Track patient attendance, Record payment information, Upload and manage medical documents and media, Manage account information, Manage clinic-related information.</Text>
        <Text style={styles.paragraph}>PhysioDesk is intended to assist with administrative and record-keeping activities.</Text>

        <Text style={styles.subheading}>3. Eligibility and Account</Text>
        <Text style={styles.paragraph}>Users may create an account and use the Service subject to these Terms.</Text>
        <Text style={styles.paragraph}>When creating an account, you agree to: Provide accurate and complete information. Keep your account credentials confidential. Not share your account credentials with unauthorized individuals. Notify us if you believe your account has been accessed without authorization. Use the Service only for lawful purposes.</Text>
        <Text style={styles.paragraph}>You are responsible for activity performed through your account.</Text>

        <Text style={styles.subheading}>4. Patient Information</Text>
        <Text style={styles.paragraph}>PhysioDesk allows users to enter and manage information relating to their patients.</Text>
        <Text style={styles.paragraph}>You are responsible for ensuring that: You have the appropriate authority or lawful basis to collect and manage patient information. The information you enter is accurate to the extent reasonably possible. You use patient information only for legitimate healthcare and clinic-management purposes. You comply with applicable laws and professional obligations relating to patient confidentiality and personal data.</Text>
        <Text style={styles.paragraph}>PhysioDesk provides tools for managing patient information but does not determine whether you are legally permitted to collect or process particular information.</Text>

        <Text style={styles.subheading}>5. Medical Disclaimer</Text>
        <Text style={styles.paragraph}>PhysioDesk is a record-keeping and clinic-management tool.</Text>
        <Text style={styles.paragraph}>The Service does not independently: Diagnose medical conditions, Determine a patient's medical condition, Replace professional medical judgment, Guarantee a treatment outcome, Provide emergency medical services, Replace consultation with a qualified healthcare professional.</Text>
        <Text style={styles.paragraph}>Any diagnosis, treatment plan, exercise plan, or other clinical decision recorded in PhysioDesk remains the responsibility of the healthcare professional.</Text>
        <Text style={styles.paragraph}>Users should use their professional judgment when evaluating patient information and making clinical decisions.</Text>

        <Text style={styles.subheading}>6. Accuracy of Information</Text>
        <Text style={styles.paragraph}>PhysioDesk does not independently verify the accuracy of information entered by users.</Text>
        <Text style={styles.paragraph}>You are responsible for reviewing information before relying on it for clinical, administrative, financial, or other purposes.</Text>
        <Text style={styles.paragraph}>You should ensure that patient records, diagnosis information, treatment information, attendance records, and payment records are entered accurately.</Text>

        <Text style={styles.subheading}>7. Documents and Media</Text>
        <Text style={styles.paragraph}>PhysioDesk allows users to upload documents and media associated with patients.</Text>
        <Text style={styles.paragraph}>These may include: X-rays, MRI reports, Prescriptions, Medical reports, Images, Other patient-related documents or media.</Text>
        <Text style={styles.paragraph}>You are responsible for ensuring that you have the appropriate authorization to upload and manage such information.</Text>
        <Text style={styles.paragraph}>You must not upload content that you are not legally authorized to store or process.</Text>

        <Text style={styles.subheading}>8. Payments</Text>
        <Text style={styles.paragraph}>PhysioDesk provides payment-management and record-keeping functionality.</Text>
        <Text style={styles.paragraph}>The Service does not currently process online payments or act as a payment gateway.</Text>
        <Text style={styles.paragraph}>Users may record information such as: Payment amount, Payment date, Payment status, Payment method, Related patient, Payment notes.</Text>
        <Text style={styles.paragraph}>PhysioDesk does not require users to provide card numbers, CVV numbers, UPI PINs, or banking credentials for the payment-management functionality.</Text>
        <Text style={styles.paragraph}>Users remain responsible for verifying the accuracy of payment records.</Text>

        <Text style={styles.subheading}>9. Data Storage and Security</Text>
        <Text style={styles.paragraph}>PhysioDesk uses Supabase for authentication, database storage, and file storage.</Text>
        <Text style={styles.paragraph}>Reasonable technical measures are used to protect information, including: Authentication, Row Level Security (RLS), Access-control policies, Encrypted network communication.</Text>
        <Text style={styles.paragraph}>However, no electronic system can be guaranteed to be completely secure.</Text>
        <Text style={styles.paragraph}>You are responsible for maintaining the security of your account credentials and device.</Text>

        <Text style={styles.subheading}>10. Third-Party Services</Text>
        <Text style={styles.paragraph}>PhysioDesk uses Supabase as its backend service provider.</Text>
        <Text style={styles.paragraph}>Supabase may process information on behalf of PhysioDesk as necessary to provide: Authentication, Database services, Storage services, Backend functionality.</Text>
        <Text style={styles.paragraph}>PhysioDesk does not currently sell user or patient information to third parties or share such information with third parties for advertising purposes.</Text>
        <Text style={styles.paragraph}>For additional information about data collection, storage, use, and deletion, please refer to the PhysioDesk Privacy Policy.</Text>

        <Text style={styles.subheading}>11. Account Deletion</Text>
        <Text style={styles.paragraph}>You may request deletion of your PhysioDesk account through the account-deletion functionality provided within the application.</Text>
        <Text style={styles.paragraph}>When an account is deleted, the account and associated patient, medical, document/media, attendance, and payment records are intended to be deleted, subject to applicable legal obligations or requirements to retain information.</Text>
        <Text style={styles.paragraph}>Account deletion may be permanent and cannot be reversed.</Text>
        <Text style={styles.paragraph}>You should export or retain any information you are legally required to maintain before deleting your account.</Text>

        <Text style={styles.subheading}>12. Data Retention</Text>
        <Text style={styles.paragraph}>PhysioDesk does not currently apply an automatic inactivity-based deletion period.</Text>
        <Text style={styles.paragraph}>Information is generally retained until: You delete the relevant information; or You delete your account.</Text>
        <Text style={styles.paragraph}>Information may be retained where required by applicable law or legitimate legal obligations.</Text>
        <Text style={styles.paragraph}>Doctors are responsible for determining how long they are legally required to retain patient records.</Text>

        <Text style={styles.subheading}>13. Acceptable Use</Text>
        <Text style={styles.paragraph}>You agree not to: Use PhysioDesk for unlawful purposes. Attempt to gain unauthorized access to another user's account or information. Attempt to bypass security controls. Introduce malicious software or code into the Service. Interfere with the operation of the Service. Reverse engineer or attempt to compromise the Service's security. Use the Service to store information that you are not legally authorized to process. Use the Service to provide misleading or fraudulent information.</Text>

        <Text style={styles.subheading}>14. Account Security</Text>
        <Text style={styles.paragraph}>You are responsible for maintaining the confidentiality of your login credentials.</Text>
        <Text style={styles.paragraph}>If you suspect unauthorized access to your account, you should immediately change your password and contact: Jaimeen Patel at jaimeenpatel2017@gmail.com</Text>

        <Text style={styles.subheading}>15. Service Availability</Text>
        <Text style={styles.paragraph}>We aim to keep PhysioDesk available and functional, but we do not guarantee that the Service will always be: Available, Error-free, Uninterrupted, Free from technical issues.</Text>
        <Text style={styles.paragraph}>The Service may occasionally be unavailable due to maintenance, updates, infrastructure issues, or circumstances outside our reasonable control.</Text>

        <Text style={styles.subheading}>16. Changes to PhysioDesk</Text>
        <Text style={styles.paragraph}>We may modify, improve, add, or remove features from PhysioDesk over time.</Text>
        <Text style={styles.paragraph}>Changes may include: New functionality, Security improvements, Bug fixes, User-interface changes, Feature removal, Backend or infrastructure changes.</Text>
        <Text style={styles.paragraph}>We may also release application updates that are necessary for security, compatibility, or continued operation.</Text>

        <Text style={styles.subheading}>17. Intellectual Property</Text>
        <Text style={styles.paragraph}>PhysioDesk, including its software, user interface, branding, logos, graphics, and original content, is owned by or licensed to Jaimeen Patel, unless otherwise stated.</Text>
        <Text style={styles.paragraph}>You may use PhysioDesk only for its intended purpose.</Text>
        <Text style={styles.paragraph}>You may not copy, reproduce, distribute, modify, or commercially exploit the application or its proprietary components without appropriate authorization.</Text>

        <Text style={styles.subheading}>18. User-Generated Information</Text>
        <Text style={styles.paragraph}>You retain responsibility for the information and content you enter into PhysioDesk.</Text>
        <Text style={styles.paragraph}>By using the Service, you grant PhysioDesk the limited rights necessary to store, process, transmit, and display that information solely for providing the Service.</Text>
        <Text style={styles.paragraph}>This does not transfer ownership of your patient records or other information to PhysioDesk.</Text>

        <Text style={styles.subheading}>19. Limitation of Liability</Text>
        <Text style={styles.paragraph}>To the extent permitted by applicable law, PhysioDesk and its developer shall not be liable for losses arising from: Incorrect information entered by a user, Clinical decisions made using information stored in the application, Loss resulting from unauthorized access caused by compromised user credentials, Temporary service interruptions, Third-party infrastructure failures, User misuse of the application, Failure to maintain legally required patient records independently.</Text>
        <Text style={styles.paragraph}>Nothing in these Terms is intended to exclude liability that cannot legally be excluded under applicable law.</Text>

        <Text style={styles.subheading}>20. No Professional Relationship</Text>
        <Text style={styles.paragraph}>Use of PhysioDesk does not create a doctor-patient relationship between PhysioDesk/the developer and any patient.</Text>
        <Text style={styles.paragraph}>PhysioDesk is a software tool for healthcare professionals and does not itself provide medical treatment or medical advice.</Text>

        <Text style={styles.subheading}>21. Privacy</Text>
        <Text style={styles.paragraph}>Your use of PhysioDesk is also governed by the PhysioDesk Privacy Policy.</Text>
        <Text style={styles.paragraph}>The Privacy Policy explains: What information is collected, How information is used, Where information is stored, How information is protected, How information is deleted, How you can exercise applicable privacy rights.</Text>

        <Text style={styles.subheading}>22. Termination</Text>
        <Text style={styles.paragraph}>You may stop using PhysioDesk at any time.</Text>
        <Text style={styles.paragraph}>We may restrict or terminate access where reasonably necessary because of: Violation of these Terms, Illegal or abusive use of the Service, Security concerns, Attempts to compromise the Service, Other circumstances requiring termination under applicable law.</Text>
        <Text style={styles.paragraph}>Account termination does not automatically remove legal obligations relating to information that must be retained under applicable law.</Text>

        <Text style={styles.subheading}>23. Governing Law</Text>
        <Text style={styles.paragraph}>These Terms shall be governed by the laws of India.</Text>
        <Text style={styles.paragraph}>Any dispute relating to the Service shall be subject to the applicable courts and legal jurisdiction in India.</Text>

        <Text style={styles.subheading}>24. Changes to These Terms</Text>
        <Text style={styles.paragraph}>We may update these Terms from time to time.</Text>
        <Text style={styles.paragraph}>When material changes are made, we may provide appropriate notice through the application or other reasonable means.</Text>
        <Text style={styles.paragraph}>The updated Terms will become effective from the date specified in the updated version.</Text>
        <Text style={styles.paragraph}>Continued use of PhysioDesk after the updated Terms become effective constitutes acceptance of the updated Terms, to the extent permitted by applicable law.</Text>

        <Text style={styles.subheading}>25. Contact</Text>
        <Text style={styles.paragraph}>For questions, concerns, account issues, privacy requests, or support:</Text>
        <Text style={styles.paragraph}>Developer: Jaimeen Patel</Text>
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
  paragraph: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
});
