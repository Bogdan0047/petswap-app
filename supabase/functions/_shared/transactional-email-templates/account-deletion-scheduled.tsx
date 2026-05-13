/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND,
  Body1,
  CTA,
  Greeting,
  Note,
  PetSwapEmail,
  Strong,
  Title,
  TrustBlock,
} from '../email-brand.tsx'

const RESTORE_URL = `${BRAND.url}/auth`

interface Props {
  firstName?: string
  daysLeft?: number
}

const AccountDeletionScheduledEmail = ({ firstName, daysLeft = 30 }: Props) => (
  <PetSwapEmail
    preview={`Your ${BRAND.name} account will be deleted in ${daysLeft} days — restore anytime.`}
  >
    <Title>Your {BRAND.name} account is scheduled for deletion</Title>

    <Greeting>{firstName ? `Hi ${firstName},` : 'Hi,'}</Greeting>

    <Body1>
      We've received your request to delete your {BRAND.name} account.
    </Body1>

    <Body1>
      Your profile, pets, matches, and messages are now hidden from the
      community. Your account will be permanently deleted in{' '}
      <Strong>{daysLeft} days</Strong>.
    </Body1>

    <Body1>
      If this wasn't intentional or you change your mind, you can restore
      your account instantly.
    </Body1>

    <CTA href={RESTORE_URL}>Restore my account</CTA>

    <TrustBlock
      items={[
        'Your data is securely stored during the 30-day window',
        'No one can access your profile during this time',
        'You remain in full control',
      ]}
    />

    <Note>
      After {daysLeft} days, your personal data will be permanently removed
      and this action cannot be undone.
    </Note>
  </PetSwapEmail>
)

export const template = {
  component: AccountDeletionScheduledEmail,
  subject: `Your ${BRAND.name} account is scheduled for deletion`,
  displayName: 'Account deletion scheduled',
  previewData: { firstName: 'Sam', daysLeft: 30 },
} satisfies TemplateEntry
