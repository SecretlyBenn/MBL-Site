/**
 * How a club's name is keyed for an uploaded logo: lowercased, spaces
 * collapsed. Shared by the server, which stores uploads, and TeamLogo, which
 * looks them up in the browser - so it lives apart from anything that touches
 * the database.
 */
export function logoKey(teamName: string) {
  return teamName.trim().toLowerCase().replace(/\s+/g, " ");
}
