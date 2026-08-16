#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, vec};

fn setup() -> (Env, JurorRegistryClient<'static>, Address, Address) {
    let env     = Env::default();
    env.mock_all_auths();
    let cid     = env.register_contract(None, JurorRegistry);
    let client  = JurorRegistryClient::new(&env, &cid);
    let admin   = Address::generate(&env);
    let court   = Address::generate(&env);
    client.initialize(&admin, &court);
    (env, client, admin, court)
}

#[test]
fn test_initialize() {
    let (_, client, admin, _) = setup();
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_total_verdicts(), 0u32);
    assert_eq!(client.get_total_jurors(),   0u32);
}

#[test]
fn test_record_verdict_majority_win() {
    let (env, client, _, _) = setup();
    let j1 = Address::generate(&env);
    let j2 = Address::generate(&env);
    let j3 = Address::generate(&env);

    let jurors = vec![&env, j1.clone(), j2.clone(), j3.clone()];
    let votes  = vec![&env, 1u32, 1u32, 2u32]; // 2 vote claimant, 1 respondent
    let stakes = vec![&env, 50_0000000i128, 50_0000000i128, 50_0000000i128];

    client.record_verdict(&0u64, &1u32, &jurors, &votes, &stakes);

    assert_eq!(client.get_total_verdicts(), 1u32);
    assert_eq!(client.get_total_jurors(),   3u32);

    // j1 and j2 voted correctly (side 1 = winner)
    let p1 = client.get_juror(&j1);
    assert_eq!(p1.votes_correct,   1u32);
    assert_eq!(p1.votes_incorrect, 0u32);
    assert!(p1.reputation >= 100);

    // j3 voted incorrectly
    let p3 = client.get_juror(&j3);
    assert_eq!(p3.votes_incorrect, 1u32);
    assert_eq!(p3.votes_correct,   0u32);
}

#[test]
fn test_tier_progression() {
    assert_eq!(JurorRegistry::reputation_to_tier(0),    JurorTier::Observer);
    assert_eq!(JurorRegistry::reputation_to_tier(149),  JurorTier::Observer);
    assert_eq!(JurorRegistry::reputation_to_tier(150),  JurorTier::Associate);
    assert_eq!(JurorRegistry::reputation_to_tier(349),  JurorTier::Associate);
    assert_eq!(JurorRegistry::reputation_to_tier(350),  JurorTier::Adjudicator);
    assert_eq!(JurorRegistry::reputation_to_tier(700),  JurorTier::SeniorCounsel);
    assert_eq!(JurorRegistry::reputation_to_tier(1100), JurorTier::ChiefJustice);
    assert_eq!(JurorRegistry::reputation_to_tier(9999), JurorTier::ChiefJustice);
}

#[test]
fn test_accuracy_bonus_increases_with_correct_votes() {
    // 0% accuracy → 0 bonus
    assert_eq!(JurorRegistry::accuracy_bonus(0, 10), 0u64);
    // 50% accuracy → (50/10)*5 = 25 bonus
    assert_eq!(JurorRegistry::accuracy_bonus(5, 10), 25u64);
    // 100% accuracy → (100/10)*5 = 50 bonus (capped)
    assert_eq!(JurorRegistry::accuracy_bonus(10, 10), 50u64);
    // >100% impossible but cap holds
    assert_eq!(JurorRegistry::accuracy_bonus(10, 5), 50u64);
}

#[test]
fn test_minority_penalty_escalates() {
    assert_eq!(JurorRegistry::minority_penalty(0),  0u64);
    assert_eq!(JurorRegistry::minority_penalty(1),  15u64);
    assert_eq!(JurorRegistry::minority_penalty(3),  45u64);
    assert_eq!(JurorRegistry::minority_penalty(10), 100u64); // capped
    assert_eq!(JurorRegistry::minority_penalty(20), 100u64); // still capped
}

#[test]
fn test_reputation_never_underflows() {
    let (env, client, _, _) = setup();
    let j = Address::generate(&env);

    // 5 incorrect votes with 0 base reputation
    for i in 0u64..5 {
        let jurors = vec![&env, j.clone()];
        let votes  = vec![&env, 2u32]; // minority
        let stakes = vec![&env, 10_0000000i128];
        client.record_verdict(&i, &1u32, &jurors, &votes, &stakes);
    }

    let profile = client.get_juror(&j);
    assert_eq!(profile.reputation, 0u64); // saturating_sub prevents underflow
}

#[test]
fn test_abstain_gives_small_points() {
    let (env, client, _, _) = setup();
    let j = Address::generate(&env);

    let jurors = vec![&env, j.clone()];
    let votes  = vec![&env, 3u32]; // abstain
    let stakes = vec![&env, 10_0000000i128];
    client.record_verdict(&0u64, &1u32, &jurors, &votes, &stakes);

    let profile = client.get_juror(&j);
    assert_eq!(profile.reputation,      15u64);
    assert_eq!(profile.votes_abstained, 1u32);
    assert_eq!(profile.votes_correct,   0u32);
    assert_eq!(profile.votes_incorrect, 0u32);
}

#[test]
fn test_tie_verdict_gives_base_points() {
    let (env, client, _, _) = setup();
    let j1 = Address::generate(&env);
    let j2 = Address::generate(&env);

    let jurors = vec![&env, j1.clone(), j2.clone()];
    let votes  = vec![&env, 1u32, 2u32]; // 1-1 tie → winning_side = 3
    let stakes = vec![&env, 50_0000000i128, 50_0000000i128];

    client.record_verdict(&0u64, &3u32, &jurors, &votes, &stakes); // tie

    let p1 = client.get_juror(&j1);
    let p2 = client.get_juror(&j2);
    assert_eq!(p1.reputation, 30u64); // base tie points
    assert_eq!(p2.reputation, 30u64);
}

#[test]
fn test_multiple_disputes_accumulate_reputation() {
    let (env, client, _, _) = setup();
    let j = Address::generate(&env);

    // Vote correctly 3 times
    for i in 0u64..3 {
        let jurors = vec![&env, j.clone()];
        let votes  = vec![&env, 1u32]; // always vote claimant
        let stakes = vec![&env, 50_0000000i128];
        client.record_verdict(&i, &1u32, &jurors, &votes, &stakes); // claimant wins
    }

    let profile = client.get_juror(&j);
    assert_eq!(profile.votes_cast,    3u32);
    assert_eq!(profile.votes_correct, 3u32);
    assert!(profile.reputation >= 300);
    assert_eq!(profile.tier, JurorTier::Associate); // 300+ = Associate
}

#[test]
fn test_verdict_record_stored() {
    let (env, client, _, _) = setup();
    let j = Address::generate(&env);

    let jurors = vec![&env, j.clone()];
    let votes  = vec![&env, 1u32];
    let stakes = vec![&env, 50_0000000i128];
    client.record_verdict(&99u64, &1u32, &jurors, &votes, &stakes);

    let rec = client.get_verdict_record(&99u64);
    assert_eq!(rec.dispute_id,   99u64);
    assert_eq!(rec.winning_side, 1u32);
    assert_eq!(rec.total_jurors, 1u32);
}
