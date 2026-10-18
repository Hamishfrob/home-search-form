// Children can arrive as nested lists (a screen made of option lists and
// fields). Anything not flattened all the way down is printed as
// "[object HTMLButtonElement]", which is how the email screen first looked.
export function flatten(kids) {
  return kids.flat(Infinity).filter(kid => kid !== null && kid !== undefined && kid !== false);
}
