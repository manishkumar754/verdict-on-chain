#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contractclient,
    symbol_short, vec,
    Address, Env, String, Symbol, Vec,
    token, log,
};

// ─── Inter-Contract Interface ─────────────────────────────────────────────────

#[contractclient(name = "JurorRegistryClient")]
pub trait JurorRegistryInterface {
    fn record_verdict(
        env: Env,
        dispute_id: u64,
        winning_side: u32,
        jurors: Vec<Address>,
        votes: Vec<u32>,
        stakes: Vec<i128>,
    );
    fn is_eligible_juror(env: Env, juror: Address) -> bool;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

const ADMIN:        Symbol = symbol_short!("ADMIN");
const REGISTRY:     Symbol = symbol_short!("REGISTRY");
const TOKEN:        Symbol = symbol_short!("TOKEN");
const NEXT_ID:      Symbol = symbol_short!("NEXT_ID");
const MIN_STAKE:    Symbol = symbol_short!("MIN_STAKE");
const VOTE_PERIOD:  Symbol = symbol_short!("VOTE_PRD");

#[contracttype]
pub enum DataKey {
    Dispute(u64),
    Vote(u64, Address),       // (dispute_id, juror)
    DisputeJurors(u64),
    UserDisputes(Address),
    TotalDisputes,
    ResolvedCount,
}

// ─── Types ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DisputeStatus {
    Voting,     // Jurors can cast votes
    Deliberating, // Voting closed, awaiting finalization (buffer period)
    Resolved,   // Verdict reached and finalized
    Cancelled,  // No quorum or withdrawn
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Side {
    Claimant  = 1,
    Respondent = 2,
    Abstain    = 3,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub id:          u64,
    pub claimant:    Address,
    pub respondent:  Address,
    pub title:       String,
    pub description: String,
    pub category:    String,
    pub evidence:    String,    // IPFS CID or text summary
    pub stake_per_juror: i128,  // XLM jurors must stake to vote
    pub voting_ends: u64,
    pub status:      DisputeStatus,
    pub created_at:  u64,
    pub resolved_at: u64,
    pub winning_side: u32,      // 0=unresolved, 1=claimant, 2=respondent
    pub votes_claimant:  u32,
    pub votes_respondent:u32,
    pub votes_abstain:   u32,
    pub total_jurors:    u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Vote {
    pub juror:      Address,
    pub side:       u32,        // 1=claimant, 2=respondent, 3=abstain
    pub stake:      i128,
    pub cast_at:    u64,
    pub rewarded:   bool,
}

// ─── Events ──────────────────────────────────────────────────────────────────

const EV_FILED:    Symbol = symbol_short!("FILED");
const EV_VOTED:    Symbol = symbol_short!("VOTED");
const EV_RESOLVED: Symbol = symbol_short!("RESOLVED");
const EV_CANCELLED:Symbol = symbol_short!("CANCELLED");

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct DisputeCourt;

#[contractimpl]
impl DisputeCourt {

    pub fn initialize(
        env: Env,
        admin: Address,
        registry_address: Address,
        token_address: Address,
        min_stake: i128,
        vote_period_secs: u64,
    ) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN,       &admin);
        env.storage().instance().set(&REGISTRY,    &registry_address);
        env.storage().instance().set(&TOKEN,       &token_address);
        env.storage().instance().set(&MIN_STAKE,   &min_stake);
        env.storage().instance().set(&VOTE_PERIOD, &vote_period_secs);
        env.storage().instance().set(&NEXT_ID,     &0u64);
        env.storage().instance().set(&DataKey::TotalDisputes,  &0u32);
        env.storage().instance().set(&DataKey::ResolvedCount,  &0u32);
    }

