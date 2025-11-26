/**
 * Validate optional guest_id present in the request body.
 * Allows alphanumeric, hyphenated UUID-style identifiers between 8 and 64 chars.
 */
export const validateOptionalGuestId = (req, res, next) => {
  const { guest_id } = req.body ?? {};

  if (
    guest_id === undefined ||
    guest_id === null ||
    guest_id === '' ||
    guest_id === false
  ) {
    return next();
  }

  if (typeof guest_id !== 'string') {
    return res.status(400).json({
      error: {
        message: 'guest_id must be a string',
        status: 400,
      },
    });
  }

  const normalizedGuestId = guest_id.trim();
  const isValidLength =
    normalizedGuestId.length >= 8 && normalizedGuestId.length <= 64;
  const guestIdPattern = /^[a-zA-Z0-9-]+$/;

  if (!isValidLength || !guestIdPattern.test(normalizedGuestId)) {
    return res.status(400).json({
      error: {
        message:
          'guest_id must be an alphanumeric string (dashes allowed) between 8 and 64 characters',
        status: 400,
      },
    });
  }

  req.body.guest_id = normalizedGuestId;
  return next();
};
