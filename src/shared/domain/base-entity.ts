export abstract class BaseEntity<TState, TEvent> {
  /**
   * Protected state reducer that pattern matches on event sum types
   * to produce the next immutable state representation.
   */
  protected abstract evolve(state: TState | null, event: TEvent): TState;

  /**
   * Applies an event to state via the protected evolve reducer.
   */
  public transition(state: TState | null, event: TEvent): TState {
    return this.evolve(state, event);
  }
}
