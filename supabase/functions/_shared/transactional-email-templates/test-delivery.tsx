import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PetSwap'

interface TestDeliveryProps {
  sentAt?: string
}

const TestDeliveryEmail = ({ sentAt }: TestDeliveryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{SITE_NAME} email delivery test</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>It works! 🐾</Heading>
        <Text style={text}>
          This is a test email from {SITE_NAME} sent via
          noreply@notify.petswap.co.uk to confirm that delivery, branding,
          and formatting are all working as expected.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Sender</Text>
          <Text style={cardValue}>noreply@notify.petswap.co.uk</Text>
          <Text style={cardLabel}>Sent at</Text>
          <Text style={cardValue}>{sentAt || 'just now'}</Text>
        </Section>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestDeliveryEmail,
  subject: 'PetSwap email delivery test',
  displayName: 'Test delivery',
  previewData: { sentAt: new Date().toISOString() },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#0B8F6A',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const card = {
  backgroundColor: '#F3FAF7',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0',
}
const cardLabel = {
  fontSize: '12px',
  color: '#6B7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}
const cardValue = {
  fontSize: '14px',
  color: '#111827',
  margin: '0 0 12px',
  fontWeight: 500,
}
const footer = {
  fontSize: '13px',
  color: '#6B7280',
  margin: '24px 0 0',
}
