
const OPERATION = {
  ADD: 'add',
  REMOVE: 'remove'
}

const TYPE = {
  FIRST_WRITER_WINS: 'FWW',
  LAST_WRITER_WINS: 'LWW',
  LAST_WRITER_WINS_NULLABLE: 'LWWN',
  SET: 'Set',
}

class Add {
  constructor (id, value) {
    this.ids = new Set([id])
    this.value = value
  }

  add (id) {
    this.ids.add(id)
  }

  remove (id) {
    this.ids.delete(id)
  }

  getFirst () {
    return this.ids.values().next().value
  }

  serialize () {
    return {
      ids: Array.from(this.ids),
      value: this.value
    }
  }
}

class Change {
  constructor (name, type) {
    this.name = name
    this.type = type

    this.adds = []
    this.removes = new Set()
  }

  add (id, value) {
    switch (this.type) {
      case TYPE.FIRST_WRITER_WINS:
        if (this.adds[0]) {
          this.removes.add(id)
        } else {
          this.adds.push(new Add(id, value))
        }
        break
      case TYPE.LAST_WRITER_WINS:
      case TYPE.LAST_WRITER_WINS_NULLABLE:
        const firstAdd = this.adds[0]
        if (firstAdd) {
          this.adds = [new Add(id, value)]
          this.removes.add(firstAdd.getFirst())
        } else {
          this.adds.push(new Add(id, value))
        }
        break
      case TYPE.SET:
        const existing = this.getByValue(value)
        if (existing) {
          existing.add(id)
        } else {
          this.adds.push(new Add(id, value))
        }
        break
    }
  }

  remove (id) {
    if (this.type === TYPE.FIRST_WRITER_WINS || this.type === TYPE.LAST_WRITER_WINS) {
      return
    }

    this.adds = this.adds.filter((add) => {
      add.remove(id)
      return add.ids.size
    })

    this.removes.add(id)
  }

  getByValue (value) {
    return this.adds.find((add) => add.value === value)
  }

  serialize () {
    return {
      adds: this.adds.map((add) => add.serialize()),
      removes: Array.from(this.removes)
    }
  }
}

class Changes {
  constructor (userId) {
    this.userId = userId

    this.changes = []
  }

  add ({ name, id, type, operation, value }) {
    let change = this.changes.find((change) => change.name === name)
    if (!change) {
      change = new Change(name, type)
      this.changes.push(change)
    }

    if (operation === OPERATION.ADD) change.add(id, value)
    if (operation === OPERATION.REMOVE) change.remove(id)
  }

  serialize () {
    return this.changes.reduce((res, change) => {
      res[change.name] = change.serialize()
      return res
    }, {})
  }
}

/**
 * Parse changes to response summary payload
 *
 * @param  {Object} data Message responses data
 */
exports.toResponseSummary = (responses) => {
  const result = {}

  Object.keys(responses).forEach((userId) => {
    const changes = new Changes(userId)

    responses[userId].forEach((change) => {
      changes.add(change)
    })

    result[userId] = changes.serialize()
  })

  return result
}
