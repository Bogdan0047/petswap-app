/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  BRAND,
  Body1,
  CTA,
  Greeting,
  Note,
  PetSwapEmail,
  Title,
} from '../email-brand.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <PetSwapEmail preview={`Reset your ${BRAND.name} password.`}>
    <Title>Reset your {BRAND.name} password</Title>
    <Greeting>Hi there,</Greeting>
    <Body1>
      We received a request to reset the password for your {BRAND.name}{' '}
      account. Tap the button below to choose a new one.
    </Body1>
    <CTA href={confirmationUrl}>Reset password</CTA>
    <Note>
      If you didn't request this, you can ignore this email — your password
      won't change.
    </Note>
  </PetSwapEmail>
)

export default RecoveryEmail
