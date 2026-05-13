/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button as REButton,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

/**
 * Shared PetSwap email design system.
 *
 * Used by ALL templates (auth + transactional) so every email looks like
 * the same premium product. Apple-inspired minimal, generous spacing,
 * #0B8F6A green accent, #16a34a CTA, soft cards, system font stack.
 *
 * Body background is always #ffffff — non-negotiable.
 */

export const BRAND = {
  name: 'PetSwap',
  tagline: 'Trusted Pet Care Community',
  url: 'https://petswap.co.uk',
  supportEmail: 'support@petswap.co.uk',
  logoUrl: 'https://petswap.co.uk/favicon.png',
  primary: '#0B8F6A',
  cta: '#16a34a',
  ctaHover: '#15803d',
}

// ──────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────

export const PetSwapEmail = ({
  preview,
  children,
  showFooter = true,
}: {
  preview: string
  children: React.ReactNode
  showFooter?: boolean
}) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader />
        {children}
        {showFooter && <BrandFooter />}
      </Container>
    </Body>
  </Html>
)

// ──────────────────────────────────────────────────────────
// Building blocks
// ──────────────────────────────────────────────────────────

export const BrandHeader = () => (
  <>
    <Section style={s.header}>
      <Img
        src={BRAND.logoUrl}
        width="56"
        height="56"
        alt={BRAND.name}
        style={s.logo}
      />
      <Text style={s.brandName}>{BRAND.name}</Text>
      <Text style={s.tagline}>{BRAND.tagline}</Text>
    </Section>
    <Hr style={s.headerDivider} />
  </>
)

export const Title = ({ children }: { children: React.ReactNode }) => (
  <Heading style={s.h1}>{children}</Heading>
)

export const Greeting = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.greeting}>{children}</Text>
)

export const Body1 = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.text}>{children}</Text>
)

export const Strong = ({ children }: { children: React.ReactNode }) => (
  <strong style={s.strong}>{children}</strong>
)

export const CTA = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={s.buttonWrap}>
    <REButton href={href} style={s.button}>
      {children}
    </REButton>
  </Section>
)

/**
 * Build a click-tracking redirect URL for an email CTA.
 * If eventId or trackBase missing (preview/local), returns the bare destination.
 */
export const trackedUrl = (
  destination: string,
  cta: string,
  eventId?: string,
  trackBase?: string,
): string => {
  if (!eventId || !trackBase) return destination
  return `${trackBase}/c/${eventId}/${encodeURIComponent(cta)}?to=${encodeURIComponent(destination)}`
}

/** Soft rounded info card — used for booking details, trust block, etc. */
export const Card = ({ children }: { children: React.ReactNode }) => (
  <Section style={s.card}>{children}</Section>
)

export const CardHeading = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.cardHeading}>{children}</Text>
)

export const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <>
    {items.map((item, i) => (
      <Section key={i} style={s.bulletRow}>
        <Text style={s.bullet}>•</Text>
        <Text style={s.bulletItem}>{item}</Text>
      </Section>
    ))}
  </>
)

/** Standard "Why this matters" trust block. */
export const TrustBlock = ({
  heading = 'Why this matters',
  items = [
    'Your data is secure',
    'You stay in control',
    'PetSwap protects your experience',
  ],
}: {
  heading?: string
  items?: string[]
}) => (
  <Card>
    <CardHeading>{heading}</CardHeading>
    <Bullets items={items} />
  </Card>
)

/** Soft tip / safety line in a tinted pill. */
export const SafetyTip = ({ children }: { children: React.ReactNode }) => (
  <Section style={s.tip}>
    <Text style={s.tipText}>{children}</Text>
  </Section>
)

export const Note = ({ children }: { children: React.ReactNode }) => (
  <Text style={s.note}>{children}</Text>
)

export const BrandFooter = () => (
  <>
    <Hr style={s.hr} />
    <Text style={s.footer}>Need help? Our team is here for you.</Text>
    <Text style={s.footer}>
      <Link href={`mailto:${BRAND.supportEmail}`} style={s.link}>
        {BRAND.supportEmail}
      </Link>
    </Text>
    <Text style={s.legalNote}>
      You received this email because of activity on your {BRAND.name} account.
    </Text>
    <Text style={s.signoff}>— The {BRAND.name} team</Text>
  </>
)

