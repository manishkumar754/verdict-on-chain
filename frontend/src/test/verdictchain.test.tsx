import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { truncAddr, formatXLM, timeLeft, formatDate, winnerLabel, MOCK_DISPUTES, MOCK_JURORS } from '../lib/mockData'
import { JUROR_TIER_META, DISPUTE_STATUS_META, VOTE_OPTIONS } from '../lib/constants'
import TierBadge from '../components/TierBadge'
import StatusPill from '../components/StatusPill'
import VoteBar from '../components/VoteBar'

// ─── Utility: truncAddr ───────────────────────────────────────────────────────

describe('truncAddr', () => {
  const ADDR = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37'

  it('returns shortened form with ellipsis', () => {
    expect(truncAddr(ADDR)).toContain('…')
    expect(truncAddr(ADDR).length).toBeLessThan(ADDR.length)
  })

  it('starts with correct prefix', () => {
    expect(truncAddr(ADDR).startsWith('GDQP2K')).toBe(true)
  })

  it('ends with correct suffix', () => {
    expect(truncAddr(ADDR).endsWith('W37')).toBe(true)
  })

  it('custom length works', () => {
    expect(truncAddr(ADDR, 8).startsWith('GDQP2KPQ')).toBe(true)
  })
})

// ─── Utility: formatXLM ──────────────────────────────────────────────────────

describe('formatXLM', () => {
  it('converts 10M stroops to 1 XLM', () => {
    expect(formatXLM(10_000_000)).toBe('1 XLM')
  })

  it('converts 100M stroops to 10 XLM', () => {
    expect(formatXLM(100_000_000)).toBe('10 XLM')
  })

  it('converts 1B stroops to 100 XLM', () => {
    expect(formatXLM(1_000_000_000)).toBe('100 XLM')
  })

  it('returns 0 XLM for zero', () => {
    expect(formatXLM(0)).toBe('0 XLM')
  })

  it('formats large amounts with commas', () => {
    expect(formatXLM(10_000_0000000)).toBe('10,000 XLM')
  })
})

// ─── Utility: timeLeft ───────────────────────────────────────────────────────

describe('timeLeft', () => {
  it('returns "Ended" for past timestamps', () => {
    const past = Math.floor(Date.now() / 1000) - 100
    expect(timeLeft(past)).toBe('Ended')
  })

  it('returns days+hours for multi-day deadline', () => {
    const future = Math.floor(Date.now() / 1000) + 2 * 86400 + 3 * 3600
    const label  = timeLeft(future)
    expect(label).toContain('2d')
    expect(label).toContain('3h')
  })

  it('returns hours+minutes for same-day deadline', () => {
    const future = Math.floor(Date.now() / 1000) + 5 * 3600 + 30 * 60
    const label  = timeLeft(future)
    expect(label).toContain('5h')
    expect(label).toContain('30m')
  })
})

// ─── Utility: winnerLabel ─────────────────────────────────────────────────────

describe('winnerLabel', () => {
  it('returns Claimant for side 1', ()   => expect(winnerLabel(1)).toBe('Claimant'))
  it('returns Respondent for side 2', () => expect(winnerLabel(2)).toBe('Respondent'))
  it('returns Tie for side 3', ()        => expect(winnerLabel(3)).toBe('Tie'))
  it('returns Pending for side 0', ()    => expect(winnerLabel(0)).toBe('Pending'))
})

// ─── Utility: formatDate ─────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns — for zero', () => {
    expect(formatDate(0)).toBe('—')
  })

  it('returns formatted date string', () => {
    const result = formatDate(1700000000)
    expect(result).toMatch(/\d{4}/)         // has year
    expect(result.length).toBeGreaterThan(4)
  })
})

// ─── MOCK_DISPUTES integrity ──────────────────────────────────────────────────

