/* global it, describe */
const crdt = require('../crdt')

const setOperations = require('./mock/crdt-set.json')
const fwwOperations = require('./mock/crdt-fww.json')
const lwwOperations = require('./mock/crdt-lww.json')
const lwwnOperations = require('./mock/crdt-lwwn.json')

describe('crdt.toResponseSummary', () => {
  it('FWW operations should return valid payload', () => {
    const summary = crdt.toResponseSummary(fwwOperations.responses)
    summary['sender-1'].should.be.eql({
      'change-1': {
        'adds': [
          {
            'ids': ['1'],
            'value': 'red'
          },
        ],
        'removes': ['2']
      },
      'change-2': {
        'adds': [
          {
            'ids': ['4'],
            'value': 'pink'
          },
        ],
        'removes': []
      }
    })
    summary['sender-2'].should.be.eql({
      'change-1': {
        'adds': [
          {
            'ids': ['5'],
            'value': 'black'
          },
        ],
        'removes': ['6']
      }
    })
  })
})

describe('crdt.toResponseSummary', () => {
  it('LWW operations should return valid payload', () => {
    const summary = crdt.toResponseSummary(lwwOperations.responses)
    summary['sender-1'].should.be.eql({
      'change-1': {
        'adds': [
          {
            'ids': ['4'],
            'value': 'pink'
          },
        ],
        'removes': ['1', '2']
      }
    })
    summary['sender-2'].should.be.eql({
      'change-1': {
        'adds': [
          {
            'ids': ['6'],
            'value': 'black'
          },
        ],
        'removes': ['5']
      }
    })
  })
})

describe('crdt.toResponseSummary', () => {
  it('LWWN operations should return valid payload', () => {
    const summary = crdt.toResponseSummary(lwwnOperations.responses)
    summary['sender-1'].should.be.eql({
      'change-1': {
        'adds': [
          {
            'ids': ['2'],
            'value': 'red'
          },
        ],
        'removes': ['1', '3']
      },
      'change-2': {
        'adds': [
          {
            'ids': ['4'],
            'value': 'pink'
          },
        ],
        'removes': []
      }
    })
    summary['sender-2'].should.be.eql({
      'change-1': {
        'adds': [
        ],
        'removes': ['5', '6']
      }
    })
  })
})

describe('crdt.toResponseSummary', () => {
  it('Set operations should return valid payload', () => {
    const summary = crdt.toResponseSummary(setOperations.responses)
    summary['sender-1'].should.be.eql({
      'change-1': {
        'adds': [
          {
            'ids': ['1', '4'],
            'value': 'red'
          },
          {
            'ids': ['3'],
            'value': 'blue'
          }
        ],
        'removes': ['2']
      }
    })
    summary['sender-2'].should.be.eql({
      'change-1': {
        'adds': [],
        'removes': ['5']
      }
    })
  })
})
