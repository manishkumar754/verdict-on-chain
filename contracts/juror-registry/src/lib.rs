#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short, vec,
    Address, Env, Symbol, Vec,
    log,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const ADMIN:  Symbol = symbol_short!("ADMIN");
const COURT:  Symbol = symbol_short!("COURT");
const TOTAL:  Symbol = symbol_short!("TOTAL");

#[contracttype]
pub enum DataKey {
    Juror(Address),
    VerdictRecord(u64),
    TotalJurors,
}

// ─── Juror Tier ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum JurorTier {
    Observer,      // 0–149:   newly registered
    Associate,     // 150–349: basic track record
    Adjudicator,   // 350–699: reliable juror
    SeniorCounsel, // 700–1099: highly accurate
    ChiefJustice,  // 1100+:   elite arbitrator
}

// ─── Juror Profile ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct JurorProfile {
    pub juror:           Address,
    pub reputation:      u64,
    pub tier:            JurorTier,
    pub votes_cast:      u32,
    pub votes_correct:   u32,   // voted with majority
    pub votes_incorrect: u32,   // voted with minority
    pub votes_abstained: u32,
    pub total_staked:    i128,  // cumulative stake across all disputes
    pub total_earned:    i128,  // cumulative rewards earned
    pub joined_at:       u64,
    pub last_active:     u64,
}

// ─── Verdict Record ───────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct VerdictRecord {
    pub dispute_id:   u64,
    pub winning_side: u32,
    pub total_jurors: u32,
    pub majority_size:u32,
    pub timestamp:    u64,
}

// ─── Events ──────────────────────────────────────────────────────────────────

const EV_VERDICT:  Symbol = symbol_short!("VERDICT");
const EV_TIER_UP:  Symbol = symbol_short!("TIER_UP");

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct JurorRegistry;

#[contractimpl]
impl JurorRegistry {

