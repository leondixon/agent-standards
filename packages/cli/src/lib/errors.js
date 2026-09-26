/**
 * A problem with the project or rule source that the user must fix. The CLI
 * prints its message without a stack; anything else is a bug and keeps one.
 */
export class ConfigurationError extends Error {
  name = 'ConfigurationError'
}
