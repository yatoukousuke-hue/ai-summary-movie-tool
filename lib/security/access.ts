export function isAccessPasswordEnabled() {
  return Boolean(process.env.APP_ACCESS_PASSWORD);
}

export function isValidAccessPassword(password: string | null | undefined) {
  const expected = process.env.APP_ACCESS_PASSWORD;
  if (!expected) return true;
  return password === expected;
}