    pub fn initialize(env: Env, admin: Address, court_address: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&COURT, &court_address);
        env.storage().instance().set(&TOTAL, &0u32);
        env.storage().instance().set(&DataKey::TotalJurors, &0u32);
    }

    /// Called by DisputeCourt when a verdict is finalized
    /// Updates every participating juror's reputation
    pub fn record_verdict(
        env:          Env,
        dispute_id:   u64,
        winning_side: u32,
        jurors:       Vec<Address>,
        votes:        Vec<u32>,
        stakes:       Vec<i128>,
    ) {
        // Only the court may call this
        let court: Address = env.storage().instance().get(&COURT).unwrap();
        court.require_auth();

        let now          = env.ledger().timestamp();
        let total_jurors = jurors.len() as u32;

        // Count majority size for accuracy bonus
        let majority_size: u32 = if winning_side == 3 {
            0
        } else {
            let mut count = 0u32;
            for vote in votes.iter() {
                if vote == winning_side { count += 1; }
            }
            count
        };

        // Write verdict record
        let record = VerdictRecord {
            dispute_id, winning_side, total_jurors, majority_size, timestamp: now,
        };
        env.storage().persistent().set(&DataKey::VerdictRecord(dispute_id), &record);

        // Update each juror's profile
        for i in 0..jurors.len() {
            let juror = jurors.get(i).unwrap();
            let vote  = votes.get(i).unwrap();
            let stake = stakes.get(i).unwrap();

            let is_new = !env.storage().persistent().has(&DataKey::Juror(juror.clone()));
            let mut profile = Self::load_or_create(&env, &juror, now);
            let old_tier = profile.tier.clone();

            profile.votes_cast    += 1;
            profile.total_staked  += stake;
            profile.last_active    = now;

            let (pts, correct, earned) = if winning_side == 3 {
                // Tie — everyone gets base points, no penalty
                (30u64, false, stake)
            } else if vote == winning_side {
                // Majority — accuracy bonus + minority stake share
                let accuracy_bonus = Self::accuracy_bonus(profile.votes_correct, profile.votes_cast);
                (100 + accuracy_bonus, true, stake)
            } else if vote == 3 {
                // Abstained — small neutral points
                (15u64, false, 0i128)
            } else {
                // Minority — loses stake, reputation penalty
                (0u64, false, 0i128)
            };

            if correct { profile.votes_correct   += 1; } else if vote != 3 { profile.votes_incorrect += 1; }
            if vote == 3 { profile.votes_abstained += 1; }
            profile.total_earned += earned;
            profile.reputation    = profile.reputation.saturating_add(pts);

            // Penalty for incorrect minority votes
            if !correct && vote != 3 && winning_side != 3 {
                let penalty = Self::minority_penalty(profile.votes_incorrect);
                profile.reputation = profile.reputation.saturating_sub(penalty);
            }

            profile.tier = Self::reputation_to_tier(profile.reputation);

            if profile.tier != old_tier {
                env.events().publish((EV_TIER_UP, juror.clone()), (profile.reputation,));
            }

            env.storage().persistent().set(&DataKey::Juror(juror.clone()), &profile);

            if is_new {
                let total: u32 = env.storage().instance().get(&DataKey::TotalJurors).unwrap_or(0u32);
                env.storage().instance().set(&DataKey::TotalJurors, &(total + 1));
            }
        }

        let total: u32 = env.storage().instance().get(&TOTAL).unwrap_or(0u32);
        env.storage().instance().set(&TOTAL, &(total + 1));

        env.events().publish(
            (EV_VERDICT, court),
            (dispute_id, winning_side, total_jurors),
        );
        log!(&env, "Verdict recorded: dispute={} winner={} jurors={}", dispute_id, winning_side, total_jurors);
    }

    // ─── Scoring Helpers ──────────────────────────────────────────────────────
    //
    // accuracy_bonus: rewards consistent accuracy
    //   correct_rate = correct / (cast - abstained)
    //   bonus = floor(rate * 100 / 10) * 5, max 50
    //
    // minority_penalty: escalates with repeated minority votes
    //   penalty = min(incorrect_count * 15, 100)

    fn accuracy_bonus(correct: u32, cast: u32) -> u64 {
        if cast == 0 { return 0; }
        let rate  = (correct as u64 * 100) / cast as u64;
        let bonus = (rate / 10) * 5;
        bonus.min(50)
    }

    fn minority_penalty(incorrect_count: u32) -> u64 {
        ((incorrect_count as u64) * 15).min(100)
    }

    fn reputation_to_tier(rep: u64) -> JurorTier {
        match rep {
            0..=149    => JurorTier::Observer,
            150..=349  => JurorTier::Associate,
            350..=699  => JurorTier::Adjudicator,
            700..=1099 => JurorTier::SeniorCounsel,
            _          => JurorTier::ChiefJustice,
        }
    }

    fn load_or_create(env: &Env, juror: &Address, now: u64) -> JurorProfile {
        env.storage().persistent()
            .get(&DataKey::Juror(juror.clone()))
            .unwrap_or(JurorProfile {
                juror:           juror.clone(),
                reputation:      0,
                tier:            JurorTier::Observer,
                votes_cast:      0,
                votes_correct:   0,
                votes_incorrect: 0,
                votes_abstained: 0,
                total_staked:    0,
                total_earned:    0,
                joined_at:       now,
                last_active:     now,
            })
    }

    pub fn is_eligible_juror(env: Env, _juror: Address) -> bool {
        // All wallets eligible; could gate by tier in production
        true
    }

    // ─── Query Methods ────────────────────────────────────────────────────────

    pub fn get_juror(env: Env, juror: Address) -> JurorProfile {
        let now = env.ledger().timestamp();
        Self::load_or_create(&env, &juror, now)
    }

    pub fn get_verdict_record(env: Env, dispute_id: u64) -> VerdictRecord {
        env.storage().persistent()
            .get(&DataKey::VerdictRecord(dispute_id))
            .expect("verdict record not found")
    }

    pub fn get_total_verdicts(env: Env) -> u32 {
        env.storage().instance().get(&TOTAL).unwrap_or(0u32)
    }

    pub fn get_total_jurors(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalJurors).unwrap_or(0u32)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap()
    }
}

mod test;
