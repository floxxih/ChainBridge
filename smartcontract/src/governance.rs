use crate::error::Error;
use crate::storage;
use crate::types::{
    DelegationRecord, GovernanceConfig, GovernanceProposal, OptProposalStatus,
    ProposalLifecycleEvent, ProposalStatus, VoteChoice,
};
use soroban_sdk::{symbol_short, Address, Env, String, Vec};

pub fn init_governance(env: &Env, config: GovernanceConfig) -> Result<(), Error> {
    if config.quorum_bps == 0 || config.quorum_bps > 10_000 {
        return Err(Error::InvalidFeeRate);
    }
    if config.total_voting_supply <= 0 {
        return Err(Error::InvalidAmount);
    }
    storage::write_governance_config(env, &config);
    Ok(())
}

pub fn set_voting_stake(env: &Env, holder: &Address, balance: i128) -> Result<(), Error> {
    if balance < 0 {
        return Err(Error::InvalidAmount);
    }
    storage::write_voting_stake(env, holder, balance);
    Ok(())
}

pub fn resolve_voting_power(env: &Env, voter: &Address, proposal_id: u64) -> Result<i128, Error> {
    let self_power = if has_active_outbound_delegation(env, voter) {
        0
    } else {
        storage::read_voting_stake(env, voter)
    };

    let mut delegated_power = 0_i128;
    let delegators = storage::read_delegatee_delegators(env, voter);
    for delegator in delegators.iter() {
        if !is_stale_delegation(env, &delegator, voter) {
            continue;
        }
        if storage::read_proposal_vote(env, proposal_id, &delegator).unwrap_or(false) {
            continue;
        }
        delegated_power = delegated_power
            .checked_add(storage::read_voting_stake(env, &delegator))
            .ok_or(Error::InvalidAmount)?;
    }

    self_power
        .checked_add(delegated_power)
        .ok_or(Error::InvalidAmount)
}

pub fn resolve_proposer_power(env: &Env, proposer: &Address) -> Result<i128, Error> {
    if has_active_outbound_delegation(env, proposer) {
        return Ok(0);
    }
    Ok(storage::read_voting_stake(env, proposer))
}

pub fn quorum_target(env: &Env) -> Result<i128, Error> {
    let config = storage::read_governance_config(env).ok_or(Error::NotInitialized)?;
    config
        .total_voting_supply
        .checked_mul(config.quorum_bps as i128)
        .ok_or(Error::InvalidAmount)?
        .checked_div(10_000)
        .ok_or(Error::InvalidAmount)
}

pub fn create_proposal(
    env: &Env,
    proposer: &Address,
    title: String,
    description: String,
    actions: Vec<String>,
) -> Result<u64, Error> {
    let config = storage::read_governance_config(env).ok_or(Error::NotInitialized)?;
    let proposer_power = resolve_proposer_power(env, proposer)?;
    if proposer_power < config.proposal_threshold || actions.is_empty() {
        return Err(Error::Unauthorized);
    }

    let now = env.ledger().timestamp();
    let proposal_id = storage::increment_proposal_counter(env);
    let proposal = GovernanceProposal {
        id: proposal_id,
        proposer: proposer.clone(),
        title,
        description,
        actions,
        created_at: now,
        voting_ends_at: now + config.voting_period_secs,
        executable_after: now + config.voting_period_secs + config.timelock_secs,
        for_votes: 0,
        against_votes: 0,
        abstain_votes: 0,
        status: ProposalStatus::Active,
    };
    storage::write_proposal(env, proposal_id, &proposal);
    record_lifecycle_event(
        env,
        proposal_id,
        OptProposalStatus::None,
        ProposalStatus::Active,
        now,
        String::from_str(env, "proposal_created"),
    );
    env.events().publish(
        (symbol_short!("gov"), symbol_short!("created")),
        (proposal_id, proposer.clone(), now),
    );
    Ok(proposal_id)
}

pub fn cast_vote(
    env: &Env,
    voter: &Address,
    proposal_id: u64,
    choice: VoteChoice,
) -> Result<i128, Error> {
    let mut proposal = storage::read_proposal(env, proposal_id).ok_or(Error::OrderNotFound)?;
    if proposal.status != ProposalStatus::Active {
        return Err(Error::OrderAlreadyMatched);
    }
    if env.ledger().timestamp() > proposal.voting_ends_at {
        finalize_proposal(env, &mut proposal)?;
    }
    if proposal.status != ProposalStatus::Active {
        return Err(Error::OrderExpired);
    }
    if storage::read_proposal_vote(env, proposal_id, voter).unwrap_or(false) {
        return Err(Error::Unauthorized);
    }

    let voting_power = resolve_voting_power(env, voter, proposal_id)?;
    if voting_power <= 0 {
        return Err(Error::Unauthorized);
    }

    match choice {
        VoteChoice::For => proposal.for_votes += voting_power,
        VoteChoice::Against => proposal.against_votes += voting_power,
        VoteChoice::Abstain => proposal.abstain_votes += voting_power,
    }
    storage::write_proposal_vote(env, proposal_id, voter, true);
    storage::write_proposal(env, proposal_id, &proposal);
    env.events().publish(
        (symbol_short!("gov"), symbol_short!("voted")),
        (proposal_id, voter.clone(), voting_power),
    );
    Ok(voting_power)
}

