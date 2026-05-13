/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  BRAND,
  Body1,
  Greeting,
  Note,
  PetSwapEmail,
  Title,
} from '../email-brand.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <PetSwapEmail preview={`Your ${BRAND.name} verification code.`}>
    <Title>Confirm it's you</Title>
    <Greeting>Hi there,</Greeting>
    <Body1>Use the code below to confirm your identity on {BRAND.name}:</Body1>

    <Section style={codeWrap}>
      <Text style={codeText}>{token}</Text>
    </Section>

    <Note>
      This code expires shortly. If you didn't request this, you can safely
      ignore this email.
    </Note>
  </PetSwapEmail>
)

export default ReauthenticationEmail

const codeWrap = {
  backgroundColor: '#F8FAFC',
  border: '1px solid #EEF2F7',
  borderRadius: '16px',
  padding: '24px',
  margin: '8px 0 28px',
  textAlign: 'center' as const,
}
const codeText = {
  fontFamily:
    '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '32px',
  fontWeight: '700',
  color: '#0F172A',
  letterSpacing: '0.4em',
  margin: 0,
  lineHeight: '1.2',
}
