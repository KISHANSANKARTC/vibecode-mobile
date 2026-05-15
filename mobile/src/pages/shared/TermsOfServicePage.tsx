import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/ThemeContext';
import {
  ArrowLeft,
  Shield,
  FileText,
  Globe,
  Users,
  Lock,
  CheckCircle,
  Calendar,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Scale,
  Ban,
  UserX,
  Star,
  FileWarning,
  Gavel,
  Settings,
  Mail,
} from 'lucide-react-native';

interface TermsSection {
  icon: React.ReactNode;
  title: string;
  content: string;
  accent?: boolean;
}

type UserType = 'client' | 'talent';

interface TermsOfServicePageProps {
  userType?: UserType;
}

const termsSections: TermsSection[] = [
  {
    icon: <Shield size={24} color="#F97316" strokeWidth={2} />,
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Engage platform ("Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must immediately cease using the Platform.

These Terms constitute a legally binding agreement between you and Goonyx FZ-LLC ("Engage", "we", "us", or "our"). Your continued use of the Platform after any modifications to these Terms constitutes acceptance of those changes.`,
  },
  {
    icon: <FileText size={24} color="#F97316" strokeWidth={2} />,
    title: '2. Definitions',
    content: `For the purposes of these Terms:

• "Platform" refers to the Engage website, mobile application, and all related services
• "Talent" refers to creative professionals who offer services through the Platform
• "Client" refers to individuals or businesses who book services from Talent
• "Booking" refers to a confirmed engagement between a Client and Talent
• "Services" refers to the creative, professional, or other services offered by Talent
• "User" refers to any person accessing or using the Platform, whether Talent or Client
• "Content" refers to any text, images, videos, or other materials uploaded to the Platform
• "Platform Fee" refers to the commission charged by Engage on completed bookings`,
  },
  {
    icon: <Globe size={24} color="#F97316" strokeWidth={2} />,
    title: '3. Platform Role & Limitations',
    content: `IMPORTANT: Engage is a technology platform that facilitates connections between Talent and Clients. We are NOT:

• An employer of any Talent on the Platform
• A party to any contract between Talent and Client
• A guarantor of any services provided
• Responsible for the quality, safety, or legality of services
• An agent of either Talent or Client

Engage provides the technology infrastructure and payment processing services only. All contractual relationships for services are directly between Talent and Client. We do not supervise, direct, control, or monitor the services provided.`,
  },
  {
    icon: <Users size={24} color="#F97316" strokeWidth={2} />,
    title: '4. Eligibility',
    content: `To use the Platform, you must:

• Be at least 18 years of age
• Have the legal capacity to enter into binding contracts
• Not be prohibited from using the Platform under applicable laws
• Not have been previously banned or suspended from the Platform
• Provide accurate identification documents if requested

For Talent: You must have the legal right to work in your jurisdiction and hold any required licenses, permits, or certifications for your services.

For Clients: If booking on behalf of a company, you warrant that you have authority to bind that company to these Terms.`,
  },
  {
    icon: <Lock size={24} color="#F97316" strokeWidth={2} />,
    title: '5. Account Registration & Security',
    content: `When registering for an account, you agree to:

• Provide accurate, current, and complete information
• Maintain and promptly update your account information
• Maintain the security and confidentiality of your login credentials
• Not share your account with any other person
• Maintain only one account per person
• Notify us immediately of any unauthorized access or security breach
• Accept full responsibility for all activities under your account

We reserve the right to suspend or terminate accounts with inaccurate information or suspected fraudulent activity.`,
  },
  {
    icon: <CheckCircle size={24} color="#F97316" strokeWidth={2} />,
    title: '6. Talent Obligations',
    content: `As a Talent on the Platform, you agree to:

PROFESSIONAL STANDARDS:
• Provide services as described in your profile and booking confirmations
• Maintain accurate and up-to-date portfolio, skills, and availability information
• Arrive punctually at agreed locations and times
• Conduct yourself professionally and respectfully at all times
• Deliver agreed-upon deliverables within specified timeframes

LEGAL COMPLIANCE:
• Hold all necessary licenses, permits, and insurance for your services
• Comply with all applicable laws, including tax obligations
• Not engage in any illegal, fraudulent, or harmful activities

COMMUNICATION:
• Respond to booking requests within 24 hours
• Provide timely updates on booking status and deliverables
• Notify Clients immediately of any issues affecting service delivery`,
  },
  {
    icon: <Users size={24} color="#F97316" strokeWidth={2} />,
    title: '7. Client Obligations',
    content: `As a Client on the Platform, you agree to:

BOOKING RESPONSIBILITIES:
• Provide accurate and complete project briefs
• Pay all agreed fees promptly through the Platform
• Be available at agreed times and locations
• Provide necessary access, information, and cooperation to Talent

PROFESSIONAL CONDUCT:
• Treat all Talent with respect and professionalism
• Not request services outside the scope of the confirmed booking
• Not engage in harassment, discrimination, or abusive behavior
• Provide safe and appropriate working conditions

PAYMENT OBLIGATIONS:
• Complete all payments through the Platform
• Not attempt to circumvent Platform fees
• Honor agreed payment terms and milestones`,
  },
  {
    icon: <Calendar size={24} color="#F97316" strokeWidth={2} />,
    title: '8. Booking Process',
    content: `HOW BOOKINGS WORK:

1. Client submits a booking request or inquiry
2. Talent reviews and accepts, declines, or proposes modifications
3. Client confirms and makes payment through the Platform
4. Booking is confirmed and both parties are notified
5. Services are rendered at the agreed time
6. Client confirms completion and payment is released to Talent

BINDING NATURE: Once a booking is confirmed and paid, it constitutes a binding agreement between Client and Talent. Cancellations are subject to the applicable cancellation policy.

BOOKING MODIFICATIONS: Any changes to confirmed bookings must be agreed upon by both parties through the Platform. Modified terms supersede original booking terms.`,
  },
  {
    icon: <CreditCard size={24} color="#F97316" strokeWidth={2} />,
    title: '9. Payments & Fees',
    content: `PLATFORM FEES: Engage charges a platform fee on completed bookings. Current fee structures are displayed during the booking process and may vary based on service category, booking value, and user tier.

PAYMENT PROCESSING:
• All payments must be made through the Platform
• We use secure third-party payment processors
• Payments are held in escrow until service completion
• Funds are released to Talent after Client confirmation or automatic release period

CURRENCY & TAXES:
• Prices are displayed in the currency selected by Talent
• All applicable taxes (including VAT) are calculated and displayed
• Talent is responsible for their own tax obligations on earnings
• Engage will provide tax documentation as required by law

PAYOUT SCHEDULE:
• Payouts are processed within 3-5 business days of release
• Minimum payout thresholds may apply
• Bank fees may be deducted from payouts`,
  },
  {
    icon: <Calendar size={24} color="#F97316" strokeWidth={2} />,
    title: '10. Cancellation Policy',
    content: `STANDARD CANCELLATION TERMS:

CLIENT CANCELLATIONS:
• 48+ hours before: Full refund minus platform service fee
• 24-48 hours before: 50% refund to Client, 50% to Talent
• Less than 24 hours: No refund, Talent receives full payment

TALENT CANCELLATIONS:
• Talent may cancel with at least 48 hours notice without penalty
• Late cancellations may result in profile demotion
• Repeated cancellations may result in account suspension
• Talent must notify Client immediately through the Platform

FORCE MAJEURE: Neither party shall be liable for cancellations due to events beyond reasonable control, including but not limited to natural disasters, government actions, civil unrest, or medical emergencies with documentation.

CUSTOM POLICIES: Talent may set custom cancellation policies, which will be clearly displayed during booking.`,
  },
  {
    icon: <AlertTriangle size={24} color="#EA580C" strokeWidth={2} />,
    title: '11. No-Show Policy',
    content: `THIS POLICY PROTECTS BOTH TALENT AND CLIENTS:

TALENT NO-SHOW: If Talent fails to arrive at the agreed location and time without prior notice (minimum 2 hours advance notification):

• Client receives automatic FULL REFUND within 24 hours
• Talent receives a no-show strike on their account
• First offense: Warning and profile demotion
• Second offense: 30-day suspension
• Third offense: Permanent platform ban
• Talent forfeits any platform guarantee or badge eligibility
• Repeated no-shows may result in legal action for damages

CLIENT NO-SHOW: If Client fails to arrive or is unreachable at the agreed time and location:

• Talent may wait 30 minutes, then mark booking as "Client No-Show"
• Talent receives FULL PAYMENT for the booking
• Client forfeits ALL refund rights
• Client receives a no-show strike on their account
• Repeated no-shows may result in account suspension or ban
• Talent may claim additional expenses incurred due to no-show

DOCUMENTATION: In case of disputes, location data, timestamps, and communication records may be used as evidence.`,
    accent: true,
  },
  {
    icon: <RefreshCw size={24} color="#F97316" strokeWidth={2} />,
    title: '12. Refund Policy',
    content: `WHEN REFUNDS APPLY:

AUTOMATIC REFUNDS:
• Talent no-show (as defined in Section 11)
• Talent cancellation with insufficient notice
• Services not rendered as confirmed
• Booking cancelled before confirmation

DISCRETIONARY REFUNDS:
• Service quality disputes (subject to review)
• Partial service delivery
• Force majeure events

NON-REFUNDABLE:
• Platform service fees (except in Talent no-show cases)
• Completed and confirmed bookings
• Client no-show situations
• Cancellations within 24 hours of booking time

PROCESSING TIME:
• Automatic refunds: Within 24 hours
• Disputed refunds: Within 7-14 business days of resolution
• Bank processing: Additional 3-5 business days

REFUND METHOD: Refunds are credited to the original payment method or Platform wallet, at Engage's discretion.`,
  },
  {
    icon: <Scale size={24} color="#F97316" strokeWidth={2} />,
    title: '13. Disputes & Resolution',
    content: `DISPUTE PROCESS:

STEP 1 - DIRECT RESOLUTION: Users should first attempt to resolve disputes directly through Platform messaging. Most issues can be resolved through good-faith communication.

STEP 2 - PLATFORM MEDIATION: If direct resolution fails, either party may request Engage mediation:
• Submit dispute within 7 days of booking completion
• Provide all relevant evidence and documentation
• Engage will review and respond within 5 business days
• Mediation decisions are recommendations, not binding

STEP 3 - FORMAL DISPUTE: For unresolved disputes exceeding AED 1,000:
• Either party may escalate to formal arbitration
• Arbitration conducted under UAE Arbitration Law
• Costs shared equally unless determined otherwise
• Arbitration decision is final and binding

PLATFORM LIMITATIONS: Engage's role in disputes is limited to providing information and facilitating communication. We are not liable for the outcome of any dispute.`,
  },
  {
    icon: <Ban size={24} color="#EA580C" strokeWidth={2} />,
    title: '14. Platform Fee Circumvention',
    content: `STRICTLY PROHIBITED CONDUCT:

Users MUST NOT attempt to circumvent Platform fees by:

• Arranging bookings outside the Platform after initial contact
• Sharing personal contact information (phone, email, social media) before booking confirmation
• Requesting or making payments outside the Platform
• Using the Platform to find Talent/Clients, then transacting offline
• Creating fake bookings to exchange contact information
• Offering or accepting discounts for off-platform payment

CONSEQUENCES OF VIOLATION:

• IMMEDIATE account termination
• FORFEITURE of all pending payouts
• PERMANENT ban from the Platform
• Legal action to recover lost platform fees (estimated at 15% of circumvented booking values)
• Reporting to relevant authorities if fraud is suspected
• Negative impact on any references or ratings

MONITORING: We employ automated and manual detection systems to identify circumvention attempts. Suspicious patterns will be investigated.`,
    accent: true,
  },
  {
    icon: <UserX size={24} color="#F97316" strokeWidth={2} />,
    title: '15. User Conduct',
    content: `ALL USERS MUST NOT:

FRAUDULENT BEHAVIOR:
• Provide false information or misrepresent identity
• Create fake profiles, reviews, or bookings
• Engage in any form of financial fraud
• Use stolen payment methods

HARMFUL CONDUCT:
• Harass, threaten, or intimidate other users
• Discriminate based on race, gender, religion, nationality, or other protected characteristics
• Engage in physical violence or threats
• Stalk or repeatedly contact users who have blocked communication

PLATFORM ABUSE:
• Spam or send unsolicited promotional content
• Scrape or collect user data without authorization
• Attempt to manipulate search rankings or algorithms
• Interfere with Platform security or functionality
• Use automated tools or bots

ILLEGAL ACTIVITIES:
• Use the Platform for any illegal purpose
• Facilitate money laundering or terrorist financing
• Solicit or provide illegal services`,
  },
  {
    icon: <FileText size={24} color="#F97316" strokeWidth={2} />,
    title: '16. Content Standards',
    content: `USER-GENERATED CONTENT:

PORTFOLIO & PROFILE:
• Must be your own work or work you have rights to display
• Must accurately represent your skills and experience
• Must not contain explicit, violent, or offensive material
• Must not infringe on third-party intellectual property

MESSAGES & COMMUNICATIONS:
• Must remain professional and respectful
• Must not contain spam, solicitations, or irrelevant content
• Must not include contact information before booking confirmation
• Must not contain threats, harassment, or abuse

REVIEWS:
• Must be honest and based on actual experience
• Must not contain defamatory statements
• Must not be exchanged for compensation or favors
• Must not reveal confidential business information

CONTENT MODERATION: Engage reserves the right to remove any content that violates these standards without notice. Repeated violations will result in account suspension.`,
  },
  {
    icon: <Lock size={24} color="#F97316" strokeWidth={2} />,
    title: '17. Intellectual Property',
    content: `OWNERSHIP OF WORK:

TALENT WORK PRODUCT: Unless otherwise agreed in writing:
• Talent retains copyright to all original creative work
• Client receives a non-exclusive license to use deliverables for agreed purposes
• Full ownership transfer requires explicit written agreement
• Talent may display work in portfolio unless confidentiality agreed

PLATFORM CONTENT:
• The Engage name, logo, and branding are our trademarks
• Platform software, design, and features are our intellectual property
• Users may not copy, modify, or distribute Platform elements

USER CONTENT LICENSE: By uploading content to the Platform, you grant Engage a non-exclusive, worldwide, royalty-free license to use, display, and promote that content for Platform operations and marketing purposes.

INFRINGEMENT CLAIMS: Report intellectual property violations to legal@goonyx.ai with supporting documentation.`,
  },
  {
    icon: <CheckCircle size={24} color="#F97316" strokeWidth={2} />,
    title: '18. Verification & Trust',
    content: `VERIFICATION SERVICES:

Engage may offer identity and credential verification services including:
• Government ID verification
• Professional license verification
• Portfolio authenticity checks
• Background checks (where legally permitted)

VERIFICATION BADGES: Verified users may display trust badges on their profiles. These badges indicate:
• Identity has been confirmed
• Credentials have been validated
• User has met Platform standards

IMPORTANT DISCLAIMERS:

Verification does NOT guarantee:
• Quality of services provided
• Ongoing compliance with standards
• Safety of interactions
• Accuracy of all profile information
• Suitability for any particular purpose

Users should exercise their own judgment when engaging with any user, verified or not. Engage is not liable for the actions of verified users.`,
  },
  {
    icon: <Star size={24} color="#F97316" strokeWidth={2} />,
    title: '19. Reviews & Ratings',
    content: `REVIEW SYSTEM:

LEAVING REVIEWS:
• Reviews may be left within 14 days of booking completion
• Reviews should be honest, fair, and based on actual experience
• Both Talent and Client may leave reviews for each other
• Ratings are on a 5-star scale with optional text comments

PROHIBITED REVIEW PRACTICES:
• Review manipulation through fake bookings
• Offering incentives for positive reviews
• Threatening negative reviews for discounts
• Defamatory or knowingly false statements
• Revealing confidential client information

REVIEW DISPUTES:
• Reviews may be flagged for policy violations
• Engage may remove reviews that violate guidelines
• We do not remove reviews simply because they are negative
• Responses to reviews are permitted and encouraged

IMPACT OF REVIEWS: Reviews affect search ranking, trust badges, and platform standing. Consistently poor reviews may result in profile demotion or removal.`,
  },
  {
    icon: <FileWarning size={24} color="#EA580C" strokeWidth={2} />,
    title: '20. Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:

ENGAGE SHALL NOT BE LIABLE FOR:

• Disputes between Talent and Clients
• Quality, accuracy, timeliness, or completion of services
• Accuracy of portfolios, profiles, or user representations
• Physical injury, property damage, or personal harm during bookings
• Lost profits, revenue, data, or business opportunities
• Indirect, incidental, special, punitive, or consequential damages
• Any amount exceeding the total fees paid to Engage in the preceding 12 months
• Loss or damage arising from reliance on Platform content
• Actions, omissions, or conduct of any user
• Third-party products, services, or websites
• Service interruptions, errors, or data loss

THE PLATFORM AND ALL SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

SOME JURISDICTIONS DO NOT ALLOW LIMITATION OF LIABILITY FOR CERTAIN DAMAGES. IN SUCH CASES, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.`,
    accent: true,
  },
  {
    icon: <Shield size={24} color="#EA580C" strokeWidth={2} />,
    title: '21. Indemnification',
    content: `You agree to indemnify, defend, and hold harmless Engage, its affiliates, subsidiaries, officers, directors, employees, agents, partners, and licensors from and against any and all claims, demands, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from or related to:

• Your use of or access to the Platform
• Your violation of these Terms
• Your violation of any third-party rights, including intellectual property rights
• Your Content or services provided through the Platform
• Your interaction with other users
• Any negligent or wrongful conduct by you
• Any breach of your representations and warranties
• Any taxes or penalties arising from your use of the Platform

This indemnification obligation survives the termination of your account and these Terms.

Engage reserves the right to assume exclusive defense and control of any matter subject to indemnification by you, at your expense. You agree to cooperate fully with our defense of any such claims.`,
    accent: true,
  },
  {
    icon: <FileWarning size={24} color="#F97316" strokeWidth={2} />,
    title: '22. Warranty Disclaimer',
    content: `THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS.

ENGAGE EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO:

• Merchantability and fitness for a particular purpose
• Non-infringement of third-party rights
• Accuracy, reliability, or completeness of Platform content
• Uninterrupted, secure, or error-free operation
• Results obtained from using the Platform
• Quality of services provided by Talent
• Accuracy of Talent profiles or portfolios

NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM ENGAGE SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.

SOME JURISDICTIONS DO NOT ALLOW DISCLAIMER OF IMPLIED WARRANTIES. IN SUCH CASES, THE ABOVE DISCLAIMERS MAY NOT APPLY TO YOU TO THE EXTENT PROHIBITED BY LAW.`,
  },
  {
    icon: <Ban size={24} color="#F97316" strokeWidth={2} />,
    title: '23. Termination',
    content: `TERMINATION BY USER:
• You may terminate your account at any time through account settings
• Outstanding payments must be settled before termination
• Pending bookings must be completed or properly cancelled
• Some data may be retained as required by law

TERMINATION BY ENGAGE: We may suspend or terminate your account immediately, without notice, for:
• Violation of these Terms
• Fraudulent, illegal, or harmful activity
• Non-payment of fees
• Extended inactivity (12+ months)
• Request by law enforcement
• Platform discontinuation

EFFECTS OF TERMINATION:
• Access to Platform immediately revoked
• Pending payouts may be held for 90 days pending dispute resolution
• Data deleted per our Privacy Policy, except as legally required
• Outstanding obligations survive termination

REINSTATEMENT: Terminated accounts may apply for reinstatement after 12 months, subject to review and approval at Engage's sole discretion.`,
  },
  {
    icon: <Gavel size={24} color="#F97316" strokeWidth={2} />,
    title: '24. Governing Law & Jurisdiction',
    content: `GOVERNING LAW: These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates, without regard to conflict of law principles.

JURISDICTION: Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of Dubai, United Arab Emirates.

ARBITRATION: For disputes exceeding AED 50,000, parties agree to submit to binding arbitration under the rules of the Dubai International Arbitration Centre (DIAC). The arbitration shall be conducted in English.

CLASS ACTION WAIVER: You agree to resolve disputes on an individual basis only. You waive any right to participate in class actions, class arbitrations, or representative actions.

TIME LIMITATION: Any claim arising from these Terms must be filed within one (1) year of the event giving rise to the claim, or be permanently barred.`,
  },
  {
    icon: <Settings size={24} color="#F97316" strokeWidth={2} />,
    title: '25. General Provisions',
    content: `SEVERABILITY: If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.

ENTIRE AGREEMENT: These Terms, together with our Privacy Policy, constitute the entire agreement between you and Engage regarding the Platform.

WAIVER: Failure to enforce any provision of these Terms shall not constitute a waiver of that provision or any other provision.

ASSIGNMENT: You may not assign your rights under these Terms without our written consent. Engage may assign its rights without restriction.

AMENDMENTS: We may modify these Terms at any time. Material changes will be notified via email or Platform notification at least 30 days in advance. Continued use after changes constitutes acceptance.

HEADINGS: Section headings are for convenience only and do not affect interpretation.

LANGUAGE: These Terms are drafted in English. In case of conflict with any translation, the English version shall prevail.`,
  },
];

export function TermsOfServicePage({ userType = 'client' }: TermsOfServicePageProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Theme-aware colors
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    cardBg: isDark ? '#1A1A1A' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#ffffff' : '#1f2937',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    mutedBg: isDark ? '#2d3748' : '#f3f4f6',
    heroBg: isDark ? '#111827' : '#f9fafb',
    accentOrange: '#F97316',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.cardBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: pressed ? colors.border : colors.mutedBg,
            },
          ]}
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 48 }}>
          {/* Hero Section */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Gavel size={24} color={colors.accentOrange} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                  Terms of Service
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  Last updated: February 2025
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22, textAlign: 'left' }}>
              Please read these Terms of Service carefully before using the Engage platform operated by Goonyx FZ-LLC. By accessing or using our services, you agree to be bound by these terms.
            </Text>
          </View>

          {/* Important Notice */}
          <View
            style={{
              marginBottom: 24,
              padding: 14,
              backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.08)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(249, 115, 22, 0.25)' : 'rgba(249, 115, 22, 0.2)',
            }}
          >
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.text }}>
              <Text style={{ fontWeight: '700', color: colors.accentOrange }}>Important: </Text>
              Sections marked with an orange indicator contain critical terms regarding liability, no-show policies, and fee circumvention that you should read carefully.
            </Text>
          </View>

          {/* Terms Sections */}
          {termsSections.map((section, index) => (
            <View
              key={index}
              style={{
                backgroundColor: colors.cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: section.accent ? (isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.3)') : colors.border,
                borderLeftWidth: section.accent ? 4 : 1,
                borderLeftColor: section.accent ? colors.accentOrange : colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: section.accent
                      ? isDark
                        ? 'rgba(249, 115, 22, 0.15)'
                        : 'rgba(249, 115, 22, 0.1)'
                      : colors.mutedBg,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {section.icon}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>
                  {section.title}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 21, paddingLeft: 4 }}>
                {section.content}
              </Text>
            </View>
          ))}

          {/* Contact Section */}
          <View
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Mail size={18} color={colors.accentOrange} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>
                Contact Us
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 16, paddingLeft: 4 }}>
              If you have any questions about these Terms of Service, please contact us:
            </Text>

            <View style={{ gap: 12, paddingLeft: 4 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                  Legal Inquiries
                </Text>
                <Text style={{ fontSize: 13, color: colors.accentOrange }}>legal@goonyx.ai</Text>
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                  General Support
                </Text>
                <Text style={{ fontSize: 13, color: colors.accentOrange }}>support@goonyx.ai</Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 16, paddingLeft: 4 }}>
              DMS LLC{'\n'}Dubai, United Arab Emirates
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
