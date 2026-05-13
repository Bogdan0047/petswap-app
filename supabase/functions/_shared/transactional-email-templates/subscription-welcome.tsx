/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BRAND, Body1, CTA, Greeting, PetSwapEmail, Title } from '../email-brand.tsx'

interface Props {
  firstName?: string
  appUrl?: string
}

const SubscriptionWelcomeEmail = ({ firstName, appUrl }: Props) => {
  const url = appUrl || BRAND.url
  return (
    <PetSwapEmail preview={`Welcome to ${BRAND.name} — let's get you set up.`}>
      <Title>Welcome to {BRAND.name}</Title>
      <Greeting>{firstName ? `Hi ${firstName},` : 'Hi there,'}</Greeting>
      <Body1>
        We're glad you're here. {BRAND.name} is a trusted community of pet owners helping each other —
        no kennels, no stress. Here's how to get started.
      </Body1>

      <Section style={card}>
        <StepRow n="1" title="Complete your profile" sub="Helps neighbours trust you." />
        <StepRow n="2" title="Add your pet" sub="A photo and a few details go a long way." />
        <StepRow n="3" title="Start your first swap" sub="Find someone nearby you can rely on." />
      </Section>

      <CTA href={`${url}/edit-profile`}>Complete your profile</CTA>

      <Text style={secondary}>
        <Link href={url} style={link}>Explore PetSwap →</Link>
      </Text>

      <Text style={fineprint}>Cancel anytime · No hidden fees</Text>
      <Text style={legal}>
        <Link href={`${BRAND.url}/legal`} style={legalLink}>Privacy</Link>
        {' · '}
        <Link href={`${BRAND.url}/legal`} style={legalLink}>Terms</Link>
      </Text>
    </PetSwapEmail>
  )
}

const StepRow = ({ n, title, sub }: { n: string; title: string; sub: string }) => (
  <Section style={stepRow}>
    <Text style={stepNum}>{n}</Text>
    <Text style={stepTitle}>{title}</Text>
    <Text style={stepSub}>{sub}</Text>
  </Section>
)

export const template = {
  component: SubscriptionWelcomeEmail,
  subject: `Welcome to ${BRAND.name}`,
  displayName: 'Subscription welcome',
  previewData: { firstName: 'Sam' },
} satisfies TemplateEntry

const card = { backgroundColor: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: '16px', padding: '8px 22px 16px', margin: '8px 0 24px' }
const stepRow = { padding: '14px 0', borderBottom: '1px solid #EEF2F7' }
const stepNum = { display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', textAlign: 'center' as const, borderRadius: '999px', backgroundColor: '#0B8F6A', color: '#ffffff', fontSize: '13px', fontWeight: 700, margin: '0 0 6px' }
const stepTitle = { fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }
const stepSub = { fontSize: '13.5px', color: '#64748B', margin: 0, lineHeight: '1.5' }
const secondary = { fontSize: '14px', textAlign: 'center' as const, margin: '4px 0 20px' }
const link = { color: '#0B8F6A', textDecoration: 'none', fontWeight: 500 }
const fineprint = { fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' as const, margin: '24px 0 6px' }
const legal = { fontSize: '12px', color: '#CBD5E1', textAlign: 'center' as const, margin: '0' }
const legalLink = { color: '#94A3B8', textDecoration: 'none' }
