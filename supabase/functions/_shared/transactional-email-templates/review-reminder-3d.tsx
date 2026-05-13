/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
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
  reviewUrl?: string
  __eventId?: string
  __trackBase?: string
}

const ReviewReminder3dEmail = ({ firstName, otherFirstName, petName, reviewUrl, __eventId, __trackBase }: Props) => {
  const dest = reviewUrl || `${BRAND.url}/inbox`
  const url = trackedUrl(dest, 'leave_review', __eventId, __trackBase)
  const them = otherFirstName || 'your swap partner'
  const pet = petName ? ` (and ${petName})` : ''

  return (
    <PetSwapEmail preview={`30 seconds — leave ${them} a quick review.`}>
      <Title>Quick favour? Rate {them}{pet}</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

      <Body1>
        Your swap with <strong style={{ color: '#0F172A' }}>{them}</strong>{pet}{' '}
        wrapped up a few days ago. A quick rating helps the next pet owner
        choose with confidence.
      </Body1>

      <Text style={stars}>★ ★ ★ ★ ★</Text>

      <CTA href={url}>Leave your review</CTA>

      <Text style={hint}>
        Takes 30 seconds · {them} can review you back once you do
      </Text>
    </PetSwapEmail>
  )
}

export const template = {
  component: ReviewReminder3dEmail,
  subject: (d: Record<string, any>) =>
    d?.otherFirstName ? `Last chance: rate ${d.otherFirstName}` : `Rate your last swap`,
  displayName: 'Review reminder · 3d',
  previewData: {
    firstName: 'Sam',
    otherFirstName: 'Alex',
    petName: 'Buddy',
    reviewUrl: `${BRAND.url}/inbox`,
  },
} satisfies TemplateEntry

const stars: React.CSSProperties = {
  fontSize: 26, letterSpacing: '4px', color: '#FACC15', textAlign: 'center', margin: '14px 0 18px',
}
const hint: React.CSSProperties = {
  margin: '12px 0 0', fontSize: 12.5, color: '#94A3B8', textAlign: 'center',
}
