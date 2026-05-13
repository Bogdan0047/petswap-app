/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, TrustBlock, Title } from '../email-brand.tsx'

interface Props { firstName?: string; completionPct?: number }

const ProfileIncompleteEmail = ({ firstName, completionPct }: Props) => (
  <PetSwapEmail preview="Complete your profile to get more trusted swaps.">
    <Title>Complete your profile to get more trusted swaps</Title>
    <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
    <Body1>
      Your {BRAND.name} profile is{' '}
      {typeof completionPct === 'number' ? `${completionPct}% complete` : 'almost ready'}.
      Pet owners are far more likely to trust — and choose — profiles that are filled out.
    </Body1>
    <Body1>
      Add a clear photo, a short bio, and your area to start receiving requests.
    </Body1>
    <CTA href={`${BRAND.url}/profile`}>Complete profile</CTA>
    <TrustBlock
      heading="Why this matters"
      items={[
        'Complete profiles get up to 3× more matches',
        'A real photo builds instant trust',
        'You stay in full control of your details',
      ]}
    />
  </PetSwapEmail>
)

export const template = {
  component: ProfileIncompleteEmail,
  subject: 'Complete your profile to get more trusted swaps',
  displayName: 'Profile incomplete reminder',
  previewData: { firstName: 'Sam', completionPct: 45 },
} satisfies TemplateEntry
