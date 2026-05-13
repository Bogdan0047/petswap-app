/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND,
  Body1,
  Card,
  CardHeading,
  CTA,
  Greeting,
  Note,
  PetSwapEmail,
  SafetyTip,
  Title,
  TrustBlock,
} from '../email-brand.tsx'

interface Props {
  firstName?: string
  profileUrl?: string
  /** Human-readable verification type, e.g. "ID verified", "Phone verified", "Profile complete". */
  verificationType?: string
  /** Updated trust score 0–100. */
  trustScore?: number
}

const verificationLabel = (raw?: string): string => {
  if (!raw) return 'Profile verified'
  const map: Record<string, string> = {
    id: 'ID verified',
    phone: 'Phone verified',
    email: 'Email verified',
    profile: 'Profile complete',
    trust: 'Trust milestone reached',
  }
  return map[raw.toLowerCase()] ?? raw
}

/**
 * Apple-style shield badge — pure inline CSS so it renders in every email
 * client (no SVG, no external assets).
 */
const ShieldBadge = () => (
  <Section style={badgeWrap}>
    <Text style={badgeCircle}>🛡️</Text>
  </Section>
)

const AccountVerifiedEmail = ({
  firstName,
  profileUrl,
  verificationType,
  trustScore,
}: Props) => {
  const url = profileUrl || `${BRAND.url}/profile`
  const label = verificationLabel(verificationType)
  const showScore = typeof trustScore === 'number' && trustScore >= 0
  return (
    <PetSwapEmail
      preview={`You're now a verified ${BRAND.name} member 🛡️`}
    >
      <ShieldBadge />

      <Title>You're now a verified {BRAND.name} member</Title>

      <Section style={topTrustedWrap}>
        <Text style={topTrustedPill}>
          ★ You're in the top trusted members on {BRAND.name}
        </Text>
      </Section>

      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        Your profile just got a trust upgrade — other members will feel
        more confident connecting with you.
      </Body1>

      {/* Trust boost card */}
      <Card>
        <CardHeading>Trust boost</CardHeading>
        <Section style={row}>
          <Text style={rowLabel}>Verification</Text>
          <Text style={rowValue}>{label}</Text>
        </Section>
        {showScore && (
          <Section style={row}>
            <Text style={rowLabel}>Trust score</Text>
            <Text style={rowValueAccent}>{trustScore} / 100</Text>
          </Section>
        )}
      </Card>

      <SafetyTip>
        📈 Users are <strong>3× more likely</strong> to accept swaps from
        verified members.
      </SafetyTip>

      <CTA href={url}>View your profile</CTA>

      <TrustBlock
        heading="Want even more trust?"
        items={[
          'Add reviews from past pet sits',
          'Upload clear photos of you and your pets',
          'Complete your pet care details and preferences',
        ]}
      />

      <Note>
        We verify members to keep {BRAND.name} safe for everyone.
      </Note>
    </PetSwapEmail>
  )
}

const badgeWrap = {
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const badgeCircle = {
  display: 'inline-block',
  width: '72px',
  height: '72px',
  lineHeight: '72px',
  fontSize: '34px',
  textAlign: 'center' as const,
  borderRadius: '999px',
  backgroundColor: '#F0FAF6',
  border: '1px solid #CFEFE2',
  margin: '0 auto',
  boxShadow: '0 6px 20px rgba(11,143,106,0.15)',
}

const topTrustedWrap = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const topTrustedPill = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#0B8F6A',
  backgroundColor: '#F0FAF6',
  border: '1px solid #CFEFE2',
  borderRadius: '999px',
  padding: '7px 14px',
  letterSpacing: '0.01em',
  margin: 0,
}

const row = {
  display: 'table',
  width: '100%',
  margin: '0 0 8px',
}
const rowLabel = {
  display: 'table-cell' as const,
  fontSize: '13px',
  color: '#64748B',
  fontWeight: '500',
  margin: 0,
  width: '40%',
  verticalAlign: 'middle' as const,
}
const rowValue = {
  display: 'table-cell' as const,
  fontSize: '14px',
  color: '#0F172A',
  fontWeight: '600',
  margin: 0,
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
}
const rowValueAccent = {
  ...rowValue,
  color: '#0B8F6A',
  fontWeight: '700',
}

export const template = {
  component: AccountVerifiedEmail,
  subject: `You're now a verified ${BRAND.name} member 🛡️`,
  displayName: 'Account verified',
  previewData: {
    firstName: 'Sam',
    verificationType: 'id',
    trustScore: 78,
  },
} satisfies TemplateEntry
