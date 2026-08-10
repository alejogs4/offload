export abstract class BaseEntity<ID = string> {
  protected readonly _id: ID;

  constructor(id: ID) {
    this._id = id;
  }

  get id(): ID {
    return this._id;
  }

  equals(other?: BaseEntity<ID>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    return this._id === other._id;
  }
}
