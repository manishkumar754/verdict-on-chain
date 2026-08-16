#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String,
    token::{Client as TokenClient, StellarAssetClient},
};

struct Setup<'a> {
    env:       Env,
    court:     DisputeCourClient<'a>,
    token:     TokenClient<'a>,
    token_sac: StellarAssetClient<'a>,
    admin:     Address,
    registry:  Address,
    token_id:  Address,
    claimant:  Address,
    respondent:Address,
}

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin      = Address::generate(&env);
    let registry   = Address::generate(&env);
    let claimant   = Address::generate(&env);
    let respondent = Address::generate(&env);

    let token_id  = env.register_stellar_asset_contract(admin.clone());
    let token     = TokenClient::new(&env, &token_id);
    let token_sac = StellarAssetClient::new(&env, &token_id);

    // Mint tokens to jurors (generated in tests)
    token_sac.mint(&claimant,   &100_000_0000000i128);
    token_sac.mint(&respondent, &100_000_0000000i128);

    let court_id = env.register_contract(None, DisputeCourt);
    let court    = DisputeCourClient::new(&env, &court_id);

    court.initialize(
        &admin, &registry, &token_id,
        &10_0000000i128,   // 10 XLM min stake
        &86400u64,         // 24h voting
    );

    Setup { env, court, token, token_sac, admin, registry, token_id, claimant, respondent }
}

fn file(s: &Setup, title: &str) -> u64 {
    s.court.file_dispute(
        &s.claimant, &s.respondent,
        &String::from_str(&s.env, title),
        &String::from_str(&s.env, "Full description of the dispute"),
        &String::from_str(&s.env, "Freelance"),
        &String::from_str(&s.env, "ipfs://Qm..."),
        &50_0000000i128,
    )
}

#[test]
fn test_initialize() {
    let s = setup();
    assert_eq!(s.court.get_admin(), s.admin);
    assert_eq!(s.court.get_total_disputes(), 0u32);
    assert_eq!(s.court.get_resolved_count(), 0u32);
}

#[test]
fn test_file_dispute() {
    let s  = setup();
    let id = file(&s, "Designer did not deliver promised mockups");
    assert_eq!(id, 0u64);
    assert_eq!(s.court.get_total_disputes(), 1u32);

    let d = s.court.get_dispute(&id);
    assert_eq!(d.claimant,    s.claimant);
    assert_eq!(d.respondent,  s.respondent);
    assert_eq!(d.status,      DisputeStatus::Voting);
    assert_eq!(d.total_jurors,0u32);
    assert_eq!(d.winning_side,0u32);
}

#[test]
fn test_cast_vote_locks_stake() {
    let s    = setup();
    let id   = file(&s, "Payment dispute");
    let j1   = Address::generate(&s.env);
    s.token_sac.mint(&j1, &1000_0000000i128);

    let bal_before = s.token.balance(&j1);
    s.court.cast_vote(&j1, &id, &1u32); // vote for claimant
    let bal_after = s.token.balance(&j1);

    assert_eq!(bal_before - bal_after, 50_0000000i128); // stake locked
    let d = s.court.get_dispute(&id);
    assert_eq!(d.votes_claimant, 1u32);
    assert_eq!(d.total_jurors,   1u32);
}

#[test]
fn test_multiple_jurors_vote() {
    let s  = setup();
    let id = file(&s, "Service quality dispute");

    for i in 0..5u32 {
        let j = Address::generate(&s.env);
        s.token_sac.mint(&j, &1000_0000000i128);
        let side = if i < 3 { 1u32 } else { 2u32 }; // 3 for claimant, 2 for respondent
        s.court.cast_vote(&j, &id, &side);
    }

    let d = s.court.get_dispute(&id);
    assert_eq!(d.votes_claimant,   3u32);
    assert_eq!(d.votes_respondent, 2u32);
    assert_eq!(d.total_jurors,     5u32);
}

#[test]
fn test_vote_for_respondent() {
    let s  = setup();
    let id = file(&s, "Non-payment dispute");
    let j  = Address::generate(&s.env);
    s.token_sac.mint(&j, &1000_0000000i128);

    s.court.cast_vote(&j, &id, &2u32); // vote for respondent
    let d = s.court.get_dispute(&id);
    assert_eq!(d.votes_respondent, 1u32);
    assert_eq!(d.votes_claimant,   0u32);
}

#[test]
fn test_abstain_vote() {
    let s  = setup();
    let id = file(&s, "Ambiguous dispute");
    let j  = Address::generate(&s.env);
    s.token_sac.mint(&j, &1000_0000000i128);

    s.court.cast_vote(&j, &id, &3u32);
    let d = s.court.get_dispute(&id);
    assert_eq!(d.votes_abstain, 1u32);
}

#[test]
fn test_get_vote_record() {
    let s  = setup();
    let id = file(&s, "Contract breach");
    let j  = Address::generate(&s.env);
    s.token_sac.mint(&j, &1000_0000000i128);

    s.court.cast_vote(&j, &id, &1u32);
    let v = s.court.get_vote(&id, &j);
    assert_eq!(v.side,  1u32);
    assert_eq!(v.stake, 50_0000000i128);
    assert!(!v.rewarded);
}

#[test]
fn test_user_dispute_list() {
    let s = setup();
    file(&s, "Dispute 1");
    file(&s, "Dispute 2");

    let list = s.court.get_user_disputes(&s.claimant);
    assert_eq!(list.len(), 2);
}

#[test]
fn test_dispute_jurors_list() {
    let s  = setup();
    let id = file(&s, "Jury test");

    let j1 = Address::generate(&s.env);
    let j2 = Address::generate(&s.env);
    s.token_sac.mint(&j1, &1000_0000000i128);
    s.token_sac.mint(&j2, &1000_0000000i128);

    s.court.cast_vote(&j1, &id, &1u32);
    s.court.cast_vote(&j2, &id, &2u32);

    let jurors = s.court.get_dispute_jurors(&id);
    assert_eq!(jurors.len(), 2);
}

#[test]
#[should_panic(expected = "cannot dispute yourself")]
fn test_self_dispute_fails() {
    let s = setup();
    s.court.file_dispute(
        &s.claimant, &s.claimant,
        &String::from_str(&s.env, "Self"),
        &String::from_str(&s.env, "desc"),
        &String::from_str(&s.env, "cat"),
        &String::from_str(&s.env, "evidence"),
        &50_0000000i128,
    );
}

#[test]
#[should_panic(expected = "parties cannot vote on their own dispute")]
fn test_party_cannot_vote() {
    let s  = setup();
    let id = file(&s, "Conflict of interest test");
    s.court.cast_vote(&s.claimant, &id, &1u32);
}

#[test]
#[should_panic(expected = "already voted")]
fn test_double_vote_fails() {
    let s  = setup();
    let id = file(&s, "Double vote test");
    let j  = Address::generate(&s.env);
    s.token_sac.mint(&j, &1000_0000000i128);

    s.court.cast_vote(&j, &id, &1u32);
    s.court.cast_vote(&j, &id, &1u32); // should panic
}