// ──────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────

const s = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI", Helvetica, Arial, sans-serif',
    margin: 0,
    padding: '40px 0',
    WebkitFontSmoothing: 'antialiased',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '40px 32px 48px',
    backgroundColor: '#ffffff',
  },

  // Header
  header: { textAlign: 'center' as const, margin: '0 0 24px' },
  logo: { display: 'block', margin: '0 auto 12px', borderRadius: '14px' },
  brandName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#0F172A',
    margin: '0 0 4px',
    letterSpacing: '-0.01em',
    textAlign: 'center' as const,
  },
  tagline: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    fontWeight: '500',
  },
  headerDivider: {
    border: 'none',
    borderTop: '1px solid #F1F5F9',
    margin: '24px 0 32px',
  },

  // Title + body
  h1: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: '1.25',
    margin: '0 0 28px',
    letterSpacing: '-0.02em',
    textAlign: 'center' as const,
  },
  greeting: {
    fontSize: '16px',
    color: '#0F172A',
    lineHeight: '1.6',
    margin: '0 0 16px',
    fontWeight: '500',
  },
  text: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: '1.7',
    margin: '0 0 16px',
  },
  strong: { color: '#0F172A', fontWeight: '600' },

  // CTA
  buttonWrap: { margin: '32px 0', textAlign: 'center' as const },
  button: {
    backgroundColor: '#16a34a',
    backgroundImage: 'linear-gradient(180deg, #1cb356 0%, #16a34a 100%)',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    borderRadius: '999px',
    padding: '15px 36px',
    display: 'inline-block',
    letterSpacing: '-0.01em',
    boxShadow:
      '0 1px 0 rgba(255,255,255,0.2) inset, 0 6px 16px rgba(22,163,74,0.28), 0 2px 4px rgba(22,163,74,0.18)',
  },

  // Card
  card: {
    backgroundColor: '#F8FAFC',
    border: '1px solid #EEF2F7',
    borderRadius: '16px',
    padding: '22px 24px',
    margin: '8px 0 28px',
  },
  cardHeading: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#0F172A',
    margin: '0 0 14px',
    letterSpacing: '-0.01em',
  },
  bulletRow: { display: 'table', width: '100%', margin: '0 0 8px' },
  bullet: {
    display: 'table-cell',
    width: '14px',
    fontSize: '14px',
    color: '#0B8F6A',
    lineHeight: '1.6',
    margin: 0,
    paddingRight: '8px',
    verticalAlign: 'top' as const,
    fontWeight: '700',
  },
  bulletItem: {
    display: 'table-cell',
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.6',
    margin: 0,
    verticalAlign: 'top' as const,
  },

  // Tip pill
  tip: {
    backgroundColor: '#F0FAF6',
    border: '1px solid #CFEFE2',
    borderRadius: '12px',
    padding: '12px 16px',
    margin: '0 0 24px',
  },
  tipText: {
    fontSize: '13px',
    color: '#0F172A',
    lineHeight: '1.55',
    margin: 0,
  },

  note: {
    fontSize: '13px',
    color: '#94A3B8',
    lineHeight: '1.6',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },

  hr: {
    border: 'none',
    borderTop: '1px solid #F1F5F9',
    margin: '32px 0 24px',
  },

  // Footer
  footer: {
    fontSize: '13px',
    color: '#64748B',
    lineHeight: '1.6',
    margin: '0 0 6px',
    textAlign: 'center' as const,
  },
  link: {
    color: '#0B8F6A',
    textDecoration: 'none',
    fontWeight: '500',
  },
  legalNote: {
    fontSize: '11px',
    color: '#CBD5E1',
    lineHeight: '1.5',
    margin: '20px 0 0',
    textAlign: 'center' as const,
  },
  signoff: {
    fontSize: '13px',
    color: '#94A3B8',
    textAlign: 'center' as const,
    margin: '12px 0 0',
  },
}
