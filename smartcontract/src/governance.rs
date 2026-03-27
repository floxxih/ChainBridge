use crate::error::Error;
use crate::storage;
use crate::types::{
    DelegationRecord, GovernanceConfig, GovernanceProposal, ProposalStatus, VoteChoice,
};
use soroban_sdk::{Address, Env, String, Vec};

pub fn init_governance(env: &Env, config: GovernanceConfig) -> Result<(), Error> {
    if config.quorum_bps == 0 || config.quorum_bps > 10_000 {
        return Err(Error::InvalidFeeRate);
    }
    storage::write_governance_config(env, &config);
    Ok(())
}

pub fn create_proposal(
    env: &Env,
    proposer: &Address,
    title: String,
    description: String,
    actions: Vec<String>,
    voting_power: i128,
) -> Result<u64, Error> {
    let config = storage::read_governance_config(env).ok_or(Error::NotInitialized)?;
    if voting_power < config.proposal_threshold || actions.is_empty() {
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
    Ok(proposal_id)
}

pub fn cast_vote(
    env: &Env,
    voter: &Address,
    proposal_id: u64,
    choice: VoteChoice,
    voting_power: i128,
) -> Result<(), Error> {
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
    if voting_power <= 0 || storage::read_proposal_vote(env, proposal_id, voter).unwrap_or(false) {
        return Err(Error::Unauthorized);
    }

    match choice {
        VoteChoice::For => proposal.for_votes += voting_power,
        VoteChoice::Against => proposal.against_votes += voting_power,
        VoteChoice::Abstain => proposal.abstain_votes += voting_power,
    }
    storage::write_proposal_vote(env, proposal_id, voter, true);
    storage::write_proposal(env, proposal_id, &proposal);
    Ok(())
}

pub fn finalize_proposal(env: &Env, proposal: &mut GovernanceProposal) -> Result<(), Error> {
    let config = storage::read_governance_config(env).ok_or(Error::NotInitialized)?;
    let total_participation = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
    let quorum_target = config.proposal_threshold * config.quorum_bps as i128 / 10_000;

    proposal.status =
        if proposal.for_votes > proposal.against_votes && total_participation >= quorum_target {
            ProposalStatus::Succeeded
        } else {
            ProposalStatus::Defeated
        };
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

    proposal.status = ProposalStatus::Executed;
    storage::write_proposal(env, proposal_id, &proposal);
    Ok(())
}

pub fn delegate_votes(env: &Env, delegator: &Address, delegatee: &Address) -> Result<(), Error> {
    if delegator == delegatee {
        return Err(Error::Unauthorized);
    }
    let record = DelegationRecord {
        delegator: delegator.clone(),
        delegatee: delegatee.clone(),
        updated_at: env.ledger().timestamp(),
    };
    storage::write_delegation(env, &record);
    Ok(())
}
