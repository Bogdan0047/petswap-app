/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Link } from 'npm:@react-email/components@0.0.22'
import {
  BRAND,
  Body1,
  CTA,
  Greeting,
  Note,
  PetSwapEmail,
  Strong,
  Title,
} from '../email-brand.tsx'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <PetSwapEmail preview={`Confirm your new email address for ${BRAND.name}.`}>
    <Title>Confirm your new email</Title>
    <Greeting>Hi there,</Greeting>
    <Body1>
      You requested to change the email on your {BRAND.name} account from{' '}
      <Link href={`mailto:${oldEmail}`} style={{ color: '#0B8F6A', textDecoration: 'none', fontWeight: 500 }}>
        {oldEmail}
      </Link>{' '}
      to <Strong>{newEmail}</Strong>.
    </Body1>
    <CTA href={confirmationUrl}>Confirm email change</CTA>
    <Note>
      If you didn't request this, please secure your account immediately.
    </Note>
  </PetSwapEmail>
)

export default EmailChangeEmail
