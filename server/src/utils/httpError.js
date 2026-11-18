// Throw `new HttpError(404, 'Quiz not found')` inside a controller to send that status.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = HttpError;