    /// File a new dispute — claimant pays nothing, jurors bear cost
    pub fn file_dispute(
        env: Env,
        claimant:        Address,
        respondent:      Address,
        title:           String,
        description:     String,
        category:        String,
        evidence:        String,
        stake_per_juror: i128,
    ) -> u64 {
        claimant.require_auth();

        if claimant == respondent      { panic!("cannot dispute yourself"); }
        if title.len() == 0            { panic!("title required"); }
        if stake_per_juror <= 0        { panic!("stake must be positive"); }

        let min_stake: i128 = env.storage().instance().get(&MIN_STAKE).unwrap();
        if stake_per_juror < min_stake { panic!("stake below minimum"); }

        let id: u64 = env.storage().instance().get(&NEXT_ID).unwrap_or(0u64);
        let now      = env.ledger().timestamp();
        let vote_period: u64 = env.storage().instance().get(&VOTE_PERIOD).unwrap();

        let dispute = Dispute {
            id,
            claimant:    claimant.clone(),
            respondent:  respondent.clone(),
            title:       title.clone(),
            description,
            category:    category.clone(),
            evidence,
            stake_per_juror,
            voting_ends: now + vote_period,
            status:      DisputeStatus::Voting,
            created_at:  now,
            resolved_at: 0,
            winning_side: 0,
            votes_claimant:   0,
            votes_respondent: 0,
            votes_abstain:    0,
            total_jurors:     0,
        };

        env.storage().persistent().set(&DataKey::Dispute(id), &dispute);
        env.storage().persistent().set(&DataKey::DisputeJurors(id), &vec![&env] as &Vec<Address>);

        Self::push_user_dispute(&env, &claimant,   id);
        Self::push_user_dispute(&env, &respondent, id);

        env.storage().instance().set(&NEXT_ID, &(id + 1));
        let total: u32 = env.storage().instance().get(&DataKey::TotalDisputes).unwrap_or(0u32);
        env.storage().instance().set(&DataKey::TotalDisputes, &(total + 1));

        env.events().publish((EV_FILED, claimant.clone()), (id, title, category));
        log!(&env, "Dispute {} filed by {}", id, claimant);
        id
    }

    /// Juror casts a vote and stakes XLM
    pub fn cast_vote(
        env: Env,
        juror:      Address,
        dispute_id: u64,
        side:       u32,   // 1=claimant, 2=respondent, 3=abstain
    ) {
        juror.require_auth();

        if side < 1 || side > 3 { panic!("invalid side: must be 1, 2, or 3"); }

        let mut dispute: Dispute = Self::get_dispute_inner(&env, dispute_id);

        if dispute.status != DisputeStatus::Voting {
            panic!("voting not open");
        }
        if env.ledger().timestamp() > dispute.voting_ends {
            panic!("voting period ended");
        }
        if juror == dispute.claimant || juror == dispute.respondent {
            panic!("parties cannot vote on their own dispute");
        }

        // Check not already voted
        if env.storage().persistent().has(&DataKey::Vote(dispute_id, juror.clone())) {
            panic!("already voted");
        }

        // Lock stake
        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token = token::Client::new(&env, &token_addr);
        token.transfer(&juror, &env.current_contract_address(), &dispute.stake_per_juror);

        let now = env.ledger().timestamp();
        let vote = Vote {
            juror:   juror.clone(),
            side,
            stake:   dispute.stake_per_juror,
            cast_at: now,
            rewarded: false,
        };

        env.storage().persistent().set(&DataKey::Vote(dispute_id, juror.clone()), &vote);

        // Update tallies
        match side {
            1 => dispute.votes_claimant   += 1,
            2 => dispute.votes_respondent += 1,
            _ => dispute.votes_abstain    += 1,
        }
        dispute.total_jurors += 1;

        // Append to juror list
        let mut jurors: Vec<Address> = env.storage().persistent()
            .get(&DataKey::DisputeJurors(dispute_id))
            .unwrap_or(vec![&env]);
        jurors.push_back(juror.clone());
        env.storage().persistent().set(&DataKey::DisputeJurors(dispute_id), &jurors);

        env.storage().persistent().set(&DataKey::Dispute(dispute_id), &dispute);

        env.events().publish((EV_VOTED, juror.clone()), (dispute_id, side));
        log!(&env, "Juror {} voted {} on dispute {}", juror, side, dispute_id);
    }

