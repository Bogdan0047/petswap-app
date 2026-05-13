/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND,
  Body1,
  CTA,
  Greeting,
  PetSwapEmail,
  Title,
  trackedUrl,
} from '../email-brand.tsx'

interface Props {
  firstName?: string
  otherFirstName?: string
  petName?: string
  dates?: string
  reviewUrl?: string
  __eventId?: string
  __trackBase?: string
  // A/B overrides
  ctaTextOverride?: string
  incentiveOverride?: string
}

const ReviewRequestEmail = ({ firstName, otherFirstName, petName, dates, reviewUrl, __eventId, __trackBase, ctaTextOverride, incentiveOverride }: Props) => {
  const dest = reviewUrl || `${BRAND.url}/inbox`
  const url = trackedUrl(dest, 'leave_review', __eventId, __trackBase)
  const them = otherFirstName || 'your swap partner'
  const pet = petName ? ` (and ${petName})` : ''

  return (
    <PetSwapEmail
      preview={`30 seconds to rate ${them}${pet} on ${BRAND.name}.`}
    >
      <Title>How was {them}{pet}? ⭐</Title>

      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      {/* Emotional hook */}
      <Text style={hook}>Your review keeps {BRAND.name} trusted for everyone.</Text>

      <Body1>
        Your swap is wrapped up. A quick rating helps the next pet owner choose
        with confidence — and {them} will get to review you back.
      </Body1>

      {/* Context card with stars preview */}
      <Section style={contextCard}>
        <Text style={contextLabel}>YOUR SWAP</Text>
        <Text style={contextLine}>
          You stayed with <strong style={{ color: '#0F172A' }}>{them}</strong>{pet}
        </Text>
        {dates && <Text style={contextDates}>{dates}</Text>}
        <Text style={starsPreview}>★ ★ ★ ★ ★</Text>
        <Text style={starsHint}>Tap to rate your experience</Text>
      </Section>

      <CTA href={url}>{ctaTextOverride || 'Leave a review'}</CTA>

      <Text style={secondary}>
        Takes 30 seconds. Most members review within 24 hours of finishing.
      </Text>

      {/* Reciprocity + urgency + trust pills */}
      <Section style={pillRow}>
        {incentiveOverride && incentiveOverride.length > 0 && (
          <Text style={pill}>{incentiveOverride}</Text>
        )}
        <Text style={pill}>⭐ Members with reviews get 3× more matches</Text>
        <Text style={pill}>🤝 {them} will also review you</Text>
        <Text style={pill}>⏱ Most members leave reviews within 24 hours</Text>
        <Text style={pill}>📸 You can also upload photos from your swap</Text>
      </Section>
    </PetSwapEmail>
  )
}

export const template = {
  component: ReviewRequestEmail,
  subject: (d: Record<string, any>) =>
    d?.otherFirstName
      ? `Rate your swap with ${d.otherFirstName} ⭐`
      : `How was your ${BRAND.name}? ⭐`,
  displayName: 'Review request',
  previewData: {
    firstName: 'Sam',
    otherFirstName: 'Alex',
    petName: 'Buddy',
    dates: 'Sat 4 May → Mon 6 May',
  },
} satisfies TemplateEntry

const contextCard = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '14px',
  padding: '16px 18px',
  margin: '20px 0 24px',
}
const contextLabel = {
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.6px',
  color: '#64748B',
  margin: '0 0 6px',
}
const contextLine = {
  fontSize: '15px',
  lineHeight: '1.45',
  color: '#0F172A',
  margin: '0',
}
const contextDates = {
  fontSize: '13px',
  color: '#475569',
  margin: '4px 0 0',
}
const starsPreview = {
  fontSize: '26px',
  letterSpacing: '4px',
  color: '#FACC15',
  textAlign: 'center' as const,
  margin: '14px 0 4px',
}
const starsHint = {
  fontSize: '11.5px',
  color: '#94A3B8',
  textAlign: 'center' as const,
  margin: '0',
}
const hook = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#0B8F6A',
  margin: '0 0 14px',
}
const secondary = {
  fontSize: '13px',
  color: '#64748B',
  textAlign: 'center' as const,
  margin: '14px 0 22px',
}
const pillRow = {
  margin: '8px 0 0',
}
const pill = {
  display: 'block',
  fontSize: '12.5px',
  color: '#0F172A',
  backgroundColor: '#F0FAF6',
  border: '1px solid #D1F0E2',
  borderRadius: '999px',
  padding: '9px 14px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