describe('MOCK_DISPUTES', () => {
  it('has 5 disputes', () => {
    expect(MOCK_DISPUTES.length).toBe(5)
  })

  it('all disputes have required fields', () => {
    MOCK_DISPUTES.forEach(d => {
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('claimant')
      expect(d).toHaveProperty('respondent')
      expect(d).toHaveProperty('title')
      expect(d).toHaveProperty('status')
      expect(d.claimant).not.toBe(d.respondent)
      expect(d.stake_per_juror).toBeGreaterThan(0)
    })
  })

  it('all IDs are unique', () => {
    const ids = MOCK_DISPUTES.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers Voting and Resolved statuses', () => {
    const statuses = new Set(MOCK_DISPUTES.map(d => d.status))
    expect(statuses.has('Voting')).toBe(true)
    expect(statuses.has('Resolved')).toBe(true)
  })

  it('resolved disputes have winning_side set', () => {
    MOCK_DISPUTES.filter(d => d.status === 'Resolved').forEach(d => {
      expect(d.winning_side).toBeGreaterThan(0)
      expect(d.resolved_at).toBeGreaterThan(0)
    })
  })

  it('total_jurors equals sum of all votes', () => {
    MOCK_DISPUTES.forEach(d => {
      expect(d.votes_claimant + d.votes_respondent + d.votes_abstain).toBe(d.total_jurors)
    })
  })
})

// ─── MOCK_JURORS integrity ────────────────────────────────────────────────────

describe('MOCK_JURORS', () => {
  it('has 5 juror profiles', () => {
    expect(MOCK_JURORS.length).toBe(5)
  })

  it('sorted by reputation descending', () => {
    for (let i = 0; i < MOCK_JURORS.length - 1; i++) {
      expect(MOCK_JURORS[i].reputation).toBeGreaterThanOrEqual(MOCK_JURORS[i+1].reputation)
    }
  })

  it('all have valid tiers', () => {
    const valid = Object.keys(JUROR_TIER_META)
    MOCK_JURORS.forEach(j => expect(valid).toContain(j.tier))
  })

  it('votes_cast >= votes_correct + votes_incorrect', () => {
    MOCK_JURORS.forEach(j => {
      expect(j.votes_cast).toBeGreaterThanOrEqual(j.votes_correct + j.votes_incorrect)
    })
  })
})

// ─── Constants: JUROR_TIER_META ───────────────────────────────────────────────

