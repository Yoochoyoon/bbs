const { ObjectId } = require('mongodb');

function toObjectId(idString) {
  if (typeof idString !== 'string' || !ObjectId.isValid(idString)) {
    return null;
  }
  return new ObjectId(idString);
}

module.exports = { toObjectId };