    /// Finalize dispute after voting period — determines winner + calls JurorRegistry
    pub fn finalize_verdict(env: Env, caller: Address, dispute_id: u64) {
        caller.require_auth();

        let mut dispute: Dispute = Self::get_dispute_inner(&env, dispute_id);

        if dispute.status != DisputeStatus::Voting {
            panic!("dispute not in voting state");
        }
        if env.ledger().timestamp() <= dispute.voting_ends {
            panic!("voting period not yet ended");
        }
        if dispute.total_jurors == 0 {
            // No jurors — cancel
            dispute.status = DisputeStatus::Cancelled;
            env.storage().persistent().set(&DataKey::Dispute(dispute_id), &dispute);
            env.events().publish((EV_CANCELLED, caller.clone()), (dispute_id,));
            return;
        }

        // Determine winner by simple majority (abstains don't count)
        let winning_side: u32 = if dispute.votes_claimant > dispute.votes_respondent {
            1
        } else if dispute.votes_respondent > dispute.votes_claimant {
            2
        } else {
            3 // tie → abstain/no clear winner
        };

        // Distribute stakes: majority winners split minority losers' stakes
        let jurors: Vec<Address> = env.storage().persistent()
            .get(&DataKey::DisputeJurors(dispute_id))
            .unwrap_or(vec![&env]);

        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token = token::Client::new(&env, &token_addr);
        let contract_addr = env.current_contract_address();

        let mut votes_vec:  Vec<u32>    = vec![&env];
        let mut stakes_vec: Vec<i128>   = vec![&env];

        // Collect vote data and pay out stakes
        let mut winner_count: u32 = 0;
        for juror in jurors.iter() {
            if let Some(vote) = env.storage().persistent().get::<DataKey, Vote>(&DataKey::Vote(dispute_id, juror.clone())) {
                votes_vec.push_back(vote.side);
                stakes_vec.push_back(vote.stake);
                if vote.side == winning_side { winner_count += 1; }
            }
        }

        // Loser stakes go into a pool redistributed to winners
        let loser_pool: i128 = if winning_side != 3 {
            let losers = dispute.total_jurors - winner_count;
            losers as i128 * dispute.stake_per_juror
        } else {
            0 // tie: everyone gets their stake back
        };

        let winner_bonus: i128 = if winner_count > 0 { loser_pool / winner_count as i128 } else { 0 };

        // Pay each juror
        for juror in jurors.iter() {
            if let Some(mut vote) = env.storage().persistent().get::<DataKey, Vote>(&DataKey::Vote(dispute_id, juror.clone())) {
                if !vote.rewarded {
                    let payout = if vote.side == winning_side || winning_side == 3 {
                        vote.stake + winner_bonus
                    } else {
                        0 // losers forfeit stake
                    };
                    if payout > 0 {
                        token.transfer(&contract_addr, &juror, &payout);
                    }
                    vote.rewarded = true;
                    env.storage().persistent().set(&DataKey::Vote(dispute_id, juror.clone()), &vote);
                }
            }
        }

        let now = env.ledger().timestamp();
        dispute.status       = DisputeStatus::Resolved;
        dispute.winning_side = winning_side;
        dispute.resolved_at  = now;
        env.storage().persistent().set(&DataKey::Dispute(dispute_id), &dispute);

        let resolved: u32 = env.storage().instance().get(&DataKey::ResolvedCount).unwrap_or(0u32);
        env.storage().instance().set(&DataKey::ResolvedCount, &(resolved + 1));

        // ── Inter-Contract Call → JurorRegistry ──────────────────────────────
        let registry_addr: Address = env.storage().instance().get(&REGISTRY).unwrap();
        let registry = JurorRegistryClient::new(&env, &registry_addr);
        registry.record_verdict(&dispute_id, &winning_side, &jurors, &votes_vec, &stakes_vec);
        // ─────────────────────────────────────────────────────────────────────

        env.events().publish(
            (EV_RESOLVED, caller.clone()),
            (dispute_id, winning_side, dispute.total_jurors),
        );
        log!(&env, "Dispute {} resolved: winning_side={}", dispute_id, winning_side);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    fn get_dispute_inner(env: &Env, id: u64) -> Dispute {
        env.storage().persistent()
            .get(&DataKey::Dispute(id))
            .expect("dispute not found")
    }

    fn push_user_dispute(env: &Env, user: &Address, id: u64) {
        let mut list: Vec<u64> = env.storage().persistent()
            .get(&DataKey::UserDisputes(user.clone()))
            .unwrap_or(vec![env]);
        list.push_back(id);
        env.storage().persistent().set(&DataKey::UserDisputes(user.clone()), &list);
    }

    // ─── Query Methods ────────────────────────────────────────────────────────

    pub fn get_dispute(env: Env, id: u64) -> Dispute {
        Self::get_dispute_inner(&env, id)
    }

    pub fn get_vote(env: Env, dispute_id: u64, juror: Address) -> Vote {
        env.storage().persistent()
            .get(&DataKey::Vote(dispute_id, juror))
            .expect("vote not found")
    }

    pub fn get_dispute_jurors(env: Env, dispute_id: u64) -> Vec<Address> {
        env.storage().persistent()
            .get(&DataKey::DisputeJurors(dispute_id))
            .unwrap_or(vec![&env])
    }

    pub fn get_user_disputes(env: Env, user: Address) -> Vec<Dispute> {
        let ids: Vec<u64> = env.storage().persistent()
            .get(&DataKey::UserDisputes(user))
            .unwrap_or(vec![&env]);
        let mut result: Vec<Dispute> = vec![&env];
        for id in ids.iter() {
            if let Some(d) = env.storage().persistent().get(&DataKey::Dispute(id)) {
                result.push_back(d);
            }
        }
        result
    }

    pub fn get_total_disputes(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalDisputes).unwrap_or(0u32)
    }

    pub fn get_resolved_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ResolvedCount).unwrap_or(0u32)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap()
    }
}

mod test;
