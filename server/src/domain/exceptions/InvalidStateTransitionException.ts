export class InvalidStateTransitionException extends Error {
  constructor(public readonly currentStatus: string, public readonly targetStatus: string, message?: string) {
    super(
      message ||
        `Invalid state transition from '${currentStatus}' to '${targetStatus}'.`
    );
    this.name = "InvalidStateTransitionException";
  }
}
