package com.ontrack.backend.exception;

/**
 * Thrown when a valid verification link is clicked for an address that someone has already
 * verified through a different signup attempt.
 *
 * <p>Deliberately an error rather than a no-op success, and it never signs anyone in. If two
 * people had an outstanding signup on the same address, whoever verified first owns the account
 * and set its password. Treating the loser's link as a successful verification would hand them a
 * session on an account that is not theirs, which is exactly the takeover this guards against.
 */
public class EmailAlreadyVerifiedException extends RuntimeException {

    public EmailAlreadyVerifiedException() {
        super("This email is already verified. Log in with the password you verified it with.");
    }
}