describe('JUROR_TIER_META', () => {
  it('has exactly 5 tiers', () => {
    expect(Object.keys(JUROR_TIER_META).length).toBe(5)
  })

  it('all tiers have required fields', () => {
    Object.values(JUROR_TIER_META).forEach(m => {
      expect(m.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(m.glyph).toBeTruthy()
      expect(m.label).toBeTruthy()
      expect(m.desc).toBeTruthy()
      expect(typeof m.min).toBe('number')
    })
  })

  it('min scores strictly ascend', () => {
    const mins = Object.values(JUROR_TIER_META).map(m => m.min)
    for (let i = 0; i < mins.length - 1; i++) {
      expect(mins[i]).toBeLessThan(mins[i+1])
    }
  })

  it('Observer starts at 0', () => {
    expect(JUROR_TIER_META['Observer'].min).toBe(0)
  })
})

// ─── Constants: DISPUTE_STATUS_META ──────────────────────────────────────────

describe('DISPUTE_STATUS_META', () => {
  it('defines all 4 statuses', () => {
    ['Voting','Deliberating','Resolved','Cancelled'].forEach(s => {
      expect(DISPUTE_STATUS_META[s]).toBeDefined()
    })
  })

  it('all have color, label, desc', () => {
    Object.values(DISPUTE_STATUS_META).forEach(m => {
      expect(m.color).toBeTruthy()
      expect(m.label).toBeTruthy()
      expect(m.desc).toBeTruthy()
    })
  })
})

// ─── Constants: VOTE_OPTIONS ─────────────────────────────────────────────────

describe('VOTE_OPTIONS', () => {
  it('has 3 options', () => expect(VOTE_OPTIONS.length).toBe(3))

  it('sides are 1, 2, 3', () => {
    const sides = VOTE_OPTIONS.map(o => o.side)
    expect(sides).toContain(1)
    expect(sides).toContain(2)
    expect(sides).toContain(3)
  })
})

// ─── Reputation Scoring Algorithm (JS mirror of Rust) ────────────────────────

describe('Juror Reputation Algorithm', () => {
  function accuracyBonus(correct: number, cast: number): number {
    if (cast === 0) return 0
    const rate  = Math.floor((correct * 100) / cast)
    const bonus = Math.floor(rate / 10) * 5
    return Math.min(bonus, 50)
  }

  function minorityPenalty(incorrectCount: number): number {
    return Math.min(incorrectCount * 15, 100)
  }

  function repToTier(rep: number): string {
    if (rep < 150)  return 'Observer'
    if (rep < 350)  return 'Associate'
    if (rep < 700)  return 'Adjudicator'
    if (rep < 1100) return 'SeniorCounsel'
    return 'ChiefJustice'
  }

  it('accuracy bonus is 0 for 0% accuracy', () => {
    expect(accuracyBonus(0, 10)).toBe(0)
  })

  it('accuracy bonus is 25 for 50% accuracy', () => {
    expect(accuracyBonus(5, 10)).toBe(25)
  })

  it('accuracy bonus caps at 50 for 100% accuracy', () => {
    expect(accuracyBonus(10, 10)).toBe(50)
  })

  it('accuracy bonus returns 0 for no votes cast', () => {
    expect(accuracyBonus(0, 0)).toBe(0)
  })

  it('minority penalty starts at 15', () => {
    expect(minorityPenalty(1)).toBe(15)
  })

  it('minority penalty escalates', () => {
    expect(minorityPenalty(3)).toBe(45)
    expect(minorityPenalty(6)).toBe(90)
  })

  it('minority penalty caps at 100', () => {
    expect(minorityPenalty(10)).toBe(100)
    expect(minorityPenalty(50)).toBe(100)
  })

  it('tier boundaries are correct', () => {
    expect(repToTier(0)).toBe('Observer')
    expect(repToTier(149)).toBe('Observer')
    expect(repToTier(150)).toBe('Associate')
    expect(repToTier(349)).toBe('Associate')
    expect(repToTier(350)).toBe('Adjudicator')
    expect(repToTier(699)).toBe('Adjudicator')
    expect(repToTier(700)).toBe('SeniorCounsel')
    expect(repToTier(1099)).toBe('SeniorCounsel')
    expect(repToTier(1100)).toBe('ChiefJustice')
    expect(repToTier(9999)).toBe('ChiefJustice')
  })
})

// ─── Vote counting and majority logic ────────────────────────────────────────

describe('Majority Verdict Logic', () => {
  function determineWinner(claimant: number, respondent: number): number {
    if (claimant > respondent) return 1
    if (respondent > claimant) return 2
    return 3 // tie
  }

  it('claimant wins with more votes', () => {
    expect(determineWinner(7, 3)).toBe(1)
  })

  it('respondent wins with more votes', () => {
    expect(determineWinner(3, 7)).toBe(2)
  })

  it('tie returns 3', () => {
    expect(determineWinner(5, 5)).toBe(3)
  })

  it('single vote difference decides', () => {
    expect(determineWinner(4, 3)).toBe(1)
    expect(determineWinner(3, 4)).toBe(2)
  })

  it('abstains do not affect majority', () => {
    // abstains ignored in majority calc
    expect(determineWinner(3, 2)).toBe(1) // 3-2 regardless of abstains
  })
})

// ─── Stake distribution logic ─────────────────────────────────────────────────

describe('Stake Distribution', () => {
  function distributeStakes(
    jurors: { side: number; stake: number }[],
    winningSide: number
  ): Map<number, number> {
    const payouts = new Map<number, number>()
    const winners = jurors.filter(j => j.side === winningSide)
    const losers  = jurors.filter(j => j.side !== winningSide && winningSide !== 3)
    const loserPool = losers.reduce((s, j) => s + j.stake, 0)
    const bonus = winners.length > 0 ? Math.floor(loserPool / winners.length) : 0

    jurors.forEach((j, i) => {
      if (winningSide === 3) {
        payouts.set(i, j.stake) // tie: everyone gets stake back
      } else if (j.side === winningSide) {
        payouts.set(i, j.stake + bonus) // winner: stake + bonus
      } else {
        payouts.set(i, 0) // loser: forfeits stake
      }
    })
    return payouts
  }

  it('winners get stake plus bonus from losers', () => {
    const jurors = [
      { side: 1, stake: 100 },
      { side: 1, stake: 100 },
      { side: 2, stake: 100 },
    ]
    const payouts = distributeStakes(jurors, 1)
    // loser pool = 100, bonus = 50 each
    expect(payouts.get(0)).toBe(150)
    expect(payouts.get(1)).toBe(150)
    expect(payouts.get(2)).toBe(0)
  })

  it('losers forfeit their stake', () => {
    const jurors = [{ side: 2, stake: 200 }]
    const payouts = distributeStakes(jurors, 1)
    expect(payouts.get(0)).toBe(0)
  })

  it('tie means everyone gets stake back', () => {
    const jurors = [
      { side: 1, stake: 100 },
      { side: 2, stake: 100 },
    ]
    const payouts = distributeStakes(jurors, 3)
    expect(payouts.get(0)).toBe(100)
    expect(payouts.get(1)).toBe(100)
  })

  it('loser pool split evenly among winners', () => {
    const jurors = [
      { side: 1, stake: 100 },
      { side: 1, stake: 100 },
      { side: 1, stake: 100 },
      { side: 2, stake: 100 }, // single loser
    ]
    const payouts = distributeStakes(jurors, 1)
    // 100 pool / 3 winners = 33 each
    expect(payouts.get(0)).toBe(133)
  })
})

// ─── Component: TierBadge ─────────────────────────────────────────────────────

describe('TierBadge', () => {
  it('renders tier label', () => {
    render(<TierBadge tier="Adjudicator" />)
    expect(screen.getByText('Adjudicator')).toBeInTheDocument()
  })

  it('renders glyph by default', () => {
    render(<TierBadge tier="Adjudicator" />)
    expect(screen.getByText('⚖')).toBeInTheDocument()
  })

  it('hides glyph when showGlyph=false', () => {
    render(<TierBadge tier="ChiefJustice" showGlyph={false} />)
    expect(screen.queryByText('✦')).not.toBeInTheDocument()
  })

  it('falls back to Observer for unknown tier', () => {
    render(<TierBadge tier="Unknown" />)
    expect(screen.getByText('Observer')).toBeInTheDocument()
  })
})

// ─── Component: StatusPill ────────────────────────────────────────────────────

describe('StatusPill', () => {
  it('renders Voting status', () => {
    render(<StatusPill status="Voting" />)
    expect(screen.getByText('Voting Open')).toBeInTheDocument()
  })

  it('renders Resolved status', () => {
    render(<StatusPill status="Resolved" />)
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })

  it('renders Cancelled status', () => {
    render(<StatusPill status="Cancelled" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })
})

// ─── Component: VoteBar ───────────────────────────────────────────────────────

describe('VoteBar', () => {
  it('renders with zero votes without crashing', () => {
    const { container } = render(
      <VoteBar claimant={0} respondent={0} abstain={0} total={0} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders juror count', () => {
    render(<VoteBar claimant={7} respondent={3} abstain={1} total={11} />)
    expect(screen.getByText('11 jurors')).toBeInTheDocument()
  })

  it('shows claimant and respondent vote counts', () => {
    render(<VoteBar claimant={7} respondent={3} abstain={0} total={10} />)
    expect(screen.getByText('7C')).toBeInTheDocument()
    expect(screen.getByText('3R')).toBeInTheDocument()
  })
})
