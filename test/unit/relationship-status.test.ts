import { expect } from 'chai'
import {
  selectRelationshipStatus,
  type RelationshipSnapshot
} from '../../scene/src/service/relationship-status'

const A = '0xAAAA'
const B = '0xbbbb'

function emptySnapshot(): RelationshipSnapshot {
  return {
    friends: new Set<string>(),
    incoming: new Set<string>(),
    outgoing: new Set<string>(),
    blockedByMe: new Set<string>(),
    blockedMe: new Set<string>()
  }
}

describe('selectRelationshipStatus', () => {
  it('returns "none" for an unknown address', () => {
    expect(selectRelationshipStatus(A, emptySnapshot())).to.equal('none')
  })

  it('returns "friend" when in the friends set', () => {
    const snap = emptySnapshot()
    snap.friends.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('friend')
  })

  it('returns "incoming" for a pending received request', () => {
    const snap = emptySnapshot()
    snap.incoming.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('incoming')
  })

  it('returns "outgoing" for a pending sent request', () => {
    const snap = emptySnapshot()
    snap.outgoing.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('outgoing')
  })

  it('matches case-insensitively (normalizes the address)', () => {
    const snap = emptySnapshot()
    snap.friends.add('0xaaaa')
    expect(selectRelationshipStatus('0xAAAA', snap)).to.equal('friend')
  })

  it('prioritizes my own block over friendship/request state', () => {
    const snap = emptySnapshot()
    snap.friends.add('0xaaaa')
    snap.incoming.add('0xaaaa')
    snap.blockedByMe.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('blockedByMe')
  })

  it('prioritizes my own block over being blocked by them', () => {
    const snap = emptySnapshot()
    snap.blockedByMe.add('0xaaaa')
    snap.blockedMe.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('blockedByMe')
  })

  it('returns "blockedMe" when only they blocked me', () => {
    const snap = emptySnapshot()
    snap.blockedMe.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('blockedMe')
  })

  it('prioritizes friend over incoming/outgoing', () => {
    const snap = emptySnapshot()
    snap.friends.add('0xaaaa')
    snap.incoming.add('0xaaaa')
    snap.outgoing.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('friend')
  })

  it('prioritizes incoming over outgoing', () => {
    const snap = emptySnapshot()
    snap.incoming.add('0xaaaa')
    snap.outgoing.add('0xaaaa')
    expect(selectRelationshipStatus(A, snap)).to.equal('incoming')
  })

  it('keeps addresses independent', () => {
    const snap = emptySnapshot()
    snap.friends.add('0xaaaa')
    expect(selectRelationshipStatus(B, snap)).to.equal('none')
  })
})