pub fn finalize_proposal(env: &Env, proposal: &mut GovernanceProposal) -> Result<(), Error> {
    let total_participation = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
    let quorum_target = quorum_target(env)?;

    let next_status =
        if proposal.for_votes > proposal.against_votes && total_participation >= quorum_target {
            ProposalStatus::Succeeded
        } else {
            ProposalStatus::Defeated
        };

    if proposal.status != next_status {
        record_lifecycle_event(
            env,
            proposal.id,
            OptProposalStatus::Status(proposal.status.clone()),
            next_status.clone(),
            env.ledger().timestamp(),
            String::from_str(env, "voting_finalized"),
        );
        env.events().publish(
            (symbol_short!("gov"), symbol_short!("finalized")),
            (proposal.id, next_status.clone()),
        );
        proposal.status = next_status;
    }
    storage::write_proposal(env, proposal.id, proposal);
    Ok(())
}

pub fn execute_proposal(env: &Env, proposal_id: u64) -> Result<(), Error> {
    let mut proposal = storage::read_proposal(env, proposal_id).ok_or(Error::OrderNotFound)?;
    if proposal.status == ProposalStatus::Active
        && env.ledger().timestamp() >= proposal.voting_ends_at
    {
        finalize_proposal(env, &mut proposal)?;
        proposal = storage::read_proposal(env, proposal_id).ok_or(Error::OrderNotFound)?;
    }

    if proposal.status != ProposalStatus::Succeeded {
        return Err(Error::Unauthorized);
    }
    if env.ledger().timestamp() < proposal.executable_after {
        return Err(Error::Timeout);
    }

    record_lifecycle_event(
        env,
        proposal_id,
        OptProposalStatus::Status(proposal.status.clone()),
        ProposalStatus::Executed,
        env.ledger().timestamp(),
        String::from_str(env, "proposal_executed"),
    );
    proposal.status = ProposalStatus::Executed;
    storage::write_proposal(env, proposal_id, &proposal);
    env.events().publish(
        (symbol_short!("gov"), symbol_short!("executed")),
        (proposal_id, env.ledger().timestamp()),
    );
    Ok(())
}

pub fn delegate_votes(env: &Env, delegator: &Address, delegatee: &Address) -> Result<(), Error> {
    if delegator == delegatee {
        return Err(Error::Unauthorized);
    }

    if let Some(existing) = storage::read_delegation(env, delegator) {
        storage::remove_delegatee_delegator(env, &existing.delegatee, delegator);
    }

    let record = DelegationRecord {
        delegator: delegator.clone(),
        delegatee: delegatee.clone(),
        updated_at: env.ledger().timestamp(),
    };
    storage::write_delegation(env, &record);
    storage::append_delegatee_delegator(env, delegatee, delegator);
    Ok(())
}

pub fn get_proposal_lifecycle(env: &Env, proposal_id: u64) -> Vec<ProposalLifecycleEvent> {
    let count = storage::get_proposal_lifecycle_count(env, proposal_id);
    let mut events = Vec::new(env);
    for sequence in 1..=count {
        if let Some(event) = storage::read_proposal_lifecycle_event(env, proposal_id, sequence) {
            events.push_back(event);
        }
    }
    events
}

fn has_active_outbound_delegation(env: &Env, holder: &Address) -> bool {
    storage::read_delegation(env, holder).is_some()
}

fn is_stale_delegation(env: &Env, delegator: &Address, delegatee: &Address) -> bool {
    match storage::read_delegation(env, delegator) {
        Some(record) => record.delegatee == *delegatee,
        None => false,
    }
}

fn record_lifecycle_event(
    env: &Env,
    proposal_id: u64,
    from_status: OptProposalStatus,
    to_status: ProposalStatus,
    occurred_at: u64,
    detail: String,
) {
    let count = storage::get_proposal_lifecycle_count(env, proposal_id);
    let event = ProposalLifecycleEvent {
        sequence: count + 1,
        from_status,
        to_status,
        occurred_at,
        detail,
    };
    storage::append_proposal_lifecycle_event(env, proposal_id, &event);
}
